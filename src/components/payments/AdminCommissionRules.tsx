"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function fmtMinor(value: string | null | undefined) { if (value == null) return "—"; return `₦${(BigInt(value) / 100n).toString()}.${(BigInt(value) % 100n).toString().padStart(2, "0")}`; }
export function AdminCommissionRules() {
  const [rules, setRules] = useState<any[]>([]);
  const [category, setCategory] = useState("TAILORING_SERVICE");
  const [commissionBase, setCommissionBase] = useState("");
  const [rateBps, setRateBps] = useState("");
  const [fixedFeeMinor, setFixedFeeMinor] = useState("0");
  const [minimumCommissionMinor, setMinimumCommissionMinor] = useState("");
  const [maximumCommissionMinor, setMaximumCommissionMinor] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [tailorProfileId, setTailorProfileId] = useState("");
  const [sellerProfileId, setSellerProfileId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/finance/commission-rules", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "Could not load commission rules"); setLoading(false); return; }
    setRules(body.items || []); setError(""); setLoading(false);
  }
  useEffect(() => { load().catch(() => setLoading(false)); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const body: any = { category, commissionBase, rateBps: Number(rateBps), fixedFeeMinor, currency, active: true };
    if (minimumCommissionMinor) body.minimumCommissionMinor = minimumCommissionMinor;
    if (maximumCommissionMinor) body.maximumCommissionMinor = maximumCommissionMinor;
    if (tailorProfileId) body.tailorProfileId = tailorProfileId.trim();
    if (sellerProfileId) body.sellerProfileId = sellerProfileId.trim();
    if (effectiveFrom) body.effectiveFrom = new Date(effectiveFrom).toISOString();
    if (effectiveTo) body.effectiveTo = new Date(effectiveTo).toISOString();
    try {
      const response = await fetch("/api/admin/finance/commission-rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || result.error || "Rule creation failed");
      setNotice("Commission rule saved. Existing obligations keep their immutable rate and amount snapshots.");
      setRateBps(""); setCommissionBase(""); setTailorProfileId(""); setSellerProfileId(""); setEffectiveFrom(""); setEffectiveTo("");
      await load();
    } catch (reason: any) { setError(reason.message || "Rule creation failed"); }
    setBusy(false);
  }

  async function closeRule(id: string) {
    if (!window.confirm("Deactivate this rule? Existing payment obligations keep their snapshots.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/finance/commission-rules/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: false }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Rule update failed");
      setNotice("Rule deactivated; historical obligations were not changed."); await load();
    } catch (reason: any) { setError(reason.message || "Rule update failed"); }
    setBusy(false);
  }

  return <div className="space-y-5">
    <div className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-xs">No commission rates are preconfigured here. Administrators must supply and approve independent tailoring and fabric-seller rates; this screen does not choose commercial terms.</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{notice}</p>}
    <form onSubmit={create} className="rounded-xl border bg-white p-4 dark:bg-white/[0.04] dark:border-white/10 space-y-3">
      <h2 className="font-semibold">Create future-effective rule</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div><Label>Category</Label><select value={category} onChange={(event) => { setCategory(event.target.value); setCommissionBase(""); }} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"><option value="TAILORING_SERVICE">Tailoring service</option><option value="FABRIC_SALE">Fabric sale</option></select></div>
        <div><Label>Commission base (required)</Label><select required value={commissionBase} onChange={(event) => setCommissionBase(event.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"><option value="">Select basis</option>{category === "TAILORING_SERVICE" ? <option value="SERVICE_TOTAL">Service quote total</option> : <><option value="MERCHANDISE_SUBTOTAL">Merchandise subtotal (excludes delivery)</option><option value="ORDER_TOTAL">Full order total (includes delivery)</option></>}</select></div>
        <div><Label>Rate (basis points)</Label><Input required type="number" min="0" max="10000" step="1" value={rateBps} onChange={(event) => setRateBps(event.target.value)} placeholder="Admin supplied; 1000 = 10%" /></div>
        <div><Label>Fixed amount (kobo)</Label><Input required type="number" min="0" step="1" value={fixedFeeMinor} onChange={(event) => setFixedFeeMinor(event.target.value)} /></div>
        <div><Label>Currency</Label><select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 h-10 w-full rounded-xl border bg-background px-3"><option value="NGN">NGN</option></select></div>
        <div><Label>Minimum commission (kobo, optional)</Label><Input type="number" min="0" step="1" value={minimumCommissionMinor} onChange={(event) => setMinimumCommissionMinor(event.target.value)} /></div>
        <div><Label>Maximum commission (kobo, optional)</Label><Input type="number" min="0" step="1" value={maximumCommissionMinor} onChange={(event) => setMaximumCommissionMinor(event.target.value)} /></div>
        <div><Label>Tailor profile ID (optional scope)</Label><Input value={tailorProfileId} onChange={(event) => { setTailorProfileId(event.target.value); if (event.target.value) setSellerProfileId(""); }} placeholder="Blank = category-wide" /></div>
        <div><Label>Fabric seller profile ID (optional scope)</Label><Input value={sellerProfileId} onChange={(event) => { setSellerProfileId(event.target.value); if (event.target.value) setTailorProfileId(""); }} placeholder="Blank = category-wide" /></div>
        <div><Label>Effective from (optional)</Label><Input type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></div>
        <div><Label>Effective until (optional)</Label><Input type="datetime-local" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} /></div>
      </div>
      <p className="text-[11px] text-muted-foreground">Amounts in minor units (kobo). A seller-specific rule takes priority over the category-wide rule. Overlapping active periods are rejected.</p>
      <Button type="submit" size="sm" disabled={busy || !rateBps || !commissionBase}>{busy ? "Saving…" : "Create commission rule"}</Button>
    </form>
    <section className="space-y-2"><h2 className="font-semibold">Rules • {rules.length}</h2>{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rules.length === 0 ? <p className="rounded-xl border p-6 text-sm text-muted-foreground">No commission rules are configured; payable transactions remain blocked.</p> : rules.map((rule: any) => <div key={rule.id} className="rounded-xl border bg-white p-3 text-xs dark:bg-white/[0.04] dark:border-white/10">
      <div className="flex flex-wrap justify-between gap-2"><div className="font-semibold">{rule.category} • {rule.rateBps} bps ({rule.rateBps / 100}%) • base {rule.commissionBase || "UNSET"} • fixed {fmtMinor(rule.fixedFeeMinor)} • {rule.currency}</div><div>{rule.active ? "ACTIVE" : "INACTIVE"} • v{rule.version}</div></div>
      <div className="mt-1 text-muted-foreground">Scope: {rule.tailorProfile?.businessName || rule.sellerProfile?.businessName || (rule.tailorProfileId || rule.sellerProfileId || "category-wide")} • {new Date(rule.effectiveFrom).toLocaleString()} → {rule.effectiveTo ? new Date(rule.effectiveTo).toLocaleString() : "open"} • min {fmtMinor(rule.minimumCommissionMinor)} • max {fmtMinor(rule.maximumCommissionMinor)}</div>
      {rule.active && <Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => closeRule(rule.id)}>Deactivate (keep snapshots)</Button>}
    </div>)}</section>
  </div>;
}
