"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNgn } from "@/lib/payments/money";

const EXAMPLE = `[{"recordType":"CHARGE","reference":"twt_provider_reference","amountMinor":"125000","currency":"NGN","status":"success","providerRecordId":"12345"}]`;
export function AdminReconciliationPanel() {
  const [items, setItems] = useState<any[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [rows, setRows] = useState(EXAMPLE);
  const [selected, setSelected] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const response = await fetch("/api/admin/finance/reconciliations", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Could not load reconciliations");
    setItems(body.items || []);
  }
  useEffect(() => { load().catch((reason) => setError(reason.message)); }, []);

  async function importStatement(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const records = JSON.parse(rows);
      if (!Array.isArray(records)) throw new Error("Statement must be a JSON array of normalized rows.");
      const response = await fetch("/api/admin/finance/reconciliations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periodStart: new Date(periodStart).toISOString(), periodEnd: new Date(periodEnd).toISOString(), currency: "NGN", records }) });
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || body.error || "Reconciliation import failed");
      setNotice(`Reconciliation created: ${body.item.id} • ${body.item.status} • discrepancy ${formatNgn(BigInt(body.item.discrepancyMinor))}`); await load(); await openDetail(body.item.id);
    } catch (reason: any) { setError(reason.message || "Could not import statement"); }
    setBusy(false);
  }
  async function openDetail(id: string) {
    const response = await fetch(`/api/admin/finance/reconciliations/${id}`, { cache: "no-store" }); const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Could not load reconciliation details"); setSelected(body.item); setReviewNote("");
  }
  async function markReview(status: "REVIEWED" | "ESCALATED") {
    if (!selected || !reviewNote.trim()) { setError("Add an audit note before recording a review decision."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/finance/reconciliations/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, notes: reviewNote }) });
      const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || "Review update failed");
      setNotice(`Reconciliation marked ${status}. No ledger entries were auto-adjusted.`); await load(); await openDetail(selected.id);
    } catch (reason: any) { setError(reason.message || "Review update failed"); }
    setBusy(false);
  }
  async function readFile(file?: File) { if (!file) return; setRows(await file.text()); }

  return <div className="space-y-5">
    <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-xs">Manual provider-statement comparison only. Normalize a downloaded Paystack statement into rows with recordType CHARGE / REFUND / TRANSFER, reference, amountMinor (kobo), currency, status, and optional providerRecordId. Imported totals do not create, alter, or settle ledger entries.</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{notice}</p>}
    <form onSubmit={importStatement} className="rounded-xl border bg-white p-4 dark:bg-white/[0.04] dark:border-white/10 space-y-3">
      <h2 className="font-semibold">Import normalized statement</h2>
      <div className="grid sm:grid-cols-2 gap-3"><div><label className="text-xs">Period start</label><Input required type="datetime-local" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></div><div><label className="text-xs">Period end</label><Input required type="datetime-local" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></div></div>
      <input type="file" accept="application/json,.json,text/plain" onChange={(event) => readFile(event.target.files?.[0]).catch(() => setError("Could not read file"))} className="text-xs" />
      <textarea value={rows} onChange={(event) => setRows(event.target.value)} rows={9} className="w-full rounded-xl border bg-background p-3 font-mono text-xs" aria-label="Normalized statement JSON" />
      <Button size="sm" disabled={busy || !periodStart || !periodEnd}>{busy ? "Reconciling…" : "Compare statement"}</Button>
    </form>
    <section className="space-y-2"><h2 className="font-semibold">Reconciliation runs</h2>{items.length === 0 ? <p className="text-sm text-muted-foreground">No statement imports yet.</p> : items.map((item) => <button type="button" key={item.id} onClick={() => openDetail(item.id).catch((reason) => setError(reason.message))} className="w-full rounded-xl border bg-white p-3 text-left dark:bg-white/[0.04] dark:border-white/10"><div className="flex flex-wrap justify-between gap-2 text-sm"><strong>{new Date(item.periodStart).toLocaleDateString()}–{new Date(item.periodEnd).toLocaleDateString()} • {item.status}</strong><span>{item.itemCount} rows</span></div><div className="text-xs text-muted-foreground">Internal charges {formatNgn(BigInt(item.internalTotalMinor))} • Provider charges {formatNgn(BigInt(item.providerTotalMinor))} • Discrepancy {formatNgn(BigInt(item.discrepancyMinor))}</div></button>)}</section>
    {selected && <section className="rounded-xl border bg-white p-4 dark:bg-white/[0.04] dark:border-white/10 space-y-3"><div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-semibold">Run {selected.id}</h2><p className="text-xs text-muted-foreground">{selected.status} • {selected.items?.length || 0} row(s) • charges only in aggregate totals</p></div><span className="text-sm">Difference {formatNgn(BigInt(selected.discrepancyMinor))}</span></div>
      <div className="max-h-96 overflow-auto space-y-1">{(selected.items || []).map((item: any) => <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b py-2 text-[11px]"><span>{item.recordType} • {item.reference} • provider {item.providerStatus}</span><span>{formatNgn(BigInt(item.amountMinor))}</span><span>{item.status}</span></div>)}</div>
      <textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={3} placeholder="Review / escalation note (required)" className="w-full rounded-lg border bg-background p-3 text-sm" />
      <div className="flex gap-2"><Button size="sm" disabled={busy || !reviewNote.trim()} onClick={() => markReview("REVIEWED")}>Mark reviewed</Button><Button size="sm" variant="outline" disabled={busy || !reviewNote.trim()} onClick={() => markReview("ESCALATED")}>Escalate</Button></div>
      <p className="text-[11px] text-muted-foreground">Review status is an audit marker only; any correction requires a separately authorized journal and provider evidence.</p>
    </section>}
  </div>;
}
