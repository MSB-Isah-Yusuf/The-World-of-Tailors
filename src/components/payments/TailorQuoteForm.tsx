"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function toMinor(value: string): string {
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error("Enter a valid amount with up to two decimal places");
  const [whole, fraction = ""] = normalized.split(".");
  return (BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2))).toString();
}

export function TailorQuoteForm({ bookingId }: { bookingId: string }) {
  const [values, setValues] = useState({ service: "", delivery: "0", extra: "0", discount: "0", depositPercent: "", description: "", garment: "", fabric: "", terms: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const change = (key: keyof typeof values, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const depositPercent = values.depositPercent.trim() ? Number(values.depositPercent) : null;
      if (depositPercent !== null && (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100)) throw new Error("Deposit percent must be between 1 and 100");
      const body: any = {
        serviceAmountMinor: toMinor(values.service), deliveryChargeMinor: toMinor(values.delivery),
        additionalChargesMinor: toMinor(values.extra), discountMinor: toMinor(values.discount),
        serviceName: "Tailoring service", description: values.description, garmentDetails: values.garment,
        fabricRequirements: values.fabric, terms: values.terms,
      };
      if (depositPercent !== null) body.depositPercentBps = Math.round(depositPercent * 100);
      const response = await fetch(`/api/v1/bookings/${bookingId}/quote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "Could not send quote");
      setMessage(`Quote sent • Total ₦${(Number(result.quote.totalMinor) / 100).toLocaleString()} • Deposit ₦${(Number(result.quote.depositMinor) / 100).toLocaleString()}`);
    } catch (err: any) { setError(err.message || "Could not send quote"); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border bg-ivory/70 dark:bg-white/[0.03] dark:border-white/10 p-3">
    <div className="grid sm:grid-cols-2 gap-2 text-xs">
      <label className="space-y-1">Service amount (₦)<input required value={values.service} onChange={(e) => change("service", e.target.value)} inputMode="decimal" placeholder="50000.00" className="h-8 w-full rounded-md border px-2 bg-white dark:bg-white/[0.06]" /></label>
      <label className="space-y-1">Delivery charge (₦)<input value={values.delivery} onChange={(e) => change("delivery", e.target.value)} inputMode="decimal" className="h-8 w-full rounded-md border px-2 bg-white dark:bg-white/[0.06]" /></label>
      <label className="space-y-1">Additional agreed charges (₦)<input value={values.extra} onChange={(e) => change("extra", e.target.value)} inputMode="decimal" className="h-8 w-full rounded-md border px-2 bg-white dark:bg-white/[0.06]" /></label>
      <label className="space-y-1">Discount (₦)<input value={values.discount} onChange={(e) => change("discount", e.target.value)} inputMode="decimal" className="h-8 w-full rounded-md border px-2 bg-white dark:bg-white/[0.06]" /></label>
      <label className="space-y-1">Optional deposit (%)<input value={values.depositPercent} onChange={(e) => change("depositPercent", e.target.value)} inputMode="decimal" placeholder="Leave blank for full payment" className="h-8 w-full rounded-md border px-2 bg-white dark:bg-white/[0.06]" /></label>
      <label className="space-y-1">Garment details<input value={values.garment} onChange={(e) => change("garment", e.target.value)} className="h-8 w-full rounded-md border px-2 bg-white dark:bg-white/[0.06]" /></label>
      <label className="space-y-1 sm:col-span-2">Description<textarea value={values.description} onChange={(e) => change("description", e.target.value)} rows={2} className="w-full rounded-md border px-2 py-1 bg-white dark:bg-white/[0.06]" /></label>
      <label className="space-y-1 sm:col-span-2">Fabric requirements<textarea value={values.fabric} onChange={(e) => change("fabric", e.target.value)} rows={2} className="w-full rounded-md border px-2 py-1 bg-white dark:bg-white/[0.06]" /></label>
      <label className="space-y-1 sm:col-span-2">Terms & cancellation<textarea value={values.terms} onChange={(e) => change("terms", e.target.value)} rows={2} className="w-full rounded-md border px-2 py-1 bg-white dark:bg-white/[0.06]" /></label>
    </div>
    <Button type="submit" size="sm" disabled={saving}>{saving ? "Sending quote…" : "Send / update quote"}</Button>
    {message && <p className="text-xs text-emeraldDeep">{message}</p>}{error && <p role="alert" className="text-xs text-burgundy">{error}</p>}
    <p className="text-[11px] text-muted-foreground">The customer must accept the quote before checkout. Commission terms are snapshotted at acceptance.</p>
  </form>;
}
