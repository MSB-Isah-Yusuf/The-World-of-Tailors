"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toMinorText(value: string): string | null {
  const text = value.trim();
  if (!/^\d{1,14}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return (BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2))).toString();
}

function newRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 22)}`;
}

export function PayoutRequestForm({ profileId, eligible }: { profileId: string; eligible: boolean }) {
  const storageKey = `twt-payout-request:${profileId}`;
  const [amount, setAmount] = useState("");
  const [requestId, setRequestId] = useState("");
  const [submittedAmount, setSubmittedAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return;
    try { const parsed = JSON.parse(saved); setRequestId(String(parsed.id || "")); setSubmittedAmount(String(parsed.amountMinor || "")); setAmount(String(parsed.amount || "")); }
    catch { sessionStorage.removeItem(storageKey); }
  }, [storageKey]);

  const pendingRetry = Boolean(requestId && submittedAmount);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    const amountMinor = pendingRetry ? submittedAmount : toMinorText(amount);
    if (!amountMinor || BigInt(amountMinor) <= 0n) { setError("Enter a positive NGN amount with up to two decimal places."); return; }
    const id = requestId || newRequestId();
    if (!requestId) {
      setRequestId(id); setSubmittedAmount(amountMinor);
      sessionStorage.setItem(storageKey, JSON.stringify({ id, amountMinor, amount }));
    }
    setBusy(true);
    try {
      const response = await fetch("/api/seller/payouts", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": id }, body: JSON.stringify({ amountMinor }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Payout request failed");
      setNotice(`Payout ${body.payout?.reference} is ${body.payout?.status}. Two different administrators must approve before transfer initiation.`);
      setAmount(""); setRequestId(""); setSubmittedAmount(""); sessionStorage.removeItem(storageKey);
      window.location.reload();
    } catch (reason: any) { setError(reason.message || "Payout request result is unknown. Retry using the same saved request."); }
    setBusy(false);
  }

  return <form onSubmit={submit} className="space-y-2">
    <div className="flex flex-wrap items-end gap-2"><div className="min-w-[12rem]"><Label htmlFor={`payout-${profileId}`}>Request amount (NGN)</Label><Input id={`payout-${profileId}`} inputMode="decimal" value={pendingRetry ? (amount || "") : amount} onChange={(event) => setAmount(event.target.value)} disabled={!eligible || pendingRetry} placeholder="0.00" /></div><Button type="submit" size="sm" disabled={!eligible || busy || (!pendingRetry && !amount)}>{busy ? "Submitting…" : pendingRetry ? "Retry same request safely" : "Request controlled payout"}</Button></div>
    {!eligible && <p className="text-xs text-muted-foreground">Payout requests are disabled until a controlled-payout route, verified recipient, provider/business gate and administrator eligibility are all in place.</p>}
    {pendingRetry && <p className="text-xs text-amber-800">A prior request may have reached the server. This retry reuses the same idempotency key and amount; do not create a second request until status is checked.</p>}
    {error && <p role="alert" className="text-xs text-burgundy">{error}</p>}
    {notice && <p role="status" className="text-xs text-emeraldDeep">{notice}</p>}
  </form>;
}
