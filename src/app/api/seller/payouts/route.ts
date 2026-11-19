import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";
import { getSellerLedgerBalanceInTransaction, getSellerLedgerSnapshot } from "@/lib/payments/seller-ledger";
import { postJournalTx } from "@/lib/payments/ledger-db";

async function ownPaymentProfile(userId: string, role: string) {
  if (role === "TAILOR") {
    const profile = await prisma.tailorProfile.findUnique({ where: { userId }, select: { id: true } });
    return profile ? prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId: profile.id } }) : null;
  }
  if (role === "FABRIC_SELLER") {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId }, select: { id: true } });
    return profile ? prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId: profile.id } }) : null;
  }
  return null;
}

function eligible(profile: any, config: ReturnType<typeof getPaymentRuntimeConfig>) {
  return !!profile && profile.sellerType && profile.verificationStatus === "VERIFIED" && profile.payoutEligible && !profile.suspendedAt && profile.settlementPolicy === "CONTROLLED_PAYOUT" && !!profile.paystackTransferRecipientCode && config.controlledPayoutsEnabled;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = String((session.user as any).id || "");
  const profile: any = await ownPaymentProfile(userId, String((session.user as any).role || ""));
  if (!profile) return NextResponse.json({ item: null, payouts: [], error: "PAYMENT_PROFILE_NOT_FOUND" }, { status: 404 });
  const [snapshot, payouts] = await Promise.all([
    getSellerLedgerSnapshot(prisma, profile.id, profile.currency || "NGN"),
    prisma.payout.findMany({ where: { sellerPaymentProfileId: profile.id }, orderBy: { requestedAt: "desc" }, take: 50, select: { id: true, amountMinor: true, currency: true, reference: true, status: true, requestedAt: true, approvedAt: true, completedAt: true, failureReason: true } }),
  ]);
  let controlledPayoutsEnabled = false;
  try { controlledPayoutsEnabled = getPaymentRuntimeConfig().controlledPayoutsEnabled; }
  catch {}
  return NextResponse.json({ item: {
    sellerPaymentProfileId: profile.id, verificationStatus: profile.verificationStatus, settlementPolicy: profile.settlementPolicy,
    payoutEligible: profile.payoutEligible, suspended: !!profile.suspendedAt, maskedAccountNumber: profile.maskedAccountNumber,
    bankName: profile.bankName, currency: profile.currency, controlledPayoutsEnabled, eligible: (() => { try { return eligible(profile, getPaymentRuntimeConfig()); } catch { return false; } })(),
    ledger: Object.fromEntries(Object.entries(snapshot).filter(([key]) => key !== "currency").map(([key, value]) => [key, String(value)])),
  }, payouts: payouts.map((payout: any) => ({ ...payout, amountMinor: String(payout.amountMinor) })) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = String((session.user as any).id || "");
  const role = String((session.user as any).role || "");
  if (!["TAILOR", "FABRIC_SELLER"].includes(role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const clientRequestId = String(req.headers.get("idempotency-key") || "").trim();
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(clientRequestId)) return NextResponse.json({ error: "IDEMPOTENCY_KEY_REQUIRED", message: "Send a random Idempotency-Key (16–100 safe characters) and reuse it for retries." }, { status: 400 });
  const body: any = await req.json().catch(() => ({}));
  const amountText = String(body.amountMinor || "");
  if (!/^\d{1,18}$/.test(amountText) || BigInt(amountText) <= 0n) return NextResponse.json({ error: "INVALID_PAYOUT_AMOUNT", message: "amountMinor must be a positive integer in kobo." }, { status: 400 });
  const amountMinor = BigInt(amountText);
  if (!Number.isSafeInteger(Number(amountMinor))) return NextResponse.json({ error: "INVALID_PAYOUT_AMOUNT", message: "Amount is outside the safe minor-unit range supported by Paystack." }, { status: 400 });

  let config;
  try { config = getPaymentRuntimeConfig(); }
  catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }
  const profile: any = await ownPaymentProfile(userId, role);
  if (!profile) return NextResponse.json({ error: "PAYMENT_PROFILE_NOT_FOUND" }, { status: 409 });
  if (!eligible(profile, config)) return NextResponse.json({ error: "CONTROLLED_PAYOUT_NOT_ELIGIBLE", message: "A controlled payout requires administrator-approved settlement, verified bank/provider recipient setup, and enabled provider/business gates." }, { status: 409 });
  const existing: any = await prisma.payout.findUnique({ where: { clientRequestId } });
  if (existing) {
    if (existing.sellerPaymentProfileId !== profile.id || existing.requestedByUserId !== userId) return NextResponse.json({ error: "IDEMPOTENCY_KEY_CONFLICT" }, { status: 409 });
    return NextResponse.json({ ok: true, reused: true, payout: { id: existing.id, reference: existing.reference, amountMinor: String(existing.amountMinor), currency: existing.currency, status: existing.status } });
  }

  try {
    const payout: any = await prisma.$transaction(async (tx: any) => {
      const duplicate = await tx.payout.findUnique({ where: { clientRequestId } });
      if (duplicate) {
        if (duplicate.sellerPaymentProfileId !== profile.id || duplicate.requestedByUserId !== userId) throw new Error("IDEMPOTENCY_KEY_CONFLICT");
        return duplicate;
      }
      const currentProfile: any = await tx.sellerPaymentProfile.findUnique({ where: { id: profile.id } });
      if (!currentProfile || !eligible(currentProfile, config)) throw new Error("PAYOUT_ELIGIBILITY_CHANGED");
      const openRefund = await tx.refund.findFirst({ where: { sellerPaymentProfileId: profile.id, status: { in: ["REQUESTED", "AWAITING_SECOND_APPROVAL", "INITIATING", "PROCESSING", "REFUND_UNKNOWN", "REVIEW_REQUIRED"] } }, select: { id: true } });
      if (openRefund) throw new Error("SELLER_FINANCIAL_REVIEW_HOLD");
      const openDispute = await tx.paymentDispute.findFirst({ where: { sellerPaymentProfileId: profile.id, status: { in: ["OPEN", "UNDER_REVIEW", "REVIEW_REQUIRED"] } }, select: { id: true } });
      if (openDispute) throw new Error("SELLER_FINANCIAL_REVIEW_HOLD");
      const availableMinor = await getSellerLedgerBalanceInTransaction(tx, profile.id, "SELLER_PAYABLE", profile.currency || "NGN");
      if (availableMinor < amountMinor) throw new Error("INSUFFICIENT_LEDGER_PAYABLE");
      const reference = `twtpay_${nanoid(28).toLowerCase()}`;
      const row = await tx.payout.create({ data: {
        sellerPaymentProfileId: profile.id,
        tailorProfileId: profile.tailorProfileId,
        sellerProfileId: profile.sellerProfileId,
        amountMinor, currency: profile.currency || "NGN", reference, clientRequestId,
        recipientCode: profile.paystackTransferRecipientCode,
        status: "REQUESTED", requestedByUserId: userId, requiresSecondApproval: true,
      } });
      await postJournalTx(tx, {
        idempotencyKey: `payout-request:${clientRequestId}`, sourceType: "PAYOUT_REQUEST", sourceId: row.id,
        currency: row.currency, description: `Reserve ledger payable for payout request ${reference}`,
        entryType: "PAYOUT_REQUEST", payoutId: row.id, createdById: userId,
        lines: [
          { accountCode: "SELLER_PAYABLE", debitMinor: amountMinor, description: "Seller-requested payout reserve; awaiting two-person approval", sellerPaymentProfileId: profile.id },
          { accountCode: "SELLER_PAYOUTS_PROCESSING", creditMinor: amountMinor, description: "Payout reserve; transfer not yet initiated", sellerPaymentProfileId: profile.id },
        ],
      });
      await tx.auditLog.create({ data: { userId, action: "SELLER_PAYOUT_REQUESTED", entity: "Payout", entityId: row.id, metadata: { reference, amountMinor: amountMinor.toString(), currency: row.currency, clientRequestId } } });
      return row;
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
    return NextResponse.json({ ok: true, reused: false, payout: { id: payout.id, reference: payout.reference, amountMinor: String(payout.amountMinor), currency: payout.currency, status: payout.status, requiresSecondApproval: true } }, { status: 201 });
  } catch (error: any) {
    const message = String(error?.message || "PAYOUT_REQUEST_FAILED");
    if (message === "IDEMPOTENCY_KEY_CONFLICT") return NextResponse.json({ error: message }, { status: 409 });
    if (message === "INSUFFICIENT_LEDGER_PAYABLE") return NextResponse.json({ error: message, message: "Requested amount exceeds the seller's ledger payable balance." }, { status: 409 });
    if (message === "SELLER_FINANCIAL_REVIEW_HOLD") return NextResponse.json({ error: message, message: "A refund or payment dispute is open for this seller. Payout requests are paused until review is complete." }, { status: 409 });
    if (message === "PAYOUT_ELIGIBILITY_CHANGED") return NextResponse.json({ error: message }, { status: 409 });
    if (error?.code === "P2034" || error?.code === "P2002") return NextResponse.json({ error: "PAYOUT_REQUEST_CONFLICT", message: "A concurrent request may have changed the ledger; refresh before retrying with the same Idempotency-Key." }, { status: 409 });
    console.error("[seller-payout-request] failed", message.slice(0, 80));
    return NextResponse.json({ error: "PAYOUT_REQUEST_FAILED" }, { status: 500 });
  }
}
