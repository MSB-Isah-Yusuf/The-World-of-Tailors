"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function newKey() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 22)}`; }
export function CustomerDisputeRequest({ paymentId }: { paymentId: string }) {
  const storageKey = `twt-dispute-request:${paymentId}`;
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const raw = sessionStorage.getItem(storageKey); if (!raw) return; try { const value = JSON.parse(raw); setKey(value.key || ""); setReason(value.reason || ""); setEvidence(value.evidence || ""); } catch { sessionStorage.removeItem(storageKey); } }, [storageKey]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!reason.trim()) { setError("Describe the payment issue."); return; }
    const idempotencyKey = key || newKey();
    if (!key) { setKey(idempotencyKey); sessionStorage.setItem(storageKey, JSON.stringify({ key: idempotencyKey, reason, evidence })); }
    setBusy(true);
    try {
      const response = await fetch("/api/customer/disputes", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ paymentId, reason, evidence }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Dispute request failed");
      sessionStorage.removeItem(storageKey); window.location.assign("/dashboard/customer/disputes");
    } catch (reason: any) { setError(reason.message || "Request result is uncertain. Retry with the same request key."); }
    setBusy(false);
  }
  const locked = Boolean(key);
  return <form onSubmit={submit} className="mt-2 rounded-lg border p-3 space-y-2">
    <div className="font-medium text-xs">Report a payment dispute</div>
    <div><Label htmlFor={`dispute-reason-${paymentId}`}>Issue</Label><Input id={`dispute-reason-${paymentId}`} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy || locked} maxLength={1000} placeholder="Describe what went wrong" /></div>
    <div><Label htmlFor={`dispute-evidence-${paymentId}`}>Evidence / reference (optional)</Label><Input id={`dispute-evidence-${paymentId}`} value={evidence} onChange={(event) => setEvidence(event.target.value)} disabled={busy || locked} maxLength={2000} placeholder="Short description only; do not enter card or bank credentials" /></div>
    <Button size="sm" type="submit" variant="outline" disabled={busy || !reason.trim()}>{busy ? "Submitting…" : locked ? "Retry same report safely" : "Submit dispute"}</Button>
    <p className="text-[11px] text-muted-foreground">An administrator will review the report. Open payment disputes pause seller payout requests; this is not a guarantee of refund.</p>
    {error && <p role="alert" className="text-xs text-burgundy">{error}</p>}
  </form>;
}
