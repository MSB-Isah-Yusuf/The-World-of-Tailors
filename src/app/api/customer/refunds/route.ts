import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentNetRefunded, ACTIVE_REFUND_STATES } from "@/lib/payments/paystack-refunds";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "CUSTOMER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const customerId = String((session.user as any).id || "");
  const payments: any[] = await prisma.payment.findMany({ where: { OR: [
    { obligation: { is: { customerId } } }, { booking: { is: { customerId } } }, { fabricOrder: { is: { customerId } } },
  ] }, select: { id: true } });
  const refunds: any[] = await prisma.refund.findMany({ where: { paymentId: { in: payments.map((payment) => payment.id) } }, include: { payment: { select: { reference: true, category: true, amountMinor: true, currency: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ items: refunds.map((refund) => ({ ...refund, amountMinor: String(refund.amountMinor), commissionReversedMinor: refund.commissionReversedMinor == null ? null : String(refund.commissionReversedMinor), sellerReversedMinor: refund.sellerReversedMinor == null ? null : String(refund.sellerReversedMinor), sellerPendingReversedMinor: refund.sellerPendingReversedMinor == null ? null : String(refund.sellerPendingReversedMinor), sellerPayableReversedMinor: refund.sellerPayableReversedMinor == null ? null : String(refund.sellerPayableReversedMinor), payment: { ...refund.payment, amountMinor: refund.payment.amountMinor == null ? null : String(refund.payment.amountMinor) } })) });
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
  const amountText = String(body.amountMinor || "");
  const reason = String(body.reason || "").trim().slice(0, 500);
  if (!paymentId || !/^\d{1,18}$/.test(amountText) || BigInt(amountText) <= 0n || !reason) return NextResponse.json({ error: "PAYMENT_ID_AMOUNT_AND_REASON_REQUIRED" }, { status: 400 });
  const amountMinor = BigInt(amountText);
  const existing: any = await prisma.refund.findUnique({ where: { clientRequestId } });
  if (existing) {
    const payment = await prisma.payment.findUnique({ where: { id: existing.paymentId }, include: { obligation: true, booking: true, fabricOrder: true } });
    const owner = payment?.obligation?.customerId || payment?.booking?.customerId || payment?.fabricOrder?.customerId;
    if (owner !== customerId || existing.paymentId !== paymentId || BigInt(existing.amountMinor) !== amountMinor || existing.reason !== reason) return NextResponse.json({ error: "IDEMPOTENCY_KEY_CONFLICT" }, { status: 409 });
    return NextResponse.json({ ok: true, reused: true, refund: { id: existing.id, reference: existing.reference, amountMinor: String(existing.amountMinor), currency: existing.currency, status: existing.status } });
  }
  const payment: any = await prisma.payment.findUnique({ where: { id: paymentId }, include: { obligation: true, booking: true, fabricOrder: true } });
  if (!payment) return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  const owner = payment.obligation?.customerId || payment.booking?.customerId || payment.fabricOrder?.customerId;
  if (owner !== customerId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(String(payment.status))) return NextResponse.json({ error: "PAYMENT_NOT_REFUNDABLE", message: "Only a verified paid payment with remaining refundable value can be submitted." }, { status: 409 });
  if (!payment.providerTransactionId) return NextResponse.json({ error: "PROVIDER_TRANSACTION_MISSING", message: "The verified Paystack transaction ID is missing; administrator review is required." }, { status: 409 });

  const sellerPaymentProfile: any = payment.booking?.tailorId
    ? await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId: payment.booking.tailorId }, select: { id: true } })
    : payment.fabricOrder?.sellerId ? await prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId: payment.fabricOrder.sellerId }, select: { id: true } }) : null;
  try {
    const refund: any = await prisma.$transaction(async (tx: any) => {
      const old = await tx.refund.findUnique({ where: { clientRequestId } });
      if (old) {
        if (old.paymentId !== paymentId || BigInt(old.amountMinor) !== amountMinor || old.reason !== reason) throw new Error("IDEMPOTENCY_KEY_CONFLICT");
        return old;
      }
      const fresh: any = await tx.payment.findUnique({ where: { id: paymentId }, include: { obligation: true, booking: true, fabricOrder: true } });
      const freshOwner = fresh?.obligation?.customerId || fresh?.booking?.customerId || fresh?.fabricOrder?.customerId;
      if (!fresh || freshOwner !== customerId) throw new Error("PAYMENT_NOT_FOUND");
      if (!["PAID", "PARTIALLY_REFUNDED"].includes(String(fresh.status)) || !fresh.providerTransactionId) throw new Error("PAYMENT_NOT_REFUNDABLE");
      const inFlight = await tx.refund.findFirst({ where: { paymentId, status: { in: ACTIVE_REFUND_STATES } }, select: { id: true } });
      if (inFlight) throw new Error("REFUND_ALREADY_IN_PROGRESS");
      const total = BigInt(fresh.amountMinor || 0n);
      const alreadyRefunded = await paymentNetRefunded(tx, paymentId);
      if (total <= 0n || amountMinor > total - alreadyRefunded) throw new Error("REFUND_EXCEEDS_UNREFUNDED_AMOUNT");
      const created = await tx.refund.create({ data: {
        paymentId, reference: `twtref_${nanoid(26).toLowerCase()}`, clientRequestId,
        sellerPaymentProfileId: sellerPaymentProfile?.id || null,
        amountMinor, currency: fresh.currency, reason, status: "REQUESTED", requiresSecondApproval: true,
      } });
      const changed = await tx.payment.updateMany({ where: { id: paymentId, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, data: { status: "REFUND_PENDING" } });
      if (changed.count !== 1) throw new Error("PAYMENT_STATE_CHANGED");
      await tx.auditLog.create({ data: { userId: customerId, action: "CUSTOMER_REFUND_REQUESTED", entity: "Refund", entityId: created.id, metadata: { paymentId, paymentReference: fresh.reference, refundReference: created.reference, amountMinor: amountMinor.toString(), currency: fresh.currency } } });
      return created;
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
    return NextResponse.json({ ok: true, reused: false, refund: { id: refund.id, reference: refund.reference, amountMinor: String(refund.amountMinor), currency: refund.currency, status: refund.status, requiresSecondApproval: true } }, { status: 201 });
  } catch (error: any) {
    const message = String(error?.message || "REFUND_REQUEST_FAILED");
    if (message === "REFUND_EXCEEDS_UNREFUNDED_AMOUNT" || message === "IDEMPOTENCY_KEY_CONFLICT") return NextResponse.json({ error: message }, { status: 409 });
    if (["REFUND_ALREADY_IN_PROGRESS", "PAYMENT_NOT_REFUNDABLE", "PAYMENT_STATE_CHANGED"].includes(message)) return NextResponse.json({ error: message }, { status: 409 });
    if (error?.code === "P2034" || error?.code === "P2002") return NextResponse.json({ error: "REFUND_REQUEST_CONFLICT", message: "Refresh payment status and retry with the same Idempotency-Key." }, { status: 409 });
    return NextResponse.json({ error: message }, { status: message === "PAYMENT_NOT_FOUND" ? 404 : 500 });
  }
}
