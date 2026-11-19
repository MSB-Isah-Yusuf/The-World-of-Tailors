import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "CUSTOMER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const customerId = String((session.user as any).id || "");
  const items: any[] = await prisma.paymentDispute.findMany({ where: { customerId }, include: { payment: { select: { reference: true, amountMinor: true, currency: true, status: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ items: items.map((item) => ({ ...item, payment: { ...item.payment, amountMinor: item.payment.amountMinor == null ? null : String(item.payment.amountMinor) } })) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "CUSTOMER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const customerId = String((session.user as any).id || "");
  const clientRequestId = String(req.headers.get("idempotency-key") || "").trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(clientRequestId)) return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED" }, { status: 400 });
  const body: any = await req.json().catch(() => ({}));
  const paymentId = String(body.paymentId || "").trim();
  const reason = String(body.reason || "").trim().slice(0, 1000);
  const evidenceText = String(body.evidence || "").trim().slice(0, 2000);
  if (!paymentId || !reason) return NextResponse.json({ error: "PAYMENT_ID_AND_REASON_REQUIRED" }, { status: 400 });
  const existing: any = await prisma.paymentDispute.findUnique({ where: { clientRequestId } });
  if (existing) {
    if (existing.customerId !== customerId || existing.paymentId !== paymentId || existing.reason !== reason) return NextResponse.json({ error: "IDEMPOTENCY_KEY_CONFLICT" }, { status: 409 });
    return NextResponse.json({ ok: true, reused: true, dispute: { id: existing.id, status: existing.status } });
  }
  const payment: any = await prisma.payment.findUnique({ where: { id: paymentId }, include: { obligation: true, booking: true, fabricOrder: true } });
  if (!payment) return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  const owner = payment.obligation?.customerId || payment.booking?.customerId || payment.fabricOrder?.customerId;
  if (owner !== customerId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!["PAID", "PARTIALLY_REFUNDED", "REFUND_PENDING"].includes(String(payment.status))) return NextResponse.json({ error: "PAYMENT_NOT_DISPUTABLE" }, { status: 409 });
  const sellerPaymentProfile: any = payment.booking?.tailorId
    ? await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId: payment.booking.tailorId }, select: { id: true } })
    : payment.fabricOrder?.sellerId ? await prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId: payment.fabricOrder.sellerId }, select: { id: true } }) : null;

  try {
    const dispute: any = await prisma.$transaction(async (tx: any) => {
      const old = await tx.paymentDispute.findUnique({ where: { clientRequestId } });
      if (old) {
        if (old.customerId !== customerId || old.paymentId !== paymentId || old.reason !== reason) throw new Error("IDEMPOTENCY_KEY_CONFLICT");
        return old;
      }
      const open = await tx.paymentDispute.findFirst({ where: { paymentId, status: { in: ["OPEN", "UNDER_REVIEW", "REVIEW_REQUIRED"] } }, select: { id: true } });
      if (open) throw new Error("PAYMENT_DISPUTE_ALREADY_OPEN");
      const created = await tx.paymentDispute.create({ data: { clientRequestId, paymentId, customerId, sellerPaymentProfileId: sellerPaymentProfile?.id || null, reason, evidence: evidenceText ? { text: evidenceText } : undefined, status: "OPEN" } });
      await tx.auditLog.create({ data: { userId: customerId, action: "CUSTOMER_PAYMENT_DISPUTE_OPENED", entity: "PaymentDispute", entityId: created.id, metadata: { paymentId, paymentReference: payment.reference, reason, evidenceSupplied: Boolean(evidenceText) } } });
      return created;
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 });
    return NextResponse.json({ ok: true, reused: false, dispute: { id: dispute.id, status: dispute.status, paymentId } }, { status: 201 });
  } catch (error: any) {
    const message = String(error?.message || "DISPUTE_CREATE_FAILED");
    if (["IDEMPOTENCY_KEY_CONFLICT", "PAYMENT_DISPUTE_ALREADY_OPEN"].includes(message)) return NextResponse.json({ error: message }, { status: 409 });
    if (error?.code === "P2034" || error?.code === "P2002") return NextResponse.json({ error: "DISPUTE_CREATE_CONFLICT", message: "Refresh dispute status and retry with the same idempotency key." }, { status: 409 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
