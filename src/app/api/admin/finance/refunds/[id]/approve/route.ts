import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaystackRefund, getPaystackRefundByReference } from "@/lib/paystack";
import { applyVerifiedPaystackRefund, markRefundUnknown, paymentNetRefunded, restorePaymentStatus, reverseAllocation } from "@/lib/payments/paystack-refunds";
import { getSellerLedgerBalanceInTransaction } from "@/lib/payments/seller-ledger";

async function ledgerBalance(tx: any, accountCode: string, currency: string) {
  const entries = await tx.financialLedgerEntry.findMany({ where: { accountCode, currency }, select: { debitMinor: true, creditMinor: true } });
  return entries.reduce((balance: bigint, entry: any) => balance + BigInt(entry.creditMinor) - BigInt(entry.debitMinor), 0n);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const actorId = String((session.user as any).id || "");
  const { id } = await params;
  const body: any = await req.json().catch(() => ({}));
  const action = String(body.action || "approve").toLowerCase();

  if (action === "reject") {
    try {
      const result = await prisma.$transaction(async (tx: any) => {
        const refund: any = await tx.refund.findUnique({ where: { id } });
        if (!refund) throw new Error("REFUND_NOT_FOUND");
        if (refund.status === "REJECTED") return { refund, duplicate: true };
        if (!["REQUESTED", "AWAITING_SECOND_APPROVAL", "REVIEW_REQUIRED"].includes(refund.status) || refund.initiatedAt) throw new Error("REFUND_NOT_REJECTABLE_AFTER_PROVIDER_SUBMISSION");
        const updated = await tx.refund.update({ where: { id }, data: { status: "REJECTED", providerResponseSummary: { reason: String(body.reason || "Rejected by administrator").slice(0, 200) } } });
        await restorePaymentStatus(tx, refund.paymentId);
        await tx.auditLog.create({ data: { userId: actorId, action: "ADMIN_REJECTED_REFUND", entity: "Refund", entityId: id, metadata: { reference: refund.reference, reason: String(body.reason || "").slice(0, 200) } } });
        return { refund: updated, duplicate: false };
      }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
      return NextResponse.json({ ok: true, item: { id: result.refund.id, status: result.refund.status }, duplicate: result.duplicate });
    } catch (error: any) {
      return NextResponse.json({ error: String(error?.message || "REFUND_REJECTION_FAILED") }, { status: error?.message === "REFUND_NOT_FOUND" ? 404 : 409 });
    }
  }
  if (action !== "approve") return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });

  let approval: any;
  try {
    approval = await prisma.$transaction(async (tx: any) => {
      const refund: any = await tx.refund.findUnique({ where: { id }, include: { payment: { include: { obligation: true, commissionAllocations: true } }, sellerPaymentProfile: true } });
      if (!refund) throw new Error("REFUND_NOT_FOUND");
      if (refund.status === "REQUESTED" && !refund.approvedByUserId) {
        const changed = await tx.refund.updateMany({ where: { id, status: "REQUESTED", approvedByUserId: null }, data: { status: "AWAITING_SECOND_APPROVAL", approvedByUserId: actorId, requiresSecondApproval: true } });
        if (changed.count !== 1) throw new Error("REFUND_STATE_CHANGED");
        await tx.auditLog.create({ data: { userId: actorId, action: "ADMIN_FIRST_APPROVAL_REFUND", entity: "Refund", entityId: id, metadata: { reference: refund.reference, requiresDistinctSecondApprover: true } } });
        return { stage: "AWAITING_SECOND_APPROVAL", refundId: id, reference: refund.reference };
      }
      if (refund.status !== "AWAITING_SECOND_APPROVAL" || !refund.approvedByUserId || refund.approvedByUserId === actorId || refund.secondApprovedByUserId) throw new Error(refund.approvedByUserId === actorId ? "SECOND_APPROVER_MUST_BE_DIFFERENT_ADMIN" : "REFUND_NOT_AWAITING_SECOND_APPROVAL");
      if (refund.payment.status !== "REFUND_PENDING" || !refund.payment.providerTransactionId) throw new Error("PAYMENT_NOT_READY_FOR_REFUND");
      const obligation = refund.payment.obligation;
      if (!obligation || obligation.settlementPolicySnapshot !== "CONTROLLED_PAYOUT") {
        await tx.refund.update({ where: { id }, data: { status: "REVIEW_REQUIRED", providerResponseSummary: { state: "manual_review", reason: "Automated refunds are restricted to controlled-payout obligations until seller split recovery is reconciled" } } });
        await tx.auditLog.create({ data: { userId: actorId, action: "REFUND_REQUIRES_MANUAL_RECOVERY_REVIEW", entity: "Refund", entityId: id, metadata: { reference: refund.reference, settlementRoute: obligation?.settlementPolicySnapshot || "missing" } } });
        return { stage: "REVIEW_REQUIRED", refundId: id, reference: refund.reference };
      }
      const allocation: any = refund.payment.commissionAllocations?.[0];
      if (!allocation || !refund.sellerPaymentProfile) throw new Error("REFUND_ALLOCATION_OR_SELLER_PROFILE_MISSING");
      const alreadyRefunded = await paymentNetRefunded(tx, refund.paymentId);
      const gross = BigInt(refund.payment.amountMinor || 0n);
      const amount = BigInt(refund.amountMinor);
      if (alreadyRefunded < 0n || amount <= 0n || alreadyRefunded + amount > gross) throw new Error("REFUND_EXCEEDS_REMAINING_PAYMENT");
      const allocationShare = reverseAllocation(gross, BigInt(allocation.commissionAmountMinor), alreadyRefunded, amount);
      const pendingBalance = await getSellerLedgerBalanceInTransaction(tx, refund.sellerPaymentProfileId, "SELLER_EARNINGS_PENDING", refund.currency);
      const payableBalance = await getSellerLedgerBalanceInTransaction(tx, refund.sellerPaymentProfileId, "SELLER_PAYABLE", refund.currency);
      if (pendingBalance < 0n || payableBalance < 0n || pendingBalance + payableBalance < allocationShare.sellerMinor) throw new Error("SELLER_REFUND_FUNDS_REQUIRE_MANUAL_RECOVERY");
      const commissionBalance = await ledgerBalance(tx, "PLATFORM_COMMISSION_RECEIVABLE", refund.currency);
      if (commissionBalance < allocationShare.commissionMinor) throw new Error("COMMISSION_REFUND_FUNDS_REQUIRE_MANUAL_REVIEW");
      const sellerPendingReversedMinor = pendingBalance < allocationShare.sellerMinor ? pendingBalance : allocationShare.sellerMinor;
      const sellerPayableReversedMinor = allocationShare.sellerMinor - sellerPendingReversedMinor;
      const changed = await tx.refund.updateMany({ where: { id, status: "AWAITING_SECOND_APPROVAL", secondApprovedByUserId: null, approvedByUserId: { not: actorId } }, data: {
        status: "INITIATING", secondApprovedByUserId: actorId, secondApprovedAt: new Date(), initiatedAt: new Date(),
        commissionReversedMinor: allocationShare.commissionMinor, sellerReversedMinor: allocationShare.sellerMinor,
        sellerPendingReversedMinor, sellerPayableReversedMinor,
      } });
      if (changed.count !== 1) throw new Error("REFUND_STATE_CHANGED");
      await tx.auditLog.create({ data: { userId: actorId, action: "ADMIN_SECOND_APPROVAL_REFUND", entity: "Refund", entityId: id, metadata: { reference: refund.reference, firstApproverId: refund.approvedByUserId, amountMinor: amount.toString(), commissionMinor: allocationShare.commissionMinor.toString(), sellerMinor: allocationShare.sellerMinor.toString(), transferLock: true } } });
      return { stage: "INITIATING", refundId: id, reference: refund.reference, amountMinor: amount, currency: refund.currency, transactionId: refund.payment.providerTransactionId };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
  } catch (error: any) {
    const message = String(error?.message || "REFUND_APPROVAL_FAILED");
    const status = message === "REFUND_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }

  if (approval.stage === "AWAITING_SECOND_APPROVAL") return NextResponse.json({ ok: true, item: approval, message: "First approval recorded. A different administrator must approve before contacting Paystack." });
  if (approval.stage === "REVIEW_REQUIRED") return NextResponse.json({ ok: true, item: approval, message: "This settlement route requires manual recovery/reconciliation. No Paystack refund request was sent." }, { status: 202 });

  try {
    const created: any = await createPaystackRefund({ transaction: String(approval.transactionId), amountMinor: BigInt(approval.amountMinor), reference: approval.reference, customerNote: "World of Tailors refund", merchantNote: `Approved refund ${approval.reference}` });
    await prisma.refund.updateMany({ where: { id, status: "INITIATING" }, data: { status: "PROCESSING", providerRefundReference: String(created.refund_reference || approval.reference), providerResponseSummary: { status: String(created.status || "accepted"), providerRefundId: created.id == null ? null : String(created.id) } } });
    const matches: any = await getPaystackRefundByReference(approval.reference);
    const records = Array.isArray(matches) ? matches : Array.isArray(matches?.data) ? matches.data : [];
    const verifiedRefund = records.find((record: any) => String(record.reference || record.refund_reference || "") === approval.reference || String(record.refund_reference || "") === String(created.refund_reference || ""));
    if (!verifiedRefund) {
      await markRefundUnknown(id, actorId, "Paystack accepted the request but refund status could not yet be matched; verify this same reference");
      return NextResponse.json({ ok: false, item: { id, reference: approval.reference, status: "REFUND_UNKNOWN" }, message: "No duplicate refund was sent. Verify the existing provider reference before taking further action." }, { status: 202 });
    }
    const result = await applyVerifiedPaystackRefund(approval.reference, verifiedRefund, actorId);
    return NextResponse.json({ ok: true, item: { id, reference: approval.reference, status: result.status }, message: result.status === "SUCCESS" ? "Paystack verified refund success and the immutable ledger was reversed." : result.status === "FAILED" ? "Paystack verified refund failure; payment state is restored." : "Refund is not confirmed final; it remains under provider status review." }, { status: 202 });
  } catch {
    await markRefundUnknown(id, actorId).catch(() => {});
    return NextResponse.json({ ok: false, item: { id, reference: approval.reference, status: "REFUND_UNKNOWN" }, error: "REFUND_STATUS_UNKNOWN", message: "Provider request or verification is inconclusive. Do not retry with a new reference; verify this same refund reference." }, { status: 202 });
  }
}
