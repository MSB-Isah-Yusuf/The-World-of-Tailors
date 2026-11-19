"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toMinor(value: string) {
  const text = value.trim();
  if (!/^\d{1,14}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return (BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2))).toString();
}
function requestId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 22)}`; }

export function CustomerRefundRequest({ paymentId, remainingAmount }: { paymentId: string; remainingAmount: string }) {
  const storageKey = `twt-refund-request:${paymentId}`;
  const [amount, setAmount] = useState(remainingAmount);
  const [reason, setReason] = useState("");
  const [key, setKey] = useState("");
  const [submitted, setSubmitted] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return;
    try { const parsed = JSON.parse(saved); setKey(String(parsed.key || "")); setAmount(String(parsed.amount || remainingAmount)); setReason(String(parsed.reason || "")); }
    catch { sessionStorage.removeItem(storageKey); }
  }, [storageKey, remainingAmount]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const amountMinor = key ? sessionStorage.getItem(storageKey) ? String(JSON.parse(sessionStorage.getItem(storageKey) || "{}").amountMinor || "") : "" : toMinor(amount);
    if (!amountMinor || BigInt(amountMinor) <= 0n || !reason.trim()) { setError("Enter a valid refund amount and reason."); return; }
    const requestKey = key || requestId();
    if (!key) { setKey(requestKey); sessionStorage.setItem(storageKey, JSON.stringify({ key: requestKey, amount, amountMinor, reason })); }
    setBusy(true);
    try {
      const response = await fetch("/api/customer/refunds", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey }, body: JSON.stringify({ paymentId, amountMinor, reason }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Refund request failed");
      setSubmitted(body.refund); setKey(""); sessionStorage.removeItem(storageKey); window.location.reload();
    } catch (reason: any) { setError(reason.message || "Request result is uncertain. Retry with the same saved request before creating another."); }
    setBusy(false);
  }
  const locked = Boolean(key);
  return <form onSubmit={submit} className="mt-2 rounded-lg border p-3 space-y-2">
    <div className="font-medium text-xs">Request a refund • administrator review required</div>
    <div className="grid sm:grid-cols-2 gap-2"><div><Label htmlFor={`refund-amount-${paymentId}`}>Amount (NGN)</Label><Input id={`refund-amount-${paymentId}`} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={busy || locked} /></div><div><Label htmlFor={`refund-reason-${paymentId}`}>Reason</Label><Input id={`refund-reason-${paymentId}`} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy || locked} maxLength={500} placeholder="Brief explanation" /></div></div>
    <Button size="sm" type="submit" variant="outline" disabled={busy || Boolean(submitted) || !amount || !reason.trim()}>{busy ? "Submitting…" : locked ? "Retry same request safely" : "Submit refund request"}</Button>
    <p className="text-[11px] text-muted-foreground">This submits a request; it does not initiate or confirm a refund. Two administrators must approve before a supported provider refund is attempted.</p>
    {locked && <p className="text-[11px] text-amber-800">A previous request may have reached the server. This retry reuses the same request key and amount; do not submit another request.</p>}
    {error && <p role="alert" className="text-xs text-burgundy">{error}</p>}
  </form>;
}
