"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNgn } from "@/lib/payments/money";

export function AdminPaymentDisputes() {
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    setLoading(true); const response = await fetch("/api/admin/finance/disputes", { cache: "no-store" }); const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "Could not load disputes"); setLoading(false); return; }
    setItems(body.items || []); setError(""); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);
  async function setStatus(item: any, status: string) {
    const resolution = notes[item.id]?.trim(); if (!resolution) { setError("Add a resolution/review note before changing a dispute."); return; }
    setBusy(item.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/finance/disputes/${item.id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, resolution }) });
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Could not update dispute");
      setNotice(`Dispute ${item.id} is now ${body.item?.status}.`); await load();
    } catch (reason: any) { setError(reason.message || "Dispute update failed"); }
    setBusy("");
  }
  return <div className="space-y-3">
    <p className="text-xs text-muted-foreground">Payment disputes pause new seller payout requests. A resolution is audited and notifies the customer and seller/tailor.</p>
    {error && <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-800">{error}</p>}{notice && <p role="status" className="rounded bg-emerald-50 p-2 text-xs text-emerald-900">{notice}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Loading payment disputes…</p> : items.length === 0 ? <p className="text-sm text-muted-foreground">No payment disputes submitted.</p> : items.map((item) => <div key={item.id} className="rounded-xl border bg-white p-4 dark:bg-white/[0.04] dark:border-white/10 space-y-2">
      <div className="flex flex-wrap justify-between gap-2"><div className="font-semibold">{item.payment.reference} • {item.payment.amountMinor ? formatNgn(BigInt(item.payment.amountMinor)) : "—"}</div><span className="rounded-full border px-2 py-1 text-xs">{item.status}</span></div>
      <div className="text-xs text-muted-foreground">Customer {item.customer.email} • {item.payment.booking?.businessName || item.payment.fabricOrder?.businessName || "seller unknown"} • route snapshot {item.payment.settlementPolicySnapshot || "unknown"}</div>
      <p className="text-sm">{item.reason}</p>{item.evidence?.text && <p className="text-xs">Evidence note: {item.evidence.text}</p>}{item.resolution && <p className="text-xs">Prior resolution: {item.resolution}</p>}
      {!(["RESOLVED_CUSTOMER", "RESOLVED_SELLER", "CLOSED"].includes(item.status)) && <div className="space-y-2"><input value={notes[item.id] || ""} onChange={(event) => setNotes((old) => ({ ...old, [item.id]: event.target.value }))} maxLength={2000} placeholder="Investigation note / resolution" className="h-9 w-full rounded-lg border bg-background px-3 text-sm" /><div className="flex flex-wrap gap-2">{item.status === "OPEN" && <Button size="sm" variant="outline" disabled={busy === item.id} onClick={() => setStatus(item, "UNDER_REVIEW")}>Assign to me / begin review</Button>}{item.status === "UNDER_REVIEW" && <><Button size="sm" disabled={busy === item.id} onClick={() => setStatus(item, "RESOLVED_CUSTOMER")}>Resolve for customer</Button><Button size="sm" variant="outline" disabled={busy === item.id} onClick={() => setStatus(item, "RESOLVED_SELLER")}>Resolve for seller</Button><Button size="sm" variant="outline" disabled={busy === item.id} onClick={() => setStatus(item, "CLOSED")}>Close with note</Button></>}</div></div>}
    </div>)}
  </div>;
}
