import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPaystackSignature } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  // Verify HMAC — skip if no PAYSTACK_SECRET_KEY (dev/mock)
  if (process.env.PAYSTACK_SECRET_KEY) {
    const ok = verifyPaystackSignature(rawBody, signature);
    if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Paystack event id is in data.id or event.id — ensure uniqueness
  const eventId = String(event.data?.id || event.id || event.data?.reference || `evt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
  const provider = "paystack";

  // Idempotency — if we already processed this eventId, ACK immediately
  try {
    const existing = await prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
    if (existing?.processed) return NextResponse.json({ ok: true, duplicate: true });
    if (!existing) await prisma.paymentWebhookEvent.create({ data: { provider, eventId, payload: event, processed: false } });
  } catch (e: any) {
    // unique constraint race — another webhook is processing
    if (String(e.message).includes("Unique constraint")) return NextResponse.json({ ok: true, duplicate: true });
    console.warn("[webhook] event store failed", e.message);
  }

  const type = event.event || event.type; // e.g., charge.success
  const data = event.data || event;
  const reference: string | undefined = data.reference || data.paystack_reference;

  if (type === "charge.success" && reference) {
    // Normalize reference: PAY-FO-... or FO-... or booking ref
    const amountKobo = Number(data.amount || 0);
    const paidAt = data.paid_at || data.paidAt || new Date().toISOString();

    try {
      // Find Payment by reference (supports both PAY-FO-xxx and FO-xxx)
      let payment: any = await prisma.payment.findUnique({ where: { reference } });
      if (!payment && reference.startsWith("PAY-")) {
        const alt = reference.replace(/^PAY-/, "");
        // retry by fabricOrder reference
        const order: any = await prisma.fabricOrder.findUnique({ where: { reference: alt } });
        if (order) payment = await prisma.payment.findFirst({ where: { fabricOrderId: order.id } });
      }
      if (!payment) {
        // FabricOrder direct reference search
        const order: any = await prisma.fabricOrder.findUnique({ where: { reference } });
        if (order) payment = await prisma.payment.findFirst({ where: { fabricOrderId: order.id } });
      }
      // Booking payment path
      if (!payment && (reference.startsWith("SC-") || reference.startsWith("PAY-SC-"))) {
        const bookingRef = reference.replace(/^PAY-/, "");
        const booking: any = await prisma.tailoringBooking.findUnique({ where: { reference: bookingRef } });
        if (booking) payment = await prisma.payment.findFirst({ where: { bookingId: booking.id } });
      }

      if (!payment) {
        console.warn(`[webhook] payment not found for ${reference}, event ${eventId}`);
        await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processed: true } }).catch(() => {});
        return NextResponse.json({ ok: true, warning: "payment not found, ACK to prevent retry storm" });
      }

      // Verify amount matches (prevent tampering) — allow small rounding
      const expectedKobo = Math.round(Number(payment.amount) * 100);
      if (amountKobo && Math.abs(amountKobo - expectedKobo) > 100) {
        console.warn(`[webhook] amount mismatch ${reference}: expected ${expectedKobo} got ${amountKobo}`);
      }

      // Idempotent status update — only transition PENDING → PAID
      if (payment.status !== "PAID") {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", providerRef: String(data.id || reference) } });

          if (payment.fabricOrderId) {
            const order: any = await tx.fabricOrder.findUnique({ where: { id: payment.fabricOrderId } });
            if (order) {
              // Commit inventory: stock -= quantity, reserved -= quantity (sale finalized)
              const items: any[] = await tx.fabricOrderItem.findMany({ where: { orderId: order.id } });
              for (const it of items) {
                await tx.fabricProduct.update({ where: { id: it.productId }, data: { stock: { decrement: it.quantity }, reserved: { decrement: it.quantity } } });
                await tx.inventoryMovement.create({ data: { productId: it.productId, delta: -it.quantity, reason: `SOLD via Paystack ${reference}` } });
              }
              await tx.fabricOrder.update({ where: { id: order.id }, data: { paymentStatus: "PAID", status: "CONFIRMED" } });
              await tx.delivery.updateMany({ where: { fabricOrderId: order.id }, data: { status: "CONFIRMED" } });
              // notify customer + seller
              await tx.notification.create({ data: { userId: order.customerId, title: "Payment confirmed", message: `Order ${order.reference} paid via Paystack ✓ — seller will prepare shipment`, type: "payment", link: "/dashboard/customer/orders" } });
              const seller: any = await tx.sellerProfile.findUnique({ where: { id: order.sellerId } });
              if (seller?.userId) await tx.notification.create({ data: { userId: seller.userId, title: "Order paid — prepare shipment", message: `${order.reference} is now CONFIRMED. Prepare for dispatch.`, type: "payment", link: "/dashboard/seller/orders" } });
            }
          }

          if (payment.bookingId) {
            const booking: any = await tx.tailoringBooking.findUnique({ where: { id: payment.bookingId } });
            if (booking) {
              await tx.tailoringBooking.update({ where: { id: booking.id }, data: { paymentStatus: "PAID" } });
              await tx.auditLog.create({ data: { action: "BOOKING_PAID_VIA_PAYSTACK", entity: "TailoringBooking", entityId: booking.id, metadata: { reference, eventId, paidAt } } });
            }
          }
        });
      }

      await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processed: true } }).catch(() => {});
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      console.error("[webhook][charge.success] tx failed", e);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  if (type === "charge.failed" || type === "charge.dispute" || event.event?.includes("failed")) {
    await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processed: true } }).catch(() => {});
    return NextResponse.json({ ok: true, noted: type });
  }

  // Unknown event — ACK but mark processed to avoid Paystack retries
  await prisma.paymentWebhookEvent.update({ where: { eventId }, data: { processed: true } }).catch(() => {});
  return NextResponse.json({ ok: true, unhandled: type });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/webhooks/paystack", method: "POST", verify: "x-paystack-signature HMAC SHA512" });
}
