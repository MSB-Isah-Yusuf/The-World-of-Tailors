import { prisma } from "@/lib/prisma";
import { postJournalTx } from "@/lib/payments/ledger-db";

const ACTIVE_REFUND_STATES = ["REQUESTED", "AWAITING_SECOND_APPROVAL", "INITIATING", "PROCESSING", "REFUND_UNKNOWN", "REVIEW_REQUIRED"];
const PENDING_PROVIDER_STATES = new Set(["pending", "processing", "received"]);

function toText(value: unknown): string | null { return value == null ? null : String(value).slice(0, 180); }
function reverseAllocation(grossMinor: bigint, commissionMinor: bigint, alreadyRefundedMinor: bigint, refundMinor: bigint): { commissionMinor: bigint; sellerMinor: bigint } {
  if (grossMinor <= 0n || refundMinor <= 0n || alreadyRefundedMinor < 0n || alreadyRefundedMinor + refundMinor > grossMinor) throw new Error("Invalid refund allocation range");
  const commissionSoFar = commissionMinor * alreadyRefundedMinor / grossMinor;
  const commission = alreadyRefundedMinor + refundMinor === grossMinor ? commissionMinor - commissionSoFar : commissionMinor * refundMinor / grossMinor;
  return { commissionMinor: commission, sellerMinor: refundMinor - commission };
}

async function paymentNetRefunded(tx: any, paymentId: string) {
  const rows = await tx.refund.findMany({ where: { paymentId, status: { in: ["SUCCESS", "REVERSED"] } }, select: { amountMinor: true, status: true } });
  return rows.reduce((total: bigint, row: any) => total + (row.status === "SUCCESS" ? BigInt(row.amountMinor) : -BigInt(row.amountMinor)), 0n);
}

async function restorePaymentStatus(tx: any, paymentId: string) {
  const payment: any = await tx.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;
  const net = await paymentNetRefunded(tx, paymentId);
  const gross = BigInt(payment.amountMinor || 0n);
  const status = net <= 0n ? "PAID" : net >= gross ? "REFUNDED" : "PARTIALLY_REFUNDED";
  await tx.payment.updateMany({ where: { id: paymentId, status: "REFUND_PENDING" }, data: { status: status as any } });
}

export async function markRefundUnknown(refundId: string, actorId: string, reason = "Provider result uncertain; verify the same reference before any further action") {
  await prisma.$transaction(async (tx: any) => {
    await tx.refund.updateMany({ where: { id: refundId, status: { in: ["INITIATING", "PROCESSING"] } }, data: { status: "REFUND_UNKNOWN", providerResponseSummary: { state: "uncertain", rule: "no new refund reference will be created" } } });
    await tx.auditLog.create({ data: { userId: actorId, action: "REFUND_PROVIDER_STATUS_UNKNOWN", entity: "Refund", entityId: refundId, metadata: { reason: "verify existing provider reference; do not create another refund" } } });
  });
}

