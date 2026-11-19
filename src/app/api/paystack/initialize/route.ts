import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initializePaystackAmount } from "@/lib/paystack";
import { assertCustomerPaymentsEnabled, PaymentConfigurationError, getPaymentRuntimeConfig } from "@/lib/payments/config";
import { allocateCommissionForInstalment } from "@/lib/payments/commission";
import { createPaymentObligationSnapshot } from "@/lib/payments/rules";
import { minorToJson, toMinorUnits, toPaystackAmount } from "@/lib/payments/money";

const ACTIVE_ATTEMPT_STATES = ["INITIALIZING", "INITIALIZATION_UNKNOWN", "AWAITING_CUSTOMER", "PENDING", "PROCESSING", "ONGOING"];

function ownerId(payment: any): string | null {
  return payment.obligation?.customerId || payment.booking?.customerId || payment.fabricOrder?.customerId || null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = (session.user as any).id as string;
  if ((session.user as any).role !== "CUSTOMER") return NextResponse.json({ error: "CUSTOMER_ONLY" }, { status: 403 });

  let config;
  try { config = getPaymentRuntimeConfig(); assertCustomerPaymentsEnabled(config); }
  catch (error) {
    const message = error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable";
    return NextResponse.json({ error: message, code: "PAYMENT_NOT_CONFIGURED" }, { status: 503 });
  }

  const body: any = await req.json().catch(() => ({}));
  if (body.amount !== undefined || body.amountMinor !== undefined || body.total !== undefined) {
    return NextResponse.json({ error: "AMOUNT_NOT_ACCEPTED — payment amount is read from the server-side obligation" }, { status: 400 });
  }
  const lookup = String(body.paymentId || body.reference || body.orderReference || "").trim();
  if (!lookup) return NextResponse.json({ error: "paymentId, payment reference, or fabric order reference is required" }, { status: 400 });
  const includePayment = { obligation: true, booking: { include: { tailor: true } }, fabricOrder: { include: { seller: true } }, attempts: { orderBy: { attemptNumber: "desc" as const } } };
  let payment: any = null;
  if (body.paymentId) payment = await prisma.payment.findUnique({ where: { id: lookup }, include: includePayment });
  else if (body.orderReference) {
    const order = await prisma.fabricOrder.findUnique({ where: { reference: lookup }, select: { id: true } });
    if (order) payment = await prisma.payment.findFirst({ where: { fabricOrderId: order.id }, include: includePayment });
  } else payment = await prisma.payment.findUnique({ where: { reference: lookup }, include: includePayment });
  if (!payment) return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  if (ownerId(payment) !== userId) return NextResponse.json({ error: "FORBIDDEN — payment does not belong to this customer" }, { status: 403 });
  if (payment.status === "PAID") return NextResponse.json({ error: "ALREADY_PAID", code: "DUPLICATE_CHECKOUT" }, { status: 409 });
  if (payment.status === "REVIEW_REQUIRED") return NextResponse.json({ error: "PAYMENT_REQUIRES_ADMIN_REVIEW" }, { status: 409 });
  if (["CANCELLED", "REFUNDED", "REVERSED", "REFUND_PENDING", "PARTIALLY_REFUNDED"].includes(String(payment.status))) return NextResponse.json({ error: "PAYMENT_NOT_PAYABLE" }, { status: 409 });

  // Never create a tailoring payment from an unaccepted or unpriced booking.
  if (payment.bookingId && (!payment.booking || payment.booking.status !== "ACCEPTED" || !payment.booking.quoteAcceptedAt)) {
    return NextResponse.json({ error: "BOOKING_QUOTE_NOT_ACCEPTED" }, { status: 409 });
  }

  let amountMinor: bigint;
  try {
    amountMinor = payment.amountMinor != null ? BigInt(payment.amountMinor) : toMinorUnits(payment.amount);
  } catch {
    return NextResponse.json({ error: "INVALID_PAYMENT_AMOUNT" }, { status: 409 });
  }
  if (amountMinor <= 0n) return NextResponse.json({ error: "INVALID_PAYMENT_AMOUNT" }, { status: 409 });
  try { toPaystackAmount(amountMinor); }
  catch { return NextResponse.json({ error: "PAYMENT_AMOUNT_OUT_OF_RANGE" }, { status: 409 }); }

  // Compatibility bridge for legacy pending records: snapshot a commission rule once and
  // create a minor-unit obligation. New order/booking flows create these at checkout/quote time.
  if (!payment.obligationId || !payment.obligation) {
    const category = payment.fabricOrderId ? "FABRIC_SALE" : "TAILORING_SERVICE";
    const booking = payment.booking;
    const fabricOrder = payment.fabricOrder;
    if (payment.bookingId && (!booking?.agreedAmountMinor || !booking?.quoteAcceptedAt || booking.status !== "ACCEPTED")) {
      return NextResponse.json({ error: "BOOKING_QUOTE_NOT_ACCEPTED" }, { status: 409 });
    }
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        const fresh = await tx.payment.findUnique({ where: { id: payment.id }, include: { obligation: true } });
        if (!fresh) throw new Error("PAYMENT_NOT_FOUND");
        if (fresh.obligationId && fresh.obligation) return fresh;
        const ob = await createPaymentObligationSnapshot({
          tx,
          customerId: userId,
          type: payment.fabricOrderId ? "FABRIC_ORDER" : "FULL",
          category,
          totalMinor: amountMinor,
          commissionBaseMinor: fabricOrder ? (fabricOrder.subtotalMinor != null ? BigInt(fabricOrder.subtotalMinor) : toMinorUnits(Number(fabricOrder.subtotal))) : undefined,
          currency: payment.currency || config.defaultCurrency,
          bookingId: payment.bookingId,
          fabricOrderId: payment.fabricOrderId,
          orderGroupId: fabricOrder?.orderGroupId,
          tailorProfileId: booking?.tailorId,
          sellerProfileId: fabricOrder?.sellerId,
          acceptedAt: booking?.quoteAcceptedAt || new Date(),
        });
        return tx.payment.update({ where: { id: payment.id }, data: { amountMinor, category, obligationId: ob.id }, include: { obligation: true } });
      });
      payment.obligation = result.obligation;
      payment.obligationId = result.obligationId;
      payment.amountMinor = result.amountMinor;
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.includes("No active") || message.includes("Ambiguous active")) return NextResponse.json({ error: "COMMISSION_CONFIGURATION_REQUIRED", message }, { status: 409 });
      return NextResponse.json({ error: "PAYMENT_OBLIGATION_SETUP_FAILED" }, { status: 409 });
    }
  }

  const obligation = payment.obligation;
  if (!obligation || !["UNPAID", "PARTIALLY_PAID"].includes(String(obligation.status)) || obligation.currency !== payment.currency || BigInt(obligation.outstandingMinor) < amountMinor) {
    return NextResponse.json({ error: "PAYMENT_OBLIGATION_INVALID" }, { status: 409 });
  }
  if (obligation.expiresAt && obligation.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "PAYMENT_OBLIGATION_EXPIRED" }, { status: 409 });
  if (payment.currency !== config.defaultCurrency) return NextResponse.json({ error: "UNSUPPORTED_CURRENCY" }, { status: 409 });

  const sellerProfileId = payment.fabricOrder?.sellerId || null;
  const tailorProfileId = payment.booking?.tailorId || null;
  const sellerPaymentProfile: any = tailorProfileId
    ? await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId } })
    : sellerProfileId ? await prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId } }) : null;
  if (!sellerPaymentProfile) return NextResponse.json({ error: "SELLER_PAYMENT_SETUP_REQUIRED", message: "The seller has not completed verified payment settlement setup." }, { status: 409 });
  if (sellerPaymentProfile.suspendedAt || !sellerPaymentProfile.payoutEligible || sellerPaymentProfile.verificationStatus !== "VERIFIED") {
    return NextResponse.json({ error: "SELLER_NOT_PAYMENT_ELIGIBLE" }, { status: 409 });
  }

  const route = String(sellerPaymentProfile.settlementPolicy || "DISABLED").toUpperCase();
  if (String(obligation.settlementPolicySnapshot || "DISABLED").toUpperCase() !== route) {
    return NextResponse.json({ error: "SETTLEMENT_POLICY_CHANGED", message: "Settlement policy changed after this obligation was created. Create a fresh checkout or obtain an updated accepted quote." }, { status: 409 });
  }
  let subaccount: string | undefined;
  let transactionChargeMinor: bigint | undefined;
  let bearer: "account" | "subaccount" | undefined;
  if (route === "IMMEDIATE_SPLIT") {
    if (!config.immediateSplitEnabled) return NextResponse.json({ error: "IMMEDIATE_SPLIT_DISABLED", message: "Immediate split settlement is disabled by platform configuration." }, { status: 409 });
    if (!sellerPaymentProfile.subaccountActive || !sellerPaymentProfile.paystackSubaccountCode) return NextResponse.json({ error: "SUBACCOUNT_NOT_ACTIVE" }, { status: 409 });
    if (obligation.feePolicySnapshot === "SHARED") return NextResponse.json({ error: "SHARED_FEE_SPLIT_UNSUPPORTED_FOR_IMMEDIATE_SPLIT" }, { status: 409 });
    subaccount = sellerPaymentProfile.paystackSubaccountCode;
    transactionChargeMinor = allocateCommissionForInstalment({
      grossTotalMinor: BigInt(obligation.totalMinor),
      commissionTotalMinor: BigInt(obligation.commissionTotalMinor),
      paidBeforeMinor: BigInt(obligation.paidMinor),
      currentPaymentMinor: amountMinor,
    });
    bearer = obligation.feePolicySnapshot === "SELLER" ? "subaccount" : "account";
  } else if (route === "CONTROLLED_PAYOUT") {
    if (!config.controlledPayoutsEnabled) return NextResponse.json({ error: "CONTROLLED_PAYOUTS_DISABLED", message: "Controlled payouts require explicit Paystack and business approval plus administrator configuration." }, { status: 409 });
    if (!sellerPaymentProfile.paystackTransferRecipientCode) return NextResponse.json({ error: "TRANSFER_RECIPIENT_MISSING" }, { status: 409 });
  } else {
    return NextResponse.json({ error: "SETTLEMENT_POLICY_DISABLED" }, { status: 409 });
  }

  // Reuse an in-flight checkout URL instead of creating a second live charge.
  const activeAttempt = payment.attempts?.find((a: any) => ACTIVE_ATTEMPT_STATES.includes(String(a.status).toUpperCase()));
  if (activeAttempt?.authorizationUrl) {
    return NextResponse.json({ ok: true, authorization_url: activeAttempt.authorizationUrl, access_code: activeAttempt.accessCode, reference: activeAttempt.providerReference, paymentId: payment.id, amountMinor: amountMinor.toString(), currency: payment.currency, reused: true });
  }
  if (activeAttempt) {
    const uncertain = String(activeAttempt.status).toUpperCase() === "INITIALIZATION_UNKNOWN";
    return NextResponse.json({
      error: uncertain ? "PAYMENT_INITIALIZATION_UNKNOWN" : "PAYMENT_ATTEMPT_IN_PROGRESS",
      reference: activeAttempt.providerReference,
      message: uncertain
        ? `Paystack may have accepted this initialization. Verify the same reference ${activeAttempt.providerReference}; do not start another payment until it is reconciled.`
        : `An earlier attempt is still being initialized or verified (reference ${activeAttempt.providerReference}). No new attempt was created.`,
    }, { status: 409 });
  }

  const nextAttemptNumber = (payment.attempts?.reduce((max: number, a: any) => Math.max(max, a.attemptNumber), 0) || 0) + 1;
  const providerReference = `twt_${nanoid(24).toLowerCase()}`;
  let attempt: any;
  try {
    attempt = await prisma.paymentAttempt.create({ data: {
      paymentId: payment.id,
      providerReference,
      attemptNumber: nextAttemptNumber,
      status: "INITIALIZING",
      providerResponseSummary: {
        settlementRoute: route,
        subaccountCode: subaccount || null,
        transactionChargeMinor: transactionChargeMinor?.toString() || null,
        feeBearer: bearer || null,
      },
    } });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "PAYMENT_ATTEMPT_CONFLICT", message: "Another checkout attempt is being created; reload and retry." }, { status: 409 });
    return NextResponse.json({ error: "PAYMENT_ATTEMPT_SETUP_FAILED" }, { status: 500 });
  }

  let providerRequestStarted = false;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) throw new Error("Customer email required for Paystack");
    providerRequestStarted = true;
    const initialized = await initializePaystackAmount({
      email: user.email,
      amountMinor,
      reference: providerReference,
      currency: payment.currency,
      metadata: { paymentId: payment.id, obligationId: obligation.id, customerId: userId, paymentCategory: payment.category || obligation.type },
      subaccount,
      transactionChargeMinor,
      bearer,
    });
    const updated = await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: {
      status: "AWAITING_CUSTOMER",
      authorizationUrl: initialized.authorization_url,
      accessCode: initialized.access_code,
      providerResponseSummary: {
        settlementRoute: route,
        subaccountCode: subaccount || null,
        transactionChargeMinor: transactionChargeMinor?.toString() || null,
        feeBearer: bearer || null,
        providerReference,
        initializedAt: new Date().toISOString(),
      },
    } });
    return NextResponse.json({ ok: true, authorization_url: updated.authorizationUrl, access_code: updated.accessCode, reference: providerReference, paymentId: payment.id, amountMinor: minorToJson(amountMinor), currency: payment.currency });
  } catch (error: any) {
    const uncertain = providerRequestStarted;
    const failureReason = uncertain
      ? "Paystack initialization outcome is uncertain; verify this same reference before another attempt"
      : "Local payment initialization preflight failed before contacting Paystack";
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: {
      status: uncertain ? "INITIALIZATION_UNKNOWN" : "FAILED",
      completedAt: uncertain ? null : new Date(),
      failureReason,
    } }).catch(() => {});
    const message = uncertain
      ? `Paystack may have accepted the initialization. Verify the same reference ${providerReference}; do not start another payment until it is reconciled.`
      : "Payment initialization could not proceed; no Paystack create request was sent.";
    return NextResponse.json({ error: uncertain ? "PAYMENT_INITIALIZATION_UNKNOWN" : "PAYSTACK_INITIALIZATION_FAILED", message, reference: providerReference }, { status: 502 });
  }
}
