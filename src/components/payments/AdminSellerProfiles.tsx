"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNgn } from "@/lib/payments/money";

type ProfileRow = any;
export function AdminSellerProfiles() {
  const [items, setItems] = useState<ProfileRow[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/finance/seller-profiles", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "Could not load seller finance profiles"); setLoading(false); return; }
    setItems(body.items || []); setReadiness(body.readiness); setError(""); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  async function update(row: ProfileRow, changes: any) {
    setBusy(row.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/finance/seller-profiles/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Seller policy update failed");
      setNotice(`${row.businessName || row.sellerType}: policy saved. ${body.item?.payoutEligible ? "Eligibility enabled." : "Payout/split eligibility is disabled."}`);
      await load();
    } catch (reason: any) { setError(reason.message || "Could not update seller policy"); }
    setBusy("");
  }

  return <div className="space-y-4">
    {readiness && <div className="rounded-xl border p-3 text-xs">Paystack readiness: {readiness.configured ? `${readiness.environment} • ${readiness.currency}` : `not ready • ${readiness.message || "configuration missing"}`} • Immediate split gate: {readiness.immediateSplitEnabled ? "on" : "off"} • Controlled payout gate: {readiness.controlledPayoutsEnabled ? "on" : "off"}</div>}
    <p className="text-xs text-muted-foreground">Only bank-verified and provider-provisioned destinations can be made eligible. Never use this screen to claim funds are held or settled; balances come from the immutable ledger, while provider statements still require reconciliation.</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{notice}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading seller profiles…</p> : items.length === 0 ? <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No verified seller payment profiles yet.</div> : items.map((row: any) => {
      const eligibleForApproval = row.verificationStatus === "VERIFIED" && (row.settlementPolicy === "IMMEDIATE_SPLIT" ? row.hasSubaccount && row.subaccountActive : row.settlementPolicy === "CONTROLLED_PAYOUT" ? row.hasTransferRecipient : false);
      const ledger = row.ledger || {};
      return <div key={row.id} className="rounded-xl border bg-white p-4 dark:bg-white/[0.04] dark:border-white/10 space-y-3">
        <div className="flex flex-wrap justify-between gap-2"><div><div className="font-semibold">{row.businessName || row.sellerType} • {row.sellerType}</div><div className="text-xs text-muted-foreground">{row.email} • {row.bankName || "Bank not resolved"} {row.maskedAccountNumber || ""} • {row.accountHolderName || ""}</div></div><span className="h-fit rounded-full border px-2 py-1 text-xs">{row.verificationStatus}</span></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]"><span>Provider subaccount: {row.hasSubaccount ? (row.subaccountActive ? "active" : "inactive") : "none"}</span><span>Transfer recipient: {row.hasTransferRecipient ? "created" : "none"}</span><span>Eligible: {row.payoutEligible ? "yes" : "no"}</span><span>Suspension: {row.suspendedAt ? new Date(row.suspendedAt).toLocaleString() : "none"}</span></div>
        <div className="text-[11px]">Ledger — fulfilment pending {formatNgn(BigInt(ledger.fulfilmentPendingMinor || "0"))} • payable {formatNgn(BigInt(ledger.payableMinor || "0"))} • processing {formatNgn(BigInt(ledger.processingMinor || "0"))} • split allocation unreconciled {formatNgn(BigInt(ledger.providerSplitAllocatedUnreconciledMinor || "0"))} • verified payouts {formatNgn(BigInt(ledger.paidOutMinor || "0"))}</div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">Settlement policy<select id={`route-${row.id}`} defaultValue={row.settlementPolicy} className="mt-1 block h-9 rounded-lg border bg-background px-2"><option value="DISABLED">Disabled</option><option value="CONTROLLED_PAYOUT">Controlled payout</option><option value="IMMEDIATE_SPLIT">Immediate split</option></select></label>
          <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => { const route = (document.getElementById(`route-${row.id}`) as HTMLSelectElement).value; update(row, { settlementPolicy: route, payoutEligible: false, suspendPayouts: row.suspendedAt ? true : false }); }}>Set route disabled until approval</Button>
          <Button size="sm" disabled={busy === row.id || !eligibleForApproval || row.suspendedAt} onClick={() => update(row, { payoutEligible: true, suspendPayouts: false })}>Authorize settlement</Button>
          {row.payoutEligible && <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => update(row, { payoutEligible: false })}>Disable eligibility</Button>}
          {!row.suspendedAt ? <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => update(row, { suspendPayouts: true })}>Suspend</Button> : <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => update(row, { suspendPayouts: false, payoutEligible: true })}>Resume</Button>}
          <div className="w-full text-[11px] text-muted-foreground">{eligibleForApproval ? "Destination passes the current provider fields check; review business eligibility and provider terms before authorizing." : "Cannot authorize: a matching verified Paystack destination is required for the selected route."}</div>
        </div>
      </div>;
    })}
  </div>;
}