/** Apply only a refund record returned by Paystack's refund query/verification endpoint. */
export async function applyVerifiedPaystackRefund(refundReference: string, providerRefund: any, actorId?: string) {
  const refund: any = await prisma.refund.findUnique({ where: { reference: refundReference }, include: { payment: true } });
  if (!refund) return { final: true, status: "REVIEW_REQUIRED", error: "REFUND_NOT_FOUND" };
  const returnedReference = String(providerRefund?.reference || providerRefund?.refund_reference || "");
  const returnedAmount = providerRefund?.amount;
  const returnedCurrency = String(providerRefund?.currency || "").toUpperCase();
  const returnedTransaction = String(providerRefund?.transaction?.id ?? providerRefund?.transaction ?? "");
  const expectedTransaction = String(refund.payment.providerTransactionId || "");
  if (![refund.reference, refund.providerRefundReference].filter(Boolean).includes(returnedReference) || !Number.isSafeInteger(returnedAmount) || BigInt(returnedAmount) !== BigInt(refund.amountMinor) || returnedCurrency !== String(refund.currency).toUpperCase() || (returnedTransaction && expectedTransaction && returnedTransaction !== expectedTransaction)) {
    await prisma.$transaction(async (tx: any) => {
      await tx.refund.updateMany({ where: { id: refund.id, status: { notIn: ["SUCCESS", "FAILED", "REVERSED", "REJECTED"] } }, data: { status: "REVIEW_REQUIRED", providerResponseSummary: { state: "mismatch", returnedReference: toText(returnedReference), returnedAmount: Number.isSafeInteger(returnedAmount) ? String(returnedAmount) : null, returnedCurrency: toText(returnedCurrency) } } });
      await tx.auditLog.create({ data: { userId: actorId, action: "PAYSTACK_REFUND_MISMATCH_REQUIRES_REVIEW", entity: "Refund", entityId: refund.id, metadata: { expectedReference: refund.reference, returnedReference: toText(returnedReference), returnedAmount: Number.isSafeInteger(returnedAmount) ? String(returnedAmount) : null, returnedCurrency: toText(returnedCurrency) } } });
    });
    return { final: true, status: "REVIEW_REQUIRED", error: "REFUND_AMOUNT_CURRENCY_OR_REFERENCE_MISMATCH" };
  }
  const providerStatus = String(providerRefund.status || "").toLowerCase();
  if (PENDING_PROVIDER_STATES.has(providerStatus)) {
    await prisma.refund.updateMany({ where: { id: refund.id, status: { in: ["INITIATING", "PROCESSING", "REFUND_UNKNOWN"] } }, data: { status: "PROCESSING", providerRefundReference: returnedReference, providerResponseSummary: { status: providerStatus, providerRefundId: toText(providerRefund.id) } } });
    return { final: false, status: "PROCESSING" };
  }
  const target = ["processed", "success", "completed"].includes(providerStatus) ? "SUCCESS" : ["failed", "rejected", "abandoned"].includes(providerStatus) ? "FAILED" : providerStatus === "reversed" ? "REVERSED" : null;
  if (!target) return { final: false, status: "RETRYABLE", error: "Unknown Paystack refund state" };

  return prisma.$transaction(async (tx: any) => {
    const current: any = await tx.refund.findUnique({ where: { id: refund.id }, include: { payment: true } });
    if (!current) throw new Error("REFUND_NOT_FOUND");
    if (current.status === target) return { final: true, status: target, duplicate: true };
    if (target === "REVERSED" && current.status !== "SUCCESS") {
      await tx.refund.update({ where: { id: current.id }, data: { status: "REVIEW_REQUIRED", providerResponseSummary: { status: providerStatus, reason: "refund reversal arrived before confirmed refund success" } } });
      return { final: true, status: "REVIEW_REQUIRED", error: "REFUND_REVERSAL_STATE_CONFLICT" };
    }
    if (target !== "REVERSED" && !["INITIATING", "PROCESSING", "REFUND_UNKNOWN"].includes(current.status)) {
      await tx.refund.update({ where: { id: current.id }, data: { status: "REVIEW_REQUIRED", providerResponseSummary: { status: providerStatus, reason: `unexpected local state ${current.status}` } } });
      return { final: true, status: "REVIEW_REQUIRED", error: "REFUND_STATE_CONFLICT" };
    }

    await tx.refund.update({ where: { id: current.id }, data: {
      status: target, providerRefundReference: returnedReference,
      providerResponseSummary: { status: providerStatus, providerRefundId: toText(providerRefund.id), amount: String(returnedAmount), currency: returnedCurrency },
      completedAt: target === "SUCCESS" || target === "FAILED" || target === "REVERSED" ? new Date() : null,
    } });

    if (target === "SUCCESS") {
      const commissionMinor = BigInt(current.commissionReversedMinor || 0n);
      const pendingMinor = BigInt(current.sellerPendingReversedMinor || 0n);
      const payableMinor = BigInt(current.sellerPayableReversedMinor || 0n);
      if (commissionMinor + pendingMinor + payableMinor !== BigInt(current.amountMinor)) {
        await tx.refund.update({ where: { id: current.id }, data: { status: "REVIEW_REQUIRED", providerResponseSummary: { status: providerStatus, reason: "stored refund allocation does not balance" } } });
        return { final: true, status: "REVIEW_REQUIRED", error: "REFUND_ALLOCATION_UNBALANCED" };
      }
      await postJournalTx(tx, {
        idempotencyKey: `refund-success:${current.id}`, sourceType: "REFUND", sourceId: current.id, currency: current.currency,
        description: `Provider-confirmed customer refund ${current.reference}`, entryType: "REFUND_SUCCESS", refundId: current.id,
        lines: [
          ...(pendingMinor > 0n ? [{ accountCode: "SELLER_EARNINGS_PENDING", debitMinor: pendingMinor, sellerPaymentProfileId: current.sellerPaymentProfileId }] : []),
          ...(payableMinor > 0n ? [{ accountCode: "SELLER_PAYABLE", debitMinor: payableMinor, sellerPaymentProfileId: current.sellerPaymentProfileId }] : []),
          ...(commissionMinor > 0n ? [{ accountCode: "PLATFORM_COMMISSION_RECEIVABLE", debitMinor: commissionMinor }] : []),
          { accountCode: "PAYSTACK_CASH_OR_CLEARING", creditMinor: current.amountMinor, description: "Paystack-confirmed refund outflow" },
        ],
      });
      await restorePaymentStatus(tx, current.paymentId);
    } else if (target === "FAILED") {
      await restorePaymentStatus(tx, current.paymentId);
    } else if (target === "REVERSED") {
      const commissionMinor = BigInt(current.commissionReversedMinor || 0n);
      const pendingMinor = BigInt(current.sellerPendingReversedMinor || 0n);
      const payableMinor = BigInt(current.sellerPayableReversedMinor || 0n);
      await postJournalTx(tx, {
        idempotencyKey: `refund-reversed:${current.id}`, sourceType: "REFUND_REVERSAL", sourceId: current.id, currency: current.currency,
        description: `Reverse provider refund ${current.reference}`, entryType: "REFUND_REVERSED", refundId: current.id,
        lines: [
          { accountCode: "PAYSTACK_CASH_OR_CLEARING", debitMinor: current.amountMinor, description: "Paystack refund reversal returned funds" },
          ...(pendingMinor > 0n ? [{ accountCode: "SELLER_EARNINGS_PENDING", creditMinor: pendingMinor, sellerPaymentProfileId: current.sellerPaymentProfileId }] : []),
          ...(payableMinor > 0n ? [{ accountCode: "SELLER_PAYABLE", creditMinor: payableMinor, sellerPaymentProfileId: current.sellerPaymentProfileId }] : []),
          ...(commissionMinor > 0n ? [{ accountCode: "PLATFORM_COMMISSION_RECEIVABLE", creditMinor: commissionMinor }] : []),
        ],
      });
      await restorePaymentStatus(tx, current.paymentId);
    }
    await tx.auditLog.create({ data: { userId: actorId, action: `PAYSTACK_REFUND_${target}`, entity: "Refund", entityId: current.id, metadata: { reference: current.reference, providerRefundReference: returnedReference, providerStatus } } });
    return { final: true, status: target };
  }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
}

export { reverseAllocation, paymentNetRefunded, restorePaymentStatus, ACTIVE_REFUND_STATES };
