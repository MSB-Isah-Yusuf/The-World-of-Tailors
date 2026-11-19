import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { allocateCommissionForInstalment, sellerAllocation } from "@/lib/payments/commission";
import { getPaymentRuntimeConfig } from "@/lib/payments/config";
import { minorToMajorString, toMinorUnits } from "@/lib/payments/money";
import { paymentJournalLines } from "@/lib/payments/ledger";
import { postJournalTx } from "@/lib/payments/ledger-db";
import type { PaystackTransaction } from "@/lib/paystack";

export type PaymentVerificationResult = { ok: true; duplicate?: boolean; duplicateCapture?: boolean; status: string; paymentId?: string } | { ok: false; code: string; message: string; retryable?: boolean };

function metadataObject(metadata: unknown): Record<string, unknown> | null {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) return metadata as Record<string, unknown>;
  if (typeof metadata === "string") {
    try { const parsed = JSON.parse(metadata); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null; } catch { return null; }
  }
  return null;
}

function safeAmountMinor(amount: number | bigint | null | undefined, fallbackMajor: number): bigint {
  if (typeof amount === "bigint") return amount;
  if (typeof amount === "number" && Number.isSafeInteger(amount) && amount >= 0) return BigInt(amount);
  return toMinorUnits(fallbackMajor);
}

function isSameProviderCapture(payment: any, providerReference: string, transactionId: string | null) {
  if (!payment) return false;
  if (transactionId && String(payment.providerTransactionId || "") === transactionId) return true;
  const providerRef = String(payment.providerRef || "");
  return providerRef === providerReference || (!!transactionId && providerRef === transactionId);
}

async function flagCapturedPaymentForReview(input: { paymentId: string; attemptId: string; providerReference: string; transactionId: string | null; code: string; source: string }): Promise<PaymentVerificationResult> {
  const result = await prisma.$transaction(async (tx: any) => {
    const payment: any = await tx.payment.findUnique({ where: { id: input.paymentId } });
    const attempt: any = await tx.paymentAttempt.findUnique({ where: { id: input.attemptId } });
    if (!payment || !attempt) return { kind: "review" as const };
    if (payment.status === "PAID") {
      if (isSameProviderCapture(payment, input.providerReference, input.transactionId)) {
        await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: "SUCCESS" } }, data: { status: "SUCCESS", completedAt: new Date(), failureReason: null } });
        return { kind: "duplicate" as const, paymentId: payment.id };
      }
      await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: "SUCCESS" } }, data: { status: "DUPLICATE_CAPTURE_REVIEW", completedAt: new Date(), failureReason: input.code } });
      await tx.auditLog.create({ data: { action: "PAYMENT_DUPLICATE_CAPTURE_REVIEW", entity: "Payment", entityId: payment.id, metadata: { providerReference: input.providerReference, providerTransactionId: input.transactionId, code: input.code, source: input.source } } });
      return { kind: "duplicateCapture" as const, paymentId: payment.id };
    }
    await tx.payment.updateMany({ where: { id: payment.id, status: { not: "PAID" } }, data: { status: "REVIEW_REQUIRED" } });
    await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: "SUCCESS" } }, data: { status: "REVIEW_REQUIRED", completedAt: new Date(), failureReason: input.code } });
    await tx.auditLog.create({ data: { action: "PAYMENT_REQUIRES_FINANCIAL_REVIEW", entity: "Payment", entityId: payment.id, metadata: { providerReference: input.providerReference, providerTransactionId: input.transactionId, code: input.code, source: input.source } } });
    return { kind: "review" as const, paymentId: payment.id };
  });
  if (result.kind === "duplicate") return { ok: true, duplicate: true, duplicateCapture: false, status: "PAID", paymentId: result.paymentId };
  if (result.kind === "duplicateCapture") return { ok: true, duplicate: true, duplicateCapture: true, status: "DUPLICATE_CAPTURE_REVIEW", paymentId: result.paymentId };
  return { ok: false, code: input.code, message: "Paystack reports a successful charge that does not match the local obligation or settlement invariant. Payment is locked for administrator review.", retryable: false };
}

