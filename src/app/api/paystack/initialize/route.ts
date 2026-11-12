import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializePaystackTransaction } from "@/lib/paystack";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const userEmail = (session.user as any).email || (await prisma.user.findUnique({ where: { id: userId } }))?.email;
  if (!userEmail) return NextResponse.json({ error: "User email required for Paystack" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const reference = String(body.reference || body.orderReference || "").trim();
  if (!reference) return NextResponse.json({ error: "reference required (fabric order reference or payment reference)" }, { status: 400 });

  let payment: any = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) {
    const alt = reference.replace(/^PAY-/, "");
    const order: any = await prisma.fabricOrder.findUnique({ where: { reference: alt } });
    if (order) payment = await prisma.payment.findFirst({ where: { fabricOrderId: order.id } });
  }
  if (!payment) return NextResponse.json({ error: "Payment not found for reference" }, { status: 404 });
  if (payment.status === "PAID") return NextResponse.json({ error: "Already PAID" }, { status: 400 });

  // Ownership check
  const order: any = payment.fabricOrderId ? await prisma.fabricOrder.findUnique({ where: { id: payment.fabricOrderId } }) : null;
  if (order && order.customerId !== userId) return NextResponse.json({ error: "FORBIDDEN: not your order" }, { status: 403 });
  if (payment.bookingId) {
    const booking: any = await prisma.tailoringBooking.findUnique({ where: { id: payment.bookingId } });
    if (booking && booking.customerId !== userId) return NextResponse.json({ error: "FORBIDDEN: not your booking" }, { status: 403 });
  }

  const amountKobo = Math.round(Number(payment.amount) * 100);
  const paystackRef = payment.reference; // use PAY-... as Paystack reference for idempotency

  try {
    const data = await initializePaystackTransaction({ email: userEmail, amountKobo, reference: paystackRef, metadata: { fabricOrderId: payment.fabricOrderId, bookingId: payment.bookingId, userId } });
    return NextResponse.json({ ok: true, ...data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
