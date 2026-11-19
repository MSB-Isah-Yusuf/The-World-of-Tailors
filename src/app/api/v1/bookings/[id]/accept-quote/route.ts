import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentObligationSnapshot } from "@/lib/payments/rules";
import { minorToMajorString } from "@/lib/payments/money";
import { getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "CUSTOMER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const customerId = String((session.user as any).id || "");
  const { id } = await params;
  const booking: any = await prisma.tailoringBooking.findUnique({ where: { id }, include: { tailor: { select: { userId: true, businessName: true } } } });
  if (!booking || booking.customerId !== customerId) return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
  if (booking.status !== "ACCEPTED") return NextResponse.json({ error: "TAILOR_MUST_ACCEPT_BOOKING_FIRST" }, { status: 409 });
  const sellerPaymentProfile: any = await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId: booking.tailorId } });
  if (!sellerPaymentProfile || sellerPaymentProfile.verificationStatus !== "VERIFIED" || !sellerPaymentProfile.payoutEligible || sellerPaymentProfile.suspendedAt) return NextResponse.json({ error: "PAYMENT_SETUP_REQUIRED" }, { status: 409 });
  try {
    const config = getPaymentRuntimeConfig();
    const route = String(sellerPaymentProfile.settlementPolicy || "DISABLED").toUpperCase();
    if (route === "IMMEDIATE_SPLIT" && (!config.immediateSplitEnabled || !sellerPaymentProfile.subaccountActive || !sellerPaymentProfile.paystackSubaccountCode)) return NextResponse.json({ error: "SETTLEMENT_POLICY_UNAVAILABLE" }, { status: 409 });
    if (route === "CONTROLLED_PAYOUT" && (!config.controlledPayoutsEnabled || !sellerPaymentProfile.paystackTransferRecipientCode)) return NextResponse.json({ error: "SETTLEMENT_POLICY_UNAVAILABLE" }, { status: 409 });
    if (!["IMMEDIATE_SPLIT", "CONTROLLED_PAYOUT"].includes(route)) return NextResponse.json({ error: "SETTLEMENT_POLICY_DISABLED" }, { status: 409 });
  } catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }
  if (booking.quoteStatus === "ACCEPTED" && booking.quoteAcceptedAt) {
    const existing = await prisma.payment.findFirst({ where: { bookingId: id, category: { in: ["DEPOSIT", "FULL"] } }, orderBy: { createdAt: "asc" } });
    if (existing) return NextResponse.json({ ok: true, alreadyAccepted: true, paymentId: existing.id, paymentReference: existing.reference, amountMinor: String(existing.amountMinor), currency: existing.currency });
  }
  if (booking.quoteStatus !== "SENT" || !booking.agreedAmountMinor) return NextResponse.json({ error: "NO_PENDING_QUOTE" }, { status: 409 });
  if (booking.quoteExpiresAt && booking.quoteExpiresAt.getTime() <= Date.now()) return NextResponse.json({ error: "QUOTE_EXPIRED" }, { status: 409 });

  const totalMinor = BigInt(booking.agreedAmountMinor);
  const quotedDeposit = booking.depositAmountMinor == null ? 0n : BigInt(booking.depositAmountMinor);
  const firstPaymentMinor = quotedDeposit > 0n ? quotedDeposit : totalMinor;
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const fresh: any = await tx.tailoringBooking.findUnique({ where: { id }, include: { tailor: { select: { userId: true } } } });
      if (!fresh || fresh.customerId !== customerId || fresh.status !== "ACCEPTED") throw new Error("BOOKING_NOT_AVAILABLE");
      if (fresh.quoteStatus === "ACCEPTED" && fresh.quoteAcceptedAt) {
        const old = await tx.payment.findFirst({ where: { bookingId: id, category: { in: ["DEPOSIT", "FULL"] } }, orderBy: { createdAt: "asc" } });
        if (old) return { payment: old, obligation: await tx.paymentObligation.findUnique({ where: { id: old.obligationId } }), alreadyAccepted: true };
      }
      const existingObligation = await tx.paymentObligation.findFirst({ where: { bookingId: id } });
      if (existingObligation) throw new Error("BOOKING_PAYMENT_ALREADY_CREATED");
      const obligation = await createPaymentObligationSnapshot({
        tx, customerId, type: "TAILORING_SERVICE", category: "TAILORING_SERVICE", totalMinor,
        currency: fresh.currency || "NGN", bookingId: id, tailorProfileId: fresh.tailorId,
        acceptedAt: new Date(), dueAt: fresh.quoteExpiresAt,
      });
      const payment = await tx.payment.create({ data: {
        reference: `PAY-SC-${nanoid(18).toUpperCase()}`, bookingId: id, obligationId: obligation.id,
        amount: Number(minorToMajorString(firstPaymentMinor)), amountMinor: firstPaymentMinor,
        currency: fresh.currency || "NGN", category: quotedDeposit > 0n ? "DEPOSIT" : "FULL", status: "PENDING",
      } });
      await tx.tailoringBooking.update({ where: { id }, data: { quoteStatus: "ACCEPTED", quoteAcceptedAt: new Date(), paymentStatus: quotedDeposit > 0n ? "DEPOSIT_PENDING" : "PENDING" } });
      await tx.auditLog.create({ data: { userId: customerId, action: "CUSTOMER_ACCEPTED_TAILORING_QUOTE", entity: "TailoringBooking", entityId: id, metadata: { reference: fresh.reference, obligationId: obligation.id, firstPaymentMinor: firstPaymentMinor.toString(), totalMinor: totalMinor.toString() } } });
      await tx.notification.create({ data: { userId: fresh.tailor.userId, title: "Customer accepted your quote", message: `${fresh.reference}: the customer accepted the quotation. Their initial payment is now due.`, type: "payment", link: "/dashboard/tailor/bookings" } });
      return { payment, obligation, alreadyAccepted: false };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
    return NextResponse.json({ ok: true, alreadyAccepted: result.alreadyAccepted, bookingId: id, paymentId: result.payment.id, paymentReference: result.payment.reference, amountMinor: String(result.payment.amountMinor), outstandingMinor: String(result.obligation?.outstandingMinor ?? totalMinor - firstPaymentMinor), currency: result.payment.currency, paymentType: result.payment.category });
  } catch (error: any) {
    const message = String(error?.message || "Unable to accept quote");
    if (message.includes("No active") || message.includes("Ambiguous active")) return NextResponse.json({ error: "COMMISSION_CONFIGURATION_REQUIRED" }, { status: 409 });
    return NextResponse.json({ error: message.slice(0, 200) }, { status: 409 });
  }
}