async function markReviewTx(tx: any, paymentId: string, attemptId: string, providerReference: string, code: string, source: string) {
  await tx.payment.updateMany({ where: { id: paymentId, status: { not: "PAID" } }, data: { status: "REVIEW_REQUIRED" } });
  await tx.paymentAttempt.updateMany({ where: { id: attemptId, status: { not: "SUCCESS" } }, data: { status: "REVIEW_REQUIRED", completedAt: new Date(), failureReason: code } });
  await tx.auditLog.create({ data: { action: "PAYMENT_REQUIRES_FINANCIAL_REVIEW", entity: "Payment", entityId: paymentId, metadata: { providerReference, code, source } } });
}

/** Apply only a backend-verified Paystack charge that matches the immutable local obligation. */
export async function verifyAndSettlePayment(providerData: PaystackTransaction, source: "webhook" | "callback" | "admin" = "webhook"): Promise<PaymentVerificationResult> {
  const providerReference = String(providerData.reference || "");
  if (!providerReference) return { ok: false, code: "REFERENCE_MISSING", message: "Provider reference missing" };
  const attempt: any = await prisma.paymentAttempt.findUnique({ where: { providerReference }, include: { payment: { include: { obligation: true, booking: true, fabricOrder: true } } } });
  if (!attempt) return { ok: false, code: "ATTEMPT_NOT_FOUND", message: "No local payment attempt matches this provider reference" };
  const payment = attempt.payment;
  const transactionId = providerData.id == null ? null : String(providerData.id);
  if (String(providerData.status || "").toLowerCase() !== "success") {
    const providerStatus = String(providerData.status || "unknown").toUpperCase();
    if (payment.status !== "PAID" && attempt.status !== "SUCCESS") {
      await prisma.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: "SUCCESS" } }, data: { status: providerStatus === "FAILED" ? "FAILED" : providerStatus, completedAt: ["FAILED", "ABANDONED", "REVERSED"].includes(providerStatus) ? new Date() : null, failureReason: providerData.status ? `Paystack status: ${providerStatus}` : "Provider status missing" } });
    }
    return { ok: false, code: "NOT_SUCCESSFUL", message: `Paystack transaction is ${providerStatus}`, retryable: !["FAILED", "ABANDONED", "REVERSED"].includes(providerStatus) };
  }
  if (String(providerData.reference || "") !== providerReference) return { ok: false, code: "REFERENCE_MISMATCH", message: "Paystack transaction reference does not match the local attempt" };

  let expectedMinor: bigint;
  try { expectedMinor = safeAmountMinor(payment.amountMinor, payment.amount); }
  catch { return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: "LOCAL_AMOUNT_INVALID", source }); }
  const actualMinor = Number.isSafeInteger(providerData.amount) && providerData.amount >= 0 ? BigInt(providerData.amount) : -1n;
  if (actualMinor !== expectedMinor) return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: "AMOUNT_MISMATCH", source });
  if (String(providerData.currency || "").toUpperCase() !== String(payment.currency || "NGN").toUpperCase()) return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: "CURRENCY_MISMATCH", source });
  const expectedCustomerId = payment.obligation?.customerId || payment.fabricOrder?.customerId || payment.booking?.customerId;
  if (!expectedCustomerId) return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: "OWNER_MISSING", source });
  const expectedUser = await prisma.user.findUnique({ where: { id: expectedCustomerId }, select: { email: true } });
  const providerEmail = providerData.customer?.email?.trim().toLowerCase();
  if (!expectedUser?.email || !providerEmail || expectedUser.email.toLowerCase() !== providerEmail) return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: "CUSTOMER_MISMATCH", source });
  const metadata = metadataObject(providerData.metadata);
  if (metadata?.paymentId && String(metadata.paymentId) !== payment.id) return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: "PAYMENT_METADATA_MISMATCH", source });
  if (metadata?.customerId && String(metadata.customerId) !== expectedCustomerId) return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: "CUSTOMER_METADATA_MISMATCH", source });
  if (metadata?.obligationId && String(metadata.obligationId) !== String(payment.obligationId || "")) return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: "OBLIGATION_METADATA_MISMATCH", source });

  const config = getPaymentRuntimeConfig();
  const feeMinor = Number.isSafeInteger(providerData.fees) && Number(providerData.fees) >= 0 ? BigInt(Number(providerData.fees)) : null;
  const parsedPaidAt = providerData.paid_at ? new Date(providerData.paid_at) : null;
  const paidAt = parsedPaidAt && Number.isFinite(parsedPaidAt.getTime()) ? parsedPaidAt : new Date();

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const fresh: any = await tx.payment.findUnique({ where: { id: payment.id }, include: { obligation: true, booking: true, fabricOrder: true } });
      const attemptNow: any = await tx.paymentAttempt.findUnique({ where: { id: attempt.id } });
      if (!fresh || !attemptNow || attemptNow.providerReference !== providerReference) throw new Error("PAYMENT_ATTEMPT_STATE_MISSING");

      if (fresh.status === "PAID") {
        if (isSameProviderCapture(fresh, providerReference, transactionId)) {
          if (attemptNow.status !== "SUCCESS") await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "SUCCESS", completedAt: new Date(), failureReason: null } });
          return { duplicate: true, duplicateCapture: false, status: "PAID", paymentId: fresh.id };
        }
        await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: "SUCCESS" } }, data: { status: "DUPLICATE_CAPTURE_REVIEW", completedAt: new Date(), failureReason: "Different successful provider capture for an already-paid payment" } });
        await tx.auditLog.create({ data: { action: "PAYMENT_DUPLICATE_CAPTURE_REVIEW", entity: "Payment", entityId: fresh.id, metadata: { providerReference, providerTransactionId: transactionId, source } } });
        return { duplicate: true, duplicateCapture: true, status: "DUPLICATE_CAPTURE_REVIEW", paymentId: fresh.id };
      }
      if (fresh.status !== "PENDING" || attemptNow.status === "SUCCESS" || attemptNow.status === "REVIEW_REQUIRED") {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "PAYMENT_OR_ATTEMPT_STATE_CONFLICT", source);
        return { review: true, code: "PAYMENT_OR_ATTEMPT_STATE_CONFLICT", paymentId: fresh.id };
      }
      if (fresh.booking?.status === "CANCELLED" || fresh.booking?.status === "DECLINED") {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "BOOKING_NOT_PAYABLE", source);
        return { review: true, code: "BOOKING_NOT_PAYABLE", paymentId: fresh.id };
      }
      if (fresh.fabricOrder?.status === "CANCELLED") {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "ORDER_CANCELLED", source);
        return { review: true, code: "ORDER_CANCELLED", paymentId: fresh.id };
      }
      if (!fresh.obligationId) {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "PAYMENT_OBLIGATION_MISSING", source);
        return { review: true, code: "PAYMENT_OBLIGATION_MISSING", paymentId: fresh.id };
      }
      const obligation: any = await tx.paymentObligation.findUnique({ where: { id: fresh.obligationId } });
      if (!obligation) {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "PAYMENT_OBLIGATION_MISSING", source);
        return { review: true, code: "PAYMENT_OBLIGATION_MISSING", paymentId: fresh.id };
      }
      if (BigInt(obligation.outstandingMinor) < expectedMinor || BigInt(obligation.outstandingMinor) <= 0n || BigInt(obligation.paidMinor) + expectedMinor > BigInt(obligation.totalMinor)) {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "OBLIGATION_OVERPAYMENT_REVIEW_REQUIRED", source);
        return { review: true, code: "OBLIGATION_OVERPAYMENT_REVIEW_REQUIRED", paymentId: fresh.id };
      }

      const sellerProfileId = fresh.fabricOrder?.sellerId || null;
      const tailorProfileId = fresh.booking?.tailorId || null;
      const sellerPaymentProfile: any = tailorProfileId
        ? await tx.sellerPaymentProfile.findUnique({ where: { tailorProfileId } })
        : sellerProfileId ? await tx.sellerPaymentProfile.findUnique({ where: { sellerProfileId } }) : null;
      if (!sellerPaymentProfile) {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "SELLER_PAYMENT_PROFILE_MISSING", source);
        return { review: true, code: "SELLER_PAYMENT_PROFILE_MISSING", paymentId: fresh.id };
      }
      const settlementRoute = String(obligation.settlementPolicySnapshot || "DISABLED").toUpperCase();
      const sellerAccountCode = settlementRoute === "CONTROLLED_PAYOUT" ? "SELLER_EARNINGS_PENDING" : settlementRoute === "IMMEDIATE_SPLIT" ? "SELLER_SPLIT_SETTLEMENT_PENDING" : "";
      if (!sellerAccountCode) {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "SETTLEMENT_POLICY_SNAPSHOT_INVALID", source);
        return { review: true, code: "SETTLEMENT_POLICY_SNAPSHOT_INVALID", paymentId: fresh.id };
      }
      if (!Number.isSafeInteger(Number(expectedMinor)) || Number(expectedMinor) <= 0) {
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "PAYMENT_AMOUNT_UNSAFE", source);
        return { review: true, code: "PAYMENT_AMOUNT_UNSAFE", paymentId: fresh.id };
      }

      const commissionMinor = allocateCommissionForInstalment({
        grossTotalMinor: BigInt(obligation.totalMinor), commissionTotalMinor: BigInt(obligation.commissionTotalMinor),
        paidBeforeMinor: BigInt(obligation.paidMinor), currentPaymentMinor: expectedMinor,
      });
      const sellerMinor = sellerAllocation(expectedMinor, commissionMinor);
      const paidNow = BigInt(obligation.paidMinor) + expectedMinor;
      const outstandingNow = BigInt(obligation.totalMinor) - paidNow;
      const commissionPaidNow = BigInt(obligation.commissionPaidMinor) + commissionMinor;

      const paymentUpdate = await tx.payment.updateMany({ where: { id: fresh.id, status: "PENDING" }, data: {
        status: "PAID", providerRef: transactionId || providerReference, providerTransactionId: transactionId,
        providerFeeMinor: feeMinor, paidAt, verifiedAt: new Date(), amountMinor: expectedMinor,
      } });
      if (paymentUpdate.count !== 1) {
        const latest: any = await tx.payment.findUnique({ where: { id: fresh.id } });
        if (latest?.status === "PAID" && isSameProviderCapture(latest, providerReference, transactionId)) return { duplicate: true, duplicateCapture: false, status: "PAID", paymentId: latest.id };
        if (latest?.status === "PAID") {
          await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: "SUCCESS" } }, data: { status: "DUPLICATE_CAPTURE_REVIEW", completedAt: new Date(), failureReason: "A different successful capture raced with this attempt" } });
          await tx.auditLog.create({ data: { action: "PAYMENT_DUPLICATE_CAPTURE_REVIEW", entity: "Payment", entityId: fresh.id, metadata: { providerReference, providerTransactionId: transactionId, source } } });
          return { duplicate: true, duplicateCapture: true, status: "DUPLICATE_CAPTURE_REVIEW", paymentId: fresh.id };
        }
        await markReviewTx(tx, fresh.id, attempt.id, providerReference, "PAYMENT_STATE_CHANGED_DURING_SETTLEMENT", source);
        return { review: true, code: "PAYMENT_STATE_CHANGED_DURING_SETTLEMENT", paymentId: fresh.id };
      }

      const obligationUpdate = await tx.paymentObligation.updateMany({ where: {
        id: obligation.id, paidMinor: BigInt(obligation.paidMinor), outstandingMinor: BigInt(obligation.outstandingMinor), status: { in: ["UNPAID", "PARTIALLY_PAID"] },
      }, data: {
        paidMinor: { increment: expectedMinor }, outstandingMinor: { decrement: expectedMinor },
        commissionPaidMinor: { increment: commissionMinor }, status: outstandingNow === 0n ? "PAID" : "PARTIALLY_PAID",
      } });
      if (obligationUpdate.count !== 1) throw new Error("OBLIGATION_CONCURRENT_PAYMENT_REVIEW_REQUIRED");

      const attemptUpdate = await tx.paymentAttempt.updateMany({ where: { id: attempt.id, status: { not: "SUCCESS" } }, data: {
        status: "SUCCESS", completedAt: new Date(), providerResponseSummary: { status: "success", amount: String(actualMinor), currency: providerData.currency, transactionId, fees: feeMinor?.toString() ?? null, source }, failureReason: null,
      } });
      if (attemptUpdate.count !== 1) throw new Error("ATTEMPT_FINALIZED_DURING_SETTLEMENT_REVIEW_REQUIRED");

      await tx.commissionAllocation.create({ data: {
        paymentId: fresh.id, ruleId: obligation.commissionRuleId,
        category: String(obligation.type).toUpperCase().includes("FABRIC") ? "FABRIC_SALE" : "TAILORING_SERVICE",
        rateBps: obligation.commissionRateBps, grossAmountMinor: expectedMinor,
        commissionAmountMinor: commissionMinor, sellerAmountMinor: sellerMinor,
        currency: fresh.currency, feePolicy: obligation.feePolicySnapshot, tailorProfileId, sellerProfileId,
      } });
      await postJournalTx(tx, {
        idempotencyKey: `payment-success:${fresh.id}`, sourceType: "PAYMENT", sourceId: fresh.id, currency: fresh.currency,
        description: `Verified Paystack payment ${fresh.reference}`, entryType: "PAYMENT_SUCCESS", paymentId: fresh.id,
        lines: paymentJournalLines({ grossMinor: expectedMinor, commissionMinor, sellerMinor, sellerAccountCode, sellerPaymentProfileId: sellerPaymentProfile.id }),
      });

      // The processor fee is accounted for separately from marketplace commission.
      if (feeMinor != null && feeMinor > 0n) {
        const policy = String(obligation.feePolicySnapshot || config.processingFeePolicy).toUpperCase();
        const sharedBps = obligation.sharedFeePlatformBpsSnapshot ?? config.sharedFeePlatformBps ?? 10_000;
        const platformFee = policy === "SELLER" ? 0n : policy === "SHARED" ? (feeMinor * BigInt(sharedBps) + 5_000n) / 10_000n : feeMinor;
        const sellerFee = feeMinor - platformFee;
        if (sellerFee > sellerMinor) throw new Error("SELLER_PROCESSING_FEE_EXCEEDS_ALLOCATED_EARNINGS_REVIEW_REQUIRED");
        const lines = [
          ...(sellerFee > 0n ? [{ accountCode: sellerAccountCode, debitMinor: sellerFee, description: "Actual processor fee borne by seller", sellerPaymentProfileId: sellerPaymentProfile.id }] : []),
          ...(platformFee > 0n ? [{ accountCode: "PROCESSING_FEE_EXPENSE", debitMinor: platformFee, description: "Actual processor fee borne by platform" }] : []),
          { accountCode: "PAYSTACK_CLEARING_RECEIVABLE", creditMinor: feeMinor, description: "Paystack processing fee deducted" },
        ];
        await postJournalTx(tx, { idempotencyKey: `payment-fee:${fresh.id}`, sourceType: "PAYMENT_FEE", sourceId: fresh.id, currency: fresh.currency, description: `Paystack fee for ${fresh.reference}`, entryType: "PROCESSOR_FEE", paymentId: fresh.id, lines });
      }

      if (fresh.fabricOrderId) {
        const order: any = await tx.fabricOrder.findUnique({ where: { id: fresh.fabricOrderId }, include: { items: true } });
        if (!order || order.paymentStatus !== "PENDING" || order.status === "CANCELLED") throw new Error("ORDER_FULFILMENT_STATE_CHANGED_REVIEW_REQUIRED");
        for (const item of order.items) {
          const product: any = await tx.fabricProduct.findUnique({ where: { id: item.productId } });
          if (!product || Number(product.stock) < Number(item.quantity) || Number(product.reserved) < Number(item.quantity)) throw new Error("INVENTORY_RESERVATION_INVARIANT_FAILED");
          await tx.fabricProduct.update({ where: { id: product.id }, data: { stock: { decrement: item.quantity }, reserved: { decrement: item.quantity } } });
          await tx.inventoryMovement.create({ data: { productId: item.productId, delta: -item.quantity, reason: `SOLD • verified Paystack reference ${providerReference}` } });
        }
        await tx.fabricOrder.update({ where: { id: order.id }, data: { paymentStatus: "PAID", status: "CONFIRMED" } });
        await tx.delivery.updateMany({ where: { fabricOrderId: order.id }, data: { status: "CONFIRMED" } });
        await tx.notification.create({ data: { userId: order.customerId, title: "Payment confirmed", message: `Order ${order.reference} payment verified by Paystack.`, type: "payment", link: "/dashboard/customer/orders" } });
        const seller = await tx.sellerProfile.findUnique({ where: { id: order.sellerId } });
        if (seller?.userId) await tx.notification.create({ data: { userId: seller.userId, title: "Paid fabric order", message: `Order ${order.reference} is confirmed; prepare for fulfilment.`, type: "payment", link: "/dashboard/seller/orders" } });
        if (order.orderGroupId) {
          const siblings = await tx.fabricOrder.findMany({ where: { orderGroupId: order.orderGroupId }, select: { paymentStatus: true } });
          const allPaid = siblings.length > 0 && siblings.every((item: any) => item.paymentStatus === "PAID");
          await tx.fabricOrderGroup.update({ where: { id: order.orderGroupId }, data: { status: allPaid ? "PAID" : "PARTIALLY_PAID" } });
        }
      }

      if (fresh.bookingId) {
        const booking: any = await tx.tailoringBooking.findUnique({ where: { id: fresh.bookingId } });
        if (!booking || ["CANCELLED", "DECLINED"].includes(String(booking.status))) throw new Error("BOOKING_FULFILMENT_STATE_CHANGED_REVIEW_REQUIRED");
        const bookingPaymentStatus = outstandingNow === 0n ? "FULLY_PAID" : "PARTIALLY_PAID";
        await tx.tailoringBooking.update({ where: { id: booking.id }, data: { paymentStatus: bookingPaymentStatus as any } });
        await tx.auditLog.create({ data: { action: "BOOKING_PAYMENT_VERIFIED", entity: "TailoringBooking", entityId: booking.id, metadata: { reference: booking.reference, paymentReference: fresh.reference, providerReference, paidMinor: expectedMinor.toString(), outstandingMinor: outstandingNow.toString(), source } } });
        await tx.notification.create({ data: { userId: booking.customerId, title: outstandingNow === 0n ? "Tailoring payment complete" : "Tailoring instalment received", message: `${booking.reference}: ₦${minorToMajorString(expectedMinor)} received. Outstanding balance: ₦${minorToMajorString(outstandingNow)}.`, type: "payment", link: `/dashboard/customer/bookings/${booking.id}` } });
        const tailor = await tx.tailorProfile.findUnique({ where: { id: booking.tailorId } });
        if (tailor?.userId) await tx.notification.create({ data: { userId: tailor.userId, title: "Tailoring payment received", message: `${booking.reference}: customer payment verified.`, type: "payment", link: "/dashboard/tailor/bookings" } });
      }

      return { duplicate: false, duplicateCapture: false, status: "PAID", paymentId: fresh.id };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 25_000 });
    if ((result as any).review) return { ok: false, code: (result as any).code, message: "Paystack charge is locked for administrator review before fulfilment", retryable: false };
    return { ok: true, ...(result as any) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment settlement failed";
    const integrityErrors = ["OBLIGATION_CONCURRENT_PAYMENT_REVIEW_REQUIRED", "ATTEMPT_FINALIZED_DURING_SETTLEMENT_REVIEW_REQUIRED", "SELLER_PROCESSING_FEE_EXCEEDS_ALLOCATED_EARNINGS_REVIEW_REQUIRED", "ORDER_FULFILMENT_STATE_CHANGED_REVIEW_REQUIRED", "INVENTORY_RESERVATION_INVARIANT_FAILED", "BOOKING_FULFILMENT_STATE_CHANGED_REVIEW_REQUIRED"];
    if (integrityErrors.includes(message)) {
      return flagCapturedPaymentForReview({ paymentId: payment.id, attemptId: attempt.id, providerReference, transactionId, code: message, source });
    }
    console.error("[payments] settle failed", crypto.createHash("sha256").update(message).digest("hex").slice(0, 12));
    return { ok: false, code: "SETTLEMENT_ERROR", message: "Payment settlement could not be completed", retryable: true };
  }
}
