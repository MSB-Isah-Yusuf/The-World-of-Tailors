import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { minorToMajorString } from "@/lib/payments/money";
import { getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";

function minor(value: unknown, field: string, defaultValue = 0n): bigint {
  if (value === undefined || value === null || value === "") return defaultValue;
  const s = String(value);
  if (!/^\d{1,18}$/.test(s)) throw new Error(`${field} must be a non-negative integer in kobo`);
  return BigInt(s);
}
function cleanText(value: unknown, max: number) { return String(value || "").trim().slice(0, max); }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "TAILOR") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const tailorUserId = String((session.user as any).id || "");
  const tailor = await prisma.tailorProfile.findUnique({ where: { userId: tailorUserId } });
  if (!tailor) return NextResponse.json({ error: "TAILOR_PROFILE_NOT_FOUND" }, { status: 404 });
  const sellerPaymentProfile: any = await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId: tailor.id } });
  if (!sellerPaymentProfile || sellerPaymentProfile.verificationStatus !== "VERIFIED" || !sellerPaymentProfile.payoutEligible || sellerPaymentProfile.suspendedAt) return NextResponse.json({ error: "PAYMENT_SETUP_REQUIRED", message: "Complete verified Paystack settlement setup before sending a payable quotation." }, { status: 409 });
  try {
    const config = getPaymentRuntimeConfig();
    const route = String(sellerPaymentProfile.settlementPolicy || "DISABLED").toUpperCase();
    if (route === "IMMEDIATE_SPLIT" && (!config.immediateSplitEnabled || !sellerPaymentProfile.subaccountActive || !sellerPaymentProfile.paystackSubaccountCode)) return NextResponse.json({ error: "SETTLEMENT_POLICY_UNAVAILABLE" }, { status: 409 });
    if (route === "CONTROLLED_PAYOUT" && (!config.controlledPayoutsEnabled || !sellerPaymentProfile.paystackTransferRecipientCode)) return NextResponse.json({ error: "SETTLEMENT_POLICY_UNAVAILABLE" }, { status: 409 });
    if (!["IMMEDIATE_SPLIT", "CONTROLLED_PAYOUT"].includes(route)) return NextResponse.json({ error: "SETTLEMENT_POLICY_DISABLED" }, { status: 409 });
  } catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }
  const { id } = await params;
  const booking: any = await prisma.tailoringBooking.findUnique({ where: { id } });
  if (!booking || booking.tailorId !== tailor.id) return NextResponse.json({ error: "BOOKING_NOT_FOUND" }, { status: 404 });
  if (["COMPLETED", "DECLINED", "CANCELLED"].includes(booking.status)) return NextResponse.json({ error: "BOOKING_NOT_QUOTABLE" }, { status: 409 });
  if (booking.quoteStatus === "ACCEPTED" || booking.quoteAcceptedAt) return NextResponse.json({ error: "QUOTE_ALREADY_ACCEPTED", message: "An accepted quotation is immutable. Any changes require a separately agreed and audited adjustment." }, { status: 409 });

  const body: any = await req.json().catch(() => ({}));
  try {
    const serviceMinor = minor(body.serviceAmountMinor, "serviceAmountMinor");
    const deliveryMinor = minor(body.deliveryChargeMinor, "deliveryChargeMinor");
    const additionalMinor = minor(body.additionalChargesMinor, "additionalChargesMinor");
    const discountMinor = minor(body.discountMinor, "discountMinor");
    if (serviceMinor <= 0n) throw new Error("serviceAmountMinor must be greater than zero");
    const grossBeforeDiscount = serviceMinor + deliveryMinor + additionalMinor;
    if (discountMinor > grossBeforeDiscount) throw new Error("Discount cannot exceed the pre-discount total");
    const totalMinor = grossBeforeDiscount - discountMinor;
    if (totalMinor <= 0n) throw new Error("Quoted total must be greater than zero");

    if (body.depositAmountMinor !== undefined && body.depositPercentBps !== undefined) throw new Error("Provide a fixed deposit or a deposit percent, not both");
    let depositMinor = 0n;
    if (body.depositAmountMinor !== undefined) depositMinor = minor(body.depositAmountMinor, "depositAmountMinor");
    else if (body.depositPercentBps !== undefined) {
      const bps = Number(body.depositPercentBps);
      if (!Number.isInteger(bps) || bps < 1 || bps > 10_000) throw new Error("depositPercentBps must be 1–10000");
      depositMinor = (totalMinor * BigInt(bps) + 5_000n) / 10_000n;
    }
    if (depositMinor < 0n || depositMinor > totalMinor) throw new Error("Deposit must be between zero and the total quote");

    const expiry = body.quoteExpiresAt ? new Date(String(body.quoteExpiresAt)) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (!Number.isFinite(expiry.getTime()) || expiry.getTime() <= Date.now()) throw new Error("Quote expiry must be a future date");
    const estimatedCompletion = body.estimatedCompletion ? new Date(String(body.estimatedCompletion)) : null;
    if (estimatedCompletion && (!Number.isFinite(estimatedCompletion.getTime()) || estimatedCompletion.getTime() < Date.now())) throw new Error("Estimated completion must be a future date");

    const quoteDetails = {
      serviceName: cleanText(body.serviceName, 180),
      description: cleanText(body.description, 2000),
      garmentDetails: cleanText(body.garmentDetails, 1500),
      fabricRequirements: cleanText(body.fabricRequirements, 1500),
      serviceAmountMinor: serviceMinor.toString(),
      deliveryChargeMinor: deliveryMinor.toString(),
      additionalChargesMinor: additionalMinor.toString(),
      discountMinor: discountMinor.toString(),
      totalAmountMinor: totalMinor.toString(),
      depositAmountMinor: depositMinor.toString(),
      depositPercentBps: body.depositPercentBps == null ? null : Number(body.depositPercentBps),
      terms: cleanText(body.terms, 3000),
      cancellationTerms: cleanText(body.cancellationTerms, 1500),
    };

    const updated = await prisma.$transaction(async (tx: any) => {
      const fresh = await tx.tailoringBooking.findUnique({ where: { id } });
      if (!fresh || fresh.tailorId !== tailor.id) throw new Error("BOOKING_NOT_FOUND");
      if (fresh.quoteStatus === "ACCEPTED" || fresh.quoteAcceptedAt) throw new Error("QUOTE_ALREADY_ACCEPTED");
      const existingObligation = await tx.paymentObligation.findFirst({ where: { bookingId: id } });
      const existingPayment = await tx.payment.findFirst({ where: { bookingId: id } });
      if (existingObligation || existingPayment) throw new Error("QUOTE_CANNOT_CHANGE_AFTER_PAYMENT");
      const row = await tx.tailoringBooking.update({ where: { id }, data: {
        agreedPrice: Number(minorToMajorString(totalMinor)), agreedAmountMinor: totalMinor,
        depositAmountMinor: depositMinor, quoteExpiresAt: expiry, quoteStatus: "SENT", quoteDetails,
        estimatedCompletion: estimatedCompletion || fresh.estimatedCompletion,
        paymentStatus: "PENDING",
      } });
      await tx.auditLog.create({ data: { userId: tailorUserId, action: "TAILORING_QUOTE_SENT", entity: "TailoringBooking", entityId: id, metadata: { reference: booking.reference, totalMinor: totalMinor.toString(), depositMinor: depositMinor.toString(), quoteExpiresAt: expiry.toISOString() } } });
      await tx.notification.create({ data: { userId: booking.customerId, title: "Tailoring quote received", message: `Your tailor sent a quotation for booking ${booking.reference}. Review and accept it before paying.`, type: "payment", link: `/dashboard/customer/bookings/${id}` } });
      return row;
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 });
    return NextResponse.json({ ok: true, quote: { totalMinor: totalMinor.toString(), depositMinor: depositMinor.toString(), balanceMinor: (totalMinor - depositMinor).toString(), currency: booking.currency || "NGN", quoteExpiresAt: updated.quoteExpiresAt } });
  } catch (error: any) {
    const message = String(error?.message || "Quote could not be saved");
    if (["QUOTE_CANNOT_CHANGE_AFTER_PAYMENT", "QUOTE_ALREADY_ACCEPTED"].includes(message)) return NextResponse.json({ error: message }, { status: 409 });
    return NextResponse.json({ error: message.slice(0, 200) }, { status: 400 });
  }
}
