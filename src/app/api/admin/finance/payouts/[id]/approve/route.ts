import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";
import { initiatePaystackTransfer, verifyPaystackTransfer } from "@/lib/paystack";
import { applyVerifiedPaystackTransfer, markPayoutTransferUnknown } from "@/lib/payments/paystack-transfers";
import { postJournalTx } from "@/lib/payments/ledger-db";

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
      const rejected = await prisma.$transaction(async (tx: any) => {
        const payout: any = await tx.payout.findUnique({ where: { id } });
        if (!payout) throw new Error("PAYOUT_NOT_FOUND");
        if (payout.status === "REJECTED") return payout;
        if (!["REQUESTED", "AWAITING_SECOND_APPROVAL"].includes(payout.status)) throw new Error("PAYOUT_NOT_REJECTABLE");
        await tx.payout.update({ where: { id }, data: { status: "REJECTED", failureReason: String(body.reason || "Rejected by administrator").slice(0, 220) } });
        await postJournalTx(tx, {
          idempotencyKey: `payout-rejected-release:${payout.id}`, sourceType: "PAYOUT_REJECTED", sourceId: payout.id,
          currency: payout.currency, description: `Release payable following rejection of payout ${payout.reference}`,
          entryType: "PAYOUT_REJECTED_RELEASE", payoutId: payout.id, createdById: actorId,
          lines: [
            { accountCode: "SELLER_PAYOUTS_PROCESSING", debitMinor: payout.amountMinor, sellerPaymentProfileId: payout.sellerPaymentProfileId },
            { accountCode: "SELLER_PAYABLE", creditMinor: payout.amountMinor, sellerPaymentProfileId: payout.sellerPaymentProfileId },
          ],
        });
        await tx.auditLog.create({ data: { userId: actorId, action: "ADMIN_REJECTED_PAYOUT", entity: "Payout", entityId: payout.id, metadata: { reference: payout.reference, reason: String(body.reason || "").slice(0, 200) } } });
        return { ...payout, status: "REJECTED" };
      }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
      return NextResponse.json({ ok: true, item: { id: rejected.id, status: rejected.status } });
    } catch (error: any) {
      return NextResponse.json({ error: String(error?.message || "PAYOUT_REJECTION_FAILED") }, { status: error?.message === "PAYOUT_NOT_FOUND" ? 404 : 409 });
    }
  }
  if (action !== "approve") return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });

  let config;
  try { config = getPaymentRuntimeConfig(); }
  catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }
  if (!config.controlledPayoutsEnabled) return NextResponse.json({ error: "CONTROLLED_PAYOUTS_DISABLED", message: "Paystack and business approval gates must both be configured." }, { status: 409 });

  let approval: any;
  try {
    approval = await prisma.$transaction(async (tx: any) => {
      const payout: any = await tx.payout.findUnique({ where: { id }, include: { sellerPaymentProfile: true } });
      if (!payout) throw new Error("PAYOUT_NOT_FOUND");
      const profile = payout.sellerPaymentProfile;
      if (!profile || profile.settlementPolicy !== "CONTROLLED_PAYOUT" || profile.verificationStatus !== "VERIFIED" || !profile.payoutEligible || profile.suspendedAt || !profile.paystackTransferRecipientCode) throw new Error("SELLER_PAYOUT_PROFILE_NOT_ELIGIBLE");
      if (payout.recipientCode !== profile.paystackTransferRecipientCode) throw new Error("PAYOUT_RECIPIENT_CHANGED_REVIEW_REQUIRED");
      if (payout.status === "REQUESTED" && !payout.approvedByUserId) {
        const updated = await tx.payout.updateMany({ where: { id, status: "REQUESTED", approvedByUserId: null }, data: { status: "AWAITING_SECOND_APPROVAL", approvedByUserId: actorId, approvedAt: new Date(), requiresSecondApproval: true } });
        if (updated.count !== 1) throw new Error("PAYOUT_STATE_CHANGED");
        await tx.auditLog.create({ data: { userId: actorId, action: "ADMIN_FIRST_APPROVAL_PAYOUT", entity: "Payout", entityId: id, metadata: { reference: payout.reference, requiresDistinctSecondApprover: true } } });
        return { stage: "AWAITING_SECOND_APPROVAL", payoutId: id, reference: payout.reference };
      }
      if (payout.status !== "AWAITING_SECOND_APPROVAL" || !payout.approvedByUserId || payout.approvedByUserId === actorId || payout.secondApprovedByUserId) throw new Error(payout.approvedByUserId === actorId ? "SECOND_APPROVER_MUST_BE_DIFFERENT_ADMIN" : "PAYOUT_NOT_AWAITING_SECOND_APPROVAL");
      const updated = await tx.payout.updateMany({ where: { id, status: "AWAITING_SECOND_APPROVAL", secondApprovedByUserId: null, approvedByUserId: { not: actorId } }, data: { status: "INITIATING", secondApprovedByUserId: actorId, secondApprovedAt: new Date(), initiatedAt: new Date() } });
      if (updated.count !== 1) throw new Error("PAYOUT_STATE_CHANGED");
      await tx.auditLog.create({ data: { userId: actorId, action: "ADMIN_SECOND_APPROVAL_PAYOUT", entity: "Payout", entityId: id, metadata: { reference: payout.reference, firstApproverId: payout.approvedByUserId, transferStartLocked: true } } });
      return { stage: "INITIATING", payoutId: id, reference: payout.reference, amountMinor: BigInt(payout.amountMinor), currency: payout.currency, recipientCode: payout.recipientCode };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
  } catch (error: any) {
    const message = String(error?.message || "PAYOUT_APPROVAL_FAILED");
    const status = message === "PAYOUT_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }

  if (approval.stage === "AWAITING_SECOND_APPROVAL") return NextResponse.json({ ok: true, item: approval, message: "First approval recorded. A different administrator must approve before the provider transfer can begin." });

  try {
    const initiated: any = await initiatePaystackTransfer({ amountMinor: approval.amountMinor, recipientCode: approval.recipientCode, reference: approval.reference, reason: `World of Tailors seller payout ${approval.reference}` });
    await prisma.payout.updateMany({ where: { id, status: "INITIATING" }, data: { status: "PROCESSING", providerTransferId: String(initiated.transfer_code || initiated.id || "") || null, failureReason: null } });
    await prisma.auditLog.create({ data: { userId: actorId, action: "PAYSTACK_PAYOUT_TRANSFER_SUBMITTED", entity: "Payout", entityId: id, metadata: { reference: approval.reference, providerTransferId: String(initiated.transfer_code || initiated.id || ""), providerStatus: String(initiated.status || "unknown") } } });
    const verified = await verifyPaystackTransfer(approval.reference);
    const applied = await applyVerifiedPaystackTransfer(approval.reference, verified);
    return NextResponse.json({ ok: true, item: { id, reference: approval.reference, status: applied.status }, message: applied.status === "SUCCESS" ? "Paystack verified the transfer as successful." : applied.status === "FAILED" ? "Paystack verified the transfer as failed; the ledger reserve was released." : "Transfer was accepted but is not confirmed successful. Status remains provider-pending." }, { status: 202 });
  } catch (error) {
    await markPayoutTransferUnknown(id, actorId).catch(() => {});
    return NextResponse.json({ ok: false, item: { id, reference: approval.reference, status: "TRANSFER_UNKNOWN" }, error: "TRANSFER_STATUS_UNKNOWN", message: "The provider request or verification was inconclusive. Do not submit another transfer; reconcile this reference with Paystack first." }, { status: 202 });
  }
}
