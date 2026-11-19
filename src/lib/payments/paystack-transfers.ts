import { prisma } from "@/lib/prisma";
import { postJournalTx } from "@/lib/payments/ledger-db";

function text(value: unknown): string | null { return value == null ? null : String(value).slice(0, 180); }

const ACTIVE_TRANSFER_STATES = new Set(["INITIATING", "APPROVED", "PROCESSING", "TRANSFER_UNKNOWN", "AWAITING_PROVIDER"]);
const PENDING_PROVIDER_STATES = new Set(["pending", "otp", "processing", "queued", "received"]);
const FAILED_PROVIDER_STATES = new Set(["failed", "blocked", "rejected", "abandoned"]);

/** Apply only data returned by Paystack's transfer verification endpoint (never webhook body alone). */
export async function applyVerifiedPaystackTransfer(reference: string, providerTransfer: any, eventId?: string) {
  const payout: any = await prisma.payout.findUnique({ where: { reference } });
  if (!payout) return { final: true, status: "REVIEW_REQUIRED", error: "PAYOUT_NOT_FOUND" };
  if (String(providerTransfer?.reference || "") !== reference || !Number.isSafeInteger(providerTransfer?.amount) || BigInt(providerTransfer.amount) !== BigInt(payout.amountMinor) || String(providerTransfer?.currency || "").toUpperCase() !== String(payout.currency).toUpperCase()) {
    await prisma.$transaction(async (tx: any) => {
      await tx.payout.updateMany({ where: { id: payout.id, status: { notIn: ["SUCCESS", "FAILED", "REVERSED", "REJECTED"] } }, data: { status: "REVIEW_REQUIRED", failureReason: "Verified Paystack transfer amount, currency, or reference mismatch" } });
      await tx.auditLog.create({ data: { action: "PAYSTACK_TRANSFER_MISMATCH_REQUIRES_REVIEW", entity: "Payout", entityId: payout.id, metadata: { reference, eventId: eventId || null, verifiedAmount: Number.isSafeInteger(providerTransfer?.amount) ? String(providerTransfer.amount) : null, verifiedCurrency: text(providerTransfer?.currency) } } });
    });
    return { final: true, status: "REVIEW_REQUIRED", error: "TRANSFER_AMOUNT_OR_CURRENCY_MISMATCH" };
  }

  const providerStatus = String(providerTransfer.status || "").toLowerCase();
  if (PENDING_PROVIDER_STATES.has(providerStatus)) {
    await prisma.payout.updateMany({ where: { id: payout.id, status: { in: [...ACTIVE_TRANSFER_STATES] } }, data: { status: "PROCESSING", providerTransferId: text(providerTransfer.transfer_code || providerTransfer.id), failureReason: null } });
    return { final: false, status: "PROCESSING" };
  }
  const target = providerStatus === "success" ? "SUCCESS" : providerStatus === "reversed" ? "REVERSED" : FAILED_PROVIDER_STATES.has(providerStatus) ? "FAILED" : null;
  if (!target) return { final: false, status: "RETRYABLE", error: "Unknown Paystack transfer state" };

  const result = await prisma.$transaction(async (tx: any) => {
    const current: any = await tx.payout.findUnique({ where: { id: payout.id } });
    if (!current) throw new Error("PAYOUT_NOT_FOUND");
    if (current.status === target) return { final: true, status: target, duplicate: true };
    if (target === "REVERSED" && current.status === "REVERSED") return { final: true, status: target, duplicate: true };
    if (!ACTIVE_TRANSFER_STATES.has(String(current.status)) && !(target === "REVERSED" && current.status === "SUCCESS")) {
      await tx.payout.update({ where: { id: current.id }, data: { status: "REVIEW_REQUIRED", failureReason: `Unexpected current payout state ${current.status} for verified provider state ${providerStatus}` } });
      await tx.auditLog.create({ data: { action: "PAYSTACK_TRANSFER_STATE_CONFLICT", entity: "Payout", entityId: current.id, metadata: { reference, currentStatus: current.status, providerStatus, eventId: eventId || null } } });
      return { final: true, status: "REVIEW_REQUIRED", error: "PAYOUT_STATE_CONFLICT" };
    }
    await tx.payout.update({ where: { id: current.id }, data: {
      status: target,
      providerTransferId: text(providerTransfer.transfer_code || providerTransfer.id) || current.providerTransferId,
      completedAt: new Date(),
      failureReason: target === "FAILED" ? text(providerTransfer.failures || providerTransfer.gateway_response || providerStatus) : null,
      reversalReference: target === "REVERSED" ? reference : current.reversalReference,
    } });

    if (target === "SUCCESS") {
      await postJournalTx(tx, {
        idempotencyKey: `payout-success:${current.id}`, sourceType: "PAYOUT", sourceId: current.id, currency: current.currency,
        description: `Verified Paystack payout ${current.reference}`, entryType: "PAYOUT_SUCCESS", payoutId: current.id,
        lines: [
          { accountCode: "SELLER_PAYOUTS_PROCESSING", debitMinor: current.amountMinor, sellerPaymentProfileId: current.sellerPaymentProfileId },
          { accountCode: "PAYSTACK_CASH_OR_CLEARING", creditMinor: current.amountMinor, description: "Paystack confirmed successful transfer", sellerPaymentProfileId: current.sellerPaymentProfileId },
        ],
      });
    } else if (target === "FAILED") {
      await postJournalTx(tx, {
        idempotencyKey: `payout-failed-release:${current.id}`, sourceType: "PAYOUT", sourceId: current.id, currency: current.currency,
        description: `Release seller payable after verified failed transfer ${current.reference}`, entryType: "PAYOUT_FAILED_RELEASE", payoutId: current.id,
        lines: [
          { accountCode: "SELLER_PAYOUTS_PROCESSING", debitMinor: current.amountMinor, sellerPaymentProfileId: current.sellerPaymentProfileId },
          { accountCode: "SELLER_PAYABLE", creditMinor: current.amountMinor, description: "Verified failed transfer; amount returned to ledger payable", sellerPaymentProfileId: current.sellerPaymentProfileId },
        ],
      });
    } else if (target === "REVERSED") {
      await postJournalTx(tx, {
        idempotencyKey: `payout-reversed:${current.id}`, sourceType: "PAYOUT_REVERSAL", sourceId: current.id, currency: current.currency,
        description: `Reverse Paystack payout ${current.reference}`, entryType: "PAYOUT_REVERSED", payoutId: current.id,
        lines: [
          { accountCode: "PAYSTACK_CASH_OR_CLEARING", debitMinor: current.amountMinor, sellerPaymentProfileId: current.sellerPaymentProfileId },
          { accountCode: "SELLER_PAYABLE", creditMinor: current.amountMinor, description: "Verified reversed transfer; restored to ledger payable", sellerPaymentProfileId: current.sellerPaymentProfileId },
        ],
      });
    }
    await tx.auditLog.create({ data: { action: `PAYSTACK_TRANSFER_${target}`, entity: "Payout", entityId: current.id, metadata: { reference, providerTransferId: text(providerTransfer.transfer_code || providerTransfer.id), eventId: eventId || null } } });
    return { final: true, status: target };
  }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
  return result;
}

export async function markPayoutTransferUnknown(payoutId: string, actorId: string, reason = "Provider response is uncertain; verify status before any retry") {
  await prisma.$transaction(async (tx: any) => {
    await tx.payout.updateMany({ where: { id: payoutId, status: { in: ["INITIATING", "PROCESSING"] } }, data: { status: "TRANSFER_UNKNOWN", failureReason: reason } });
    await tx.auditLog.create({ data: { userId: actorId, action: "PAYOUT_TRANSFER_STATUS_UNKNOWN", entity: "Payout", entityId: payoutId, metadata: { reason: "verification required; no new transfer reference will be created" } } });
  });
}
