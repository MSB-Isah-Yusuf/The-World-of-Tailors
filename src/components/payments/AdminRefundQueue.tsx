"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNgn } from "@/lib/payments/money";

export function AdminRefundQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/finance/refunds", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "Could not load refunds"); setLoading(false); return; }
    setItems(body.items || []); setError(""); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  async function act(refund: any, action: "approve" | "reject" | "verify") {
    const reason = action === "reject" ? window.prompt("Reason for rejection:", "") || "" : "";
    if (action === "reject" && !reason.trim()) return;
    setBusy(refund.id); setError(""); setNotice("");
    try {
      const url = action === "verify" ? `/api/admin/finance/refunds/${refund.id}/verify` : `/api/admin/finance/refunds/${refund.id}/approve`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "verify" ? {} : { action, reason }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) throw new Error(body.message || body.error || "Refund action failed");
      setNotice(body.message || `Refund state: ${body.item?.status || "updated"}`); await load();
    } catch (reason: any) { setError(reason.message || "Refund action failed"); }
    setBusy("");
  }
  return <div className="space-y-4">
    <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-xs">Two distinct administrators approve supported controlled-payout refunds. Immediate split, missing seller recovery, or mismatched provider data is routed to manual review. Provider uncertainty is verified against the same refund reference; never submit another refund reference.</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{notice}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading refunds…</p> : items.length === 0 ? <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No refund requests recorded.</div> : items.map((refund) => {
      const canApprove = ["REQUESTED", "AWAITING_SECOND_APPROVAL"].includes(refund.status);
      const canReject = ["REQUESTED", "AWAITING_SECOND_APPROVAL", "REVIEW_REQUIRED"].includes(refund.status) && !refund.initiatedAt;
      const canVerify = ["INITIATING", "PROCESSING", "REFUND_UNKNOWN"].includes(refund.status) && Boolean(refund.initiatedAt);
      return <div key={refund.id} className="rounded-xl border bg-white p-4 dark:bg-white/[0.04] dark:border-white/10 space-y-2">
        <div className="flex flex-wrap justify-between gap-2"><div><div className="font-semibold">{refund.reference} • {formatNgn(BigInt(refund.amountMinor))} • {refund.currency}</div><div className="text-xs text-muted-foreground">{refund.payment.booking?.reference || refund.payment.fabricOrder?.reference || refund.payment.reference} • customer {refund.payment.customer?.email || "—"} • seller {refund.payment.booking?.tailorName || refund.payment.fabricOrder?.sellerName || "—"}</div></div><span className="h-fit rounded-full border px-2 py-1 text-xs">{refund.status}</span></div>
        <p className="text-xs">Customer reason: {refund.reason}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-muted-foreground"><span>Payment {refund.payment.reference} • {refund.payment.status}</span><span>Route snapshot: {refund.payment.settlementPolicySnapshot || "unknown"}</span><span>First approver: {refund.approvedBy?.name || refund.approvedBy?.email || "—"}</span><span>Second approver: {refund.secondApprovedBy?.name || refund.secondApprovedBy?.email || "—"}</span></div>
        {refund.providerResponseSummary && <pre className="overflow-auto rounded bg-ivory p-2 text-[10px]">{JSON.stringify(refund.providerResponseSummary)}</pre>}
        <div className="flex flex-wrap gap-2">{canApprove && <Button size="sm" disabled={busy === refund.id} onClick={() => act(refund, "approve")}>{busy === refund.id ? "Working…" : refund.status === "REQUESTED" ? "First approval" : "Second approve & submit refund"}</Button>}{canReject && <Button size="sm" variant="outline" disabled={busy === refund.id} onClick={() => act(refund, "reject")}>Reject & restore payment status</Button>}{canVerify && <Button size="sm" variant="outline" disabled={busy === refund.id} onClick={() => act(refund, "verify")}>Verify existing provider refund</Button>}</div>
      </div>;
    })}
  </div>;
}
