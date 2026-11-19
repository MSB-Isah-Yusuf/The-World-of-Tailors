import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentReadinessSummary } from "@/lib/payments/config";
import { getSellerLedgerSnapshot } from "@/lib/payments/seller-ledger";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const items: any[] = await prisma.sellerPaymentProfile.findMany({ include: {
    tailorProfile: { select: { id: true, businessName: true, user: { select: { email: true } } } },
    sellerProfile: { select: { id: true, businessName: true, user: { select: { email: true } } } },
  }, orderBy: { updatedAt: "desc" }, take: 200 });
  const ledgerSnapshots = await Promise.all(items.map(async (item) => [item.id, await getSellerLedgerSnapshot(prisma, item.id, item.currency || "NGN").catch(() => null)] as const));
  const ledgerByProfile = new Map(ledgerSnapshots);
  return NextResponse.json({ items: items.map((item) => ({
    id: item.id, sellerType: item.sellerType, businessName: item.tailorProfile?.businessName || item.sellerProfile?.businessName,
    email: item.tailorProfile?.user.email || item.sellerProfile?.user.email,
    bankName: item.bankName, bankCode: item.bankCode, accountHolderName: item.accountHolderName,
    maskedAccountNumber: item.maskedAccountNumber, currency: item.currency,
    verificationStatus: item.verificationStatus, payoutEligible: item.payoutEligible, settlementPolicy: item.settlementPolicy,
    subaccountActive: item.subaccountActive, hasSubaccount: Boolean(item.paystackSubaccountCode), hasTransferRecipient: Boolean(item.paystackTransferRecipientCode),
    suspendedAt: item.suspendedAt, updatedAt: item.updatedAt,
    ledger: Object.fromEntries(Object.entries(ledgerByProfile.get(item.id) || {}).filter(([key]) => key !== "currency").map(([key, value]) => [key, String(value)])),
    hasLegacySummaryRow: false,
  })), readiness: paymentReadinessSummary() });
}
