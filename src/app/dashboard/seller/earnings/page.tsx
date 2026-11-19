import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatNgn } from "@/lib/payments/money";
import { getSellerLedgerSnapshot } from "@/lib/payments/seller-ledger";
import { getPaymentRuntimeConfig } from "@/lib/payments/config";
import { SellerPaymentProfileForm } from "@/components/payments/SellerPaymentProfileForm";
import { PayoutRequestForm } from "@/components/payments/PayoutRequestForm";

export default async function SellerEarnings() {
  const session = await requireRole(["FABRIC_SELLER"]);
  const userId = String((session.user as any).id);
  const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (!seller) return <div className="p-6">Seller profile not found.</div>;
  const paymentProfile: any = await prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId: seller.id } });
  const [snapshot, allocations, payouts] = paymentProfile ? await Promise.all([
    getSellerLedgerSnapshot(prisma, paymentProfile.id, paymentProfile.currency || "NGN"),
    prisma.commissionAllocation.findMany({ where: { sellerProfileId: seller.id }, include: { payment: { select: { reference: true, status: true, createdAt: true, fabricOrder: { select: { reference: true } } } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.payout.findMany({ where: { sellerProfileId: seller.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]) : [{ fulfilmentPendingMinor: 0n, payableMinor: 0n, processingMinor: 0n, providerSplitAllocatedUnreconciledMinor: 0n, paidOutMinor: 0n }, [], []] as any;
  let configReady = false;
  try { configReady = getPaymentRuntimeConfig().controlledPayoutsEnabled; } catch {}
  const payoutEligible = Boolean(paymentProfile?.payoutEligible && paymentProfile.settlementPolicy === "CONTROLLED_PAYOUT" && paymentProfile.verificationStatus === "VERIFIED" && !paymentProfile.suspendedAt && configReady);
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-2xl">Earnings — {seller.businessName}</h1><p className="text-sm text-muted-foreground">Ledger-backed entries only. A paid customer charge is not itself a completed payout or evidence of provider settlement.</p></div><Link href="/dashboard/seller/orders" className="text-sm underline">Manage orders</Link></div>
    <Card><CardHeader><CardTitle className="text-sm">Bank verification & settlement profile</CardTitle></CardHeader><CardContent><SellerPaymentProfileForm /></CardContent></Card>
    {!paymentProfile && <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm">No payment profile exists yet. Verify the seller-owned bank account before requesting administrator-approved settlement setup.</div>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {[["Awaiting customer-confirmed fulfilment", snapshot.fulfilmentPendingMinor], ["Ledger payable", snapshot.payableMinor], ["Payout processing", snapshot.processingMinor], ["Verified transfers paid", snapshot.paidOutMinor], ["Provider split allocation — unreconciled", snapshot.providerSplitAllocatedUnreconciledMinor]].map(([label, amount]: any) => <Card key={label}><CardHeader><CardTitle className="text-xs">{label}</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{formatNgn(amount)}</CardContent></Card>)}
    </div>
    <Card><CardHeader><CardTitle className="text-sm">Request a controlled payout</CardTitle></CardHeader><CardContent className="space-y-2"><PayoutRequestForm profileId={paymentProfile?.id || "none"} eligible={payoutEligible} /><p className="text-[11px] text-muted-foreground">Requests are capped by verified ledger payable; they are reserved in the ledger and need approval from two different administrators. This platform is not representing the process as escrow.</p></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-sm">Fabric commission allocations</CardTitle></CardHeader><CardContent className="space-y-2">{allocations.length ? allocations.map((row: any) => <div key={row.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-xs"><span>{row.payment.fabricOrder?.reference || row.payment.reference} • {row.payment.status} • rate {row.rateBps / 100}%</span><span>Gross {formatNgn(row.grossAmountMinor)} · Commission {formatNgn(row.commissionAmountMinor)} · Seller allocation {formatNgn(row.sellerAmountMinor)}</span></div>) : <p className="text-sm text-muted-foreground">No verified commission allocations yet.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-sm">Payout history</CardTitle></CardHeader><CardContent className="space-y-2">{payouts.length ? payouts.map((row: any) => <div key={row.id} className="flex justify-between gap-2 border-b py-2 text-xs"><span>{row.reference} • {row.status}{row.failureReason ? ` • ${row.failureReason}` : ""}</span><span>{formatNgn(row.amountMinor)} · {new Date(row.createdAt).toLocaleDateString()}</span></div>) : <p className="text-sm text-muted-foreground">No payout requests recorded.</p>}</CardContent></Card>
  </div>;
}
