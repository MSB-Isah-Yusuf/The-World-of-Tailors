"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNgn } from "@/lib/payments/money";

type PayoutRow = any;
export function AdminPayoutQueue() {
  const [items, setItems] = useState<PayoutRow[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [gateEnabled, setGateEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/finance/payouts", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "Could not load payout queue"); setLoading(false); return; }
    setItems(body.items || []); setReadiness(body.readiness); setGateEnabled(Boolean(body.payoutGateEnabled)); setError(""); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  async function act(id: string, action: "approve" | "reject" | "verify") {
    let reason = "";
    if (action === "reject") { reason = window.prompt("Reason for rejection (audit note):", "") || ""; if (!reason.trim()) return; }
    setBusyId(id); setError(""); setNotice("");
    try {
      const url = action === "verify" ? `/api/admin/finance/payouts/${id}/verify` : `/api/admin/finance/payouts/${id}/approve`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "verify" ? {} : { action, reason }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) throw new Error(body.message || body.error || "Payout action failed");
      setNotice(body.message || `Payout status: ${body.item?.status || "updated"}`);
      await load();
    } catch (reason: any) { setError(reason.message || "Payout action failed"); }
    setBusyId("");
  }

  return <div className="space-y-4">
    {!gateEnabled && <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-sm">Controlled payouts are disabled. Both provider/business approval gates must be explicitly enabled before a transfer can be initiated.</div>}
    <div className="text-xs text-muted-foreground">Two-person approval is required for every payout. First approval only records approval; the second distinct administrator locks and submits one Paystack transfer reference. Unknown outcomes must be queried, never re-sent.</div>
    {readiness && <div className="rounded-xl border p-3 text-xs">Payment configuration: {readiness.configured ? `${readiness.environment} • ${readiness.currency}` : `not ready • ${readiness.message || "configuration missing"}`} • Immediate split: {readiness.immediateSplitEnabled ? "enabled by configuration" : "disabled"} • Controlled payout: {gateEnabled ? "enabled by configuration" : "disabled"}</div>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{notice}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading payout queue…</p> : items.length === 0 ? <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No payout requests recorded.</div> : items.map((payout: any) => {
      const canApprove = gateEnabled && payout.payoutEligible && payout.verificationStatus === "VERIFIED" && payout.settlementPolicy === "CONTROLLED_PAYOUT" && !payout.suspended && payout.recipientPresent && ["REQUESTED", "AWAITING_SECOND_APPROVAL"].includes(payout.status);
      const canVerify = ["PROCESSING", "TRANSFER_UNKNOWN", "INITIATING", "AWAITING_PROVIDER"].includes(payout.status);
      return <div key={payout.id} className="rounded-xl border bg-white p-4 dark:bg-white/[0.04] dark:border-white/10 space-y-3">
        <div className="flex flex-wrap justify-between gap-2"><div><div className="font-semibold">{payout.reference} • {formatNgn(BigInt(payout.amountMinor))}</div><div className="text-xs text-muted-foreground">{payout.businessName || payout.sellerType} • {payout.email} • {payout.bankName || "bank unknown"} {payout.maskedAccountNumber || ""}</div></div><div className="text-right"><span className="rounded-full border px-2 py-1 text-xs">{payout.status}</span><div className="text-[11px] text-muted-foreground mt-1">{new Date(payout.requestedAt).toLocaleString()}</div></div></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-muted-foreground"><div>Route: {payout.settlementPolicy} • Verification: {payout.verificationStatus}</div><div>First approval: {payout.approvedBy?.name || payout.approvedBy?.email || "—"}</div><div>Second approval: {payout.secondApprovedBy?.name || payout.secondApprovedBy?.email || "—"}</div><div>Provider transfer: {payout.providerTransferId || "not confirmed"}</div></div>
        <div className="text-[11px]">Ledger: pending fulfilment {formatNgn(BigInt(payout.ledger?.fulfilmentPendingMinor || "0"))} • payable {formatNgn(BigInt(payout.ledger?.payableMinor || "0"))} • processing {formatNgn(BigInt(payout.ledger?.processingMinor || "0"))} • verified paid {formatNgn(BigInt(payout.ledger?.paidOutMinor || "0"))}</div>
        {payout.failureReason && <p className="text-xs text-amber-800">Note: {payout.failureReason}</p>}
        <div className="flex flex-wrap gap-2">{canApprove && <Button size="sm" disabled={busyId === payout.id} onClick={() => act(payout.id, "approve")}>{busyId === payout.id ? "Working…" : payout.status === "REQUESTED" ? "Record first approval" : "Second approve & submit transfer"}</Button>}{canApprove && <Button size="sm" variant="outline" disabled={busyId === payout.id} onClick={() => act(payout.id, "reject")}>Reject & release ledger reserve</Button>}{canVerify && <Button size="sm" variant="outline" disabled={busyId === payout.id} onClick={() => act(payout.id, "verify")}>Verify existing transfer status</Button>}</div>
      </div>;
    })}
  </div>;
}
