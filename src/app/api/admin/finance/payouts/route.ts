import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaymentRuntimeConfig, paymentReadinessSummary } from "@/lib/payments/config";
import { getSellerLedgerSnapshot } from "@/lib/payments/seller-ledger";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const payouts: any[] = await prisma.payout.findMany({
    include: {
      sellerPaymentProfile: { include: { tailorProfile: { select: { businessName: true, user: { select: { email: true } } } }, sellerProfile: { select: { businessName: true, user: { select: { email: true } } } } } },
      requestedBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      secondApprovedBy: { select: { id: true, name: true, email: true } },
    }, orderBy: { requestedAt: "desc" }, take: 200,
  });
  const profileIds = [...new Set(payouts.map((payout) => payout.sellerPaymentProfileId))];
  const snapshots = await Promise.all(profileIds.map(async (id) => [id, await getSellerLedgerSnapshot(prisma, id).catch(() => null)] as const));
  const byProfile = new Map(snapshots);
  let config: any = null;
  try { config = getPaymentRuntimeConfig(); } catch {}
  return NextResponse.json({ items: payouts.map((payout) => {
    const profile = payout.sellerPaymentProfile;
    return {
      id: payout.id, reference: payout.reference, amountMinor: String(payout.amountMinor), currency: payout.currency,
      status: payout.status, requestedAt: payout.requestedAt, approvedAt: payout.approvedAt, initiatedAt: payout.initiatedAt,
      completedAt: payout.completedAt, failureReason: payout.failureReason, providerTransferId: payout.providerTransferId,
      requiresSecondApproval: payout.requiresSecondApproval, requestedBy: payout.requestedBy, approvedBy: payout.approvedBy,
      secondApprovedBy: payout.secondApprovedBy, recipientPresent: Boolean(payout.recipientCode),
      sellerPaymentProfileId: profile.id, sellerType: profile.sellerType,
      businessName: profile.tailorProfile?.businessName || profile.sellerProfile?.businessName,
      email: profile.tailorProfile?.user?.email || profile.sellerProfile?.user?.email,
      maskedAccountNumber: profile.maskedAccountNumber, bankName: profile.bankName,
      verificationStatus: profile.verificationStatus, settlementPolicy: profile.settlementPolicy,
      payoutEligible: profile.payoutEligible, suspended: Boolean(profile.suspendedAt),
      ledger: Object.fromEntries(Object.entries(byProfile.get(profile.id) || {}).filter(([key]) => key !== "currency").map(([key, value]) => [key, String(value)])),
    };
  }), readiness: paymentReadinessSummary(), payoutGateEnabled: !!config?.controlledPayoutsEnabled });
}
