import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { minorToMajorString } from "@/lib/payments/money";
import { getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "CUSTOMER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const customerId = String((session.user as any).id || "");
  const { id } = await params;
  const booking: any = await prisma.tailoringBooking.findUnique({ where: { id } });
  if (!booking || booking.customerId !== customerId) return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
  if (booking.status !== "ACCEPTED" || booking.quoteStatus !== "ACCEPTED" || !booking.quoteAcceptedAt) return NextResponse.json({ error: "QUOTE_NOT_ACCEPTED" }, { status: 409 });
  const sellerPaymentProfile: any = await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId: booking.tailorId } });
  if (!sellerPaymentProfile || sellerPaymentProfile.verificationStatus !== "VERIFIED" || !sellerPaymentProfile.payoutEligible || sellerPaymentProfile.suspendedAt) return NextResponse.json({ error: "PAYMENT_SETUP_REQUIRED" }, { status: 409 });
  try {
    const config = getPaymentRuntimeConfig();
    const route = String(sellerPaymentProfile.settlementPolicy || "DISABLED").toUpperCase();
    if (route === "IMMEDIATE_SPLIT" && (!config.immediateSplitEnabled || !sellerPaymentProfile.subaccountActive || !sellerPaymentProfile.paystackSubaccountCode)) return NextResponse.json({ error: "SETTLEMENT_POLICY_UNAVAILABLE" }, { status: 409 });
    if (route === "CONTROLLED_PAYOUT" && (!config.controlledPayoutsEnabled || !sellerPaymentProfile.paystackTransferRecipientCode)) return NextResponse.json({ error: "SETTLEMENT_POLICY_UNAVAILABLE" }, { status: 409 });
    if (!["IMMEDIATE_SPLIT", "CONTROLLED_PAYOUT"].includes(route)) return NextResponse.json({ error: "SETTLEMENT_POLICY_DISABLED" }, { status: 409 });
  } catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const obligation: any = await tx.paymentObligation.findFirst({ where: { bookingId: id }, orderBy: { createdAt: "desc" } });
      if (!obligation) throw new Error("PAYMENT_OBLIGATION_NOT_FOUND");
      if (obligation.status !== "PARTIALLY_PAID" || BigInt(obligation.paidMinor) <= 0n || BigInt(obligation.outstandingMinor) <= 0n) throw new Error("FINAL_BALANCE_NOT_DUE");
      const outstanding = BigInt(obligation.outstandingMinor);
      const existingPending = await tx.payment.findFirst({ where: { obligationId: obligation.id, category: "FINAL_BALANCE", status: "PENDING" }, orderBy: { createdAt: "desc" } });
      if (existingPending) return { payment: existingPending, outstanding, reused: true };
      const payment = await tx.payment.create({ data: {
        reference: `PAY-SC-BAL-${nanoid(20).toLowerCase()}`, bookingId: id, obligationId: obligation.id,
        amount: Number(minorToMajorString(outstanding)), amountMinor: outstanding, currency: obligation.currency,
        category: "FINAL_BALANCE", status: "PENDING",
      } });
      await tx.auditLog.create({ data: { userId: customerId, action: "TAILORING_FINAL_BALANCE_CREATED", entity: "TailoringBooking", entityId: id, metadata: { paymentId: payment.id, paymentReference: payment.reference, outstandingMinor: outstanding.toString() } } });
      return { payment, outstanding, reused: false };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 });
    return NextResponse.json({ ok: true, reused: result.reused, paymentId: result.payment.id, paymentReference: result.payment.reference, amountMinor: String(result.payment.amountMinor), currency: result.payment.currency, paymentType: "FINAL_BALANCE" });
  } catch (error: any) {
    const message = String(error?.message || "Unable to create balance payment");
    return NextResponse.json({ error: message }, { status: message === "PAYMENT_OBLIGATION_NOT_FOUND" ? 404 : 409 });
  }
}
