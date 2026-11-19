"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

async function jsonRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || json.error || "Request failed");
  return json;
}

export function TailoringPaymentActions({ bookingId, canAcceptQuote, canPayBalance }: { bookingId: string; canAcceptQuote: boolean; canPayBalance: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const startPay = async (paymentId: string) => {
    const initialized = await jsonRequest("/api/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId }) });
    if (!initialized.authorization_url) throw new Error("Paystack did not return a checkout URL");
    window.location.assign(initialized.authorization_url);
  };
  const acceptAndPay = async () => {
    setBusy(true); setError("");
    try {
      const accepted = await jsonRequest(`/api/v1/bookings/${bookingId}/accept-quote`, { method: "POST" });
      await startPay(accepted.paymentId);
    } catch (err: any) { setError(err.message || "Could not accept quote"); setBusy(false); }
  };
  const payBalance = async () => {
    setBusy(true); setError("");
    try {
      const balance = await jsonRequest(`/api/v1/bookings/${bookingId}/pay-balance`, { method: "POST" });
      await startPay(balance.paymentId);
    } catch (err: any) { setError(err.message || "Could not initialize balance payment"); setBusy(false); }
  };
  if (!canAcceptQuote && !canPayBalance) return null;
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {canAcceptQuote && <Button size="sm" onClick={acceptAndPay} disabled={busy}>{busy ? "Preparing secure checkout…" : "Accept quote & pay"}</Button>}
      {canPayBalance && <Button size="sm" onClick={payBalance} disabled={busy}>{busy ? "Preparing secure checkout…" : "Pay final balance"}</Button>}
    </div>
    {error && <p role="alert" className="text-xs text-burgundy">{error}</p>}
    <p className="text-[11px] text-muted-foreground">Amounts are loaded from your accepted quote and server-side payment obligation. Payment is confirmed only by Paystack verification.</p>
  </div>;
}
