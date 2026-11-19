import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNgn } from "@/lib/payments/money";
import { getSellerLedgerSnapshot } from "@/lib/payments/seller-ledger";
import { getPaymentRuntimeConfig } from "@/lib/payments/config";
import { SellerPaymentProfileForm } from "@/components/payments/SellerPaymentProfileForm";
import { PayoutRequestForm } from "@/components/payments/PayoutRequestForm";

export default async function TailorEarningsPage() {
  const session = await requireRole(["TAILOR"]);
  const userId = String((session.user as any).id);
  const profile = await prisma.tailorProfile.findUnique({ where: { userId } });
  if (!profile) return <div className="p-6">Tailor profile not found.</div>;
  const paymentProfile: any = await prisma.sellerPaymentProfile.findUnique({ where: { tailorProfileId: profile.id } });
  const [snapshot, allocations, payouts] = paymentProfile ? await Promise.all([
    getSellerLedgerSnapshot(prisma, paymentProfile.id, paymentProfile.currency || "NGN"),
    prisma.commissionAllocation.findMany({ where: { tailorProfileId: profile.id }, include: { payment: { select: { reference: true, status: true, createdAt: true, booking: { select: { reference: true } } } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.payout.findMany({ where: { tailorProfileId: profile.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]) : [{ fulfilmentPendingMinor: 0n, payableMinor: 0n, processingMinor: 0n, providerSplitAllocatedUnreconciledMinor: 0n, paidOutMinor: 0n }, [], []] as any;
  let configReady = false;
  try { configReady = getPaymentRuntimeConfig().controlledPayoutsEnabled; } catch {}
  const payoutEligible = Boolean(paymentProfile?.payoutEligible && paymentProfile.settlementPolicy === "CONTROLLED_PAYOUT" && paymentProfile.verificationStatus === "VERIFIED" && !paymentProfile.suspendedAt && configReady);
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-2xl">Tailor earnings</h1><p className="text-sm text-muted-foreground">Balances shown below are derived from immutable ledger entries and verified transfer state, not from a wallet or escrow.</p></div><Link href="/dashboard/tailor/bookings" className="text-sm underline">Bookings & quotes</Link></div>
    <Card><CardHeader><CardTitle className="text-sm">Bank verification & settlement profile</CardTitle></CardHeader><CardContent><SellerPaymentProfileForm /></CardContent></Card>
    {!paymentProfile && <div className="rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm">No payment profile exists yet. Bank ownership verification is required before admin-authorized settlement setup.</div>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {[["Awaiting customer-confirmed fulfilment", snapshot.fulfilmentPendingMinor], ["Ledger payable", snapshot.payableMinor], ["Payout processing", snapshot.processingMinor], ["Verified transfers paid", snapshot.paidOutMinor], ["Provider split allocation — unreconciled", snapshot.providerSplitAllocatedUnreconciledMinor]].map(([label, amount]: any) => <Card key={label}><CardHeader><CardTitle className="text-xs">{label}</CardTitle></CardHeader><CardContent className="text-lg font-semibold">{formatNgn(amount)}</CardContent></Card>)}
    </div>
    <Card><CardHeader><CardTitle className="text-sm">Request a controlled payout</CardTitle></CardHeader><CardContent className="space-y-2"><PayoutRequestForm profileId={paymentProfile?.id || "none"} eligible={payoutEligible} /><p className="text-[11px] text-muted-foreground">A request reserves only a ledger-backed payable amount. Two separate admins must approve it before one Paystack transfer is initiated. Unknown transfer status is verified, never retried with a new reference.</p></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-sm">Commission allocations</CardTitle></CardHeader><CardContent className="space-y-2">{allocations.length ? allocations.map((row: any) => <div key={row.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-xs"><span>{row.payment.booking?.reference || row.payment.reference} • {row.payment.status} • rate {row.rateBps / 100}%</span><span>Gross {formatNgn(row.grossAmountMinor)} · Commission {formatNgn(row.commissionAmountMinor)} · Seller allocation {formatNgn(row.sellerAmountMinor)}</span></div>) : <p className="text-sm text-muted-foreground">No verified earning allocations yet.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-sm">Payout history</CardTitle></CardHeader><CardContent className="space-y-2">{payouts.length ? payouts.map((row: any) => <div key={row.id} className="flex justify-between gap-2 border-b py-2 text-xs"><span>{row.reference} • {row.status}{row.failureReason ? ` • ${row.failureReason}` : ""}</span><span>{formatNgn(row.amountMinor)} · {new Date(row.createdAt).toLocaleDateString()}</span></div>) : <p className="text-sm text-muted-foreground">No payout requests recorded.</p>}</CardContent></Card>
  </div>;
}
