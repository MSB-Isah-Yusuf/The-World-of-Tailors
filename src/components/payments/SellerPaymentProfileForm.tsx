"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentProfile = {
  id: string; accountHolderName?: string | null; bankName?: string | null; bankCode?: string | null;
  maskedAccountNumber?: string | null; currency?: string; verificationStatus: string; payoutEligible: boolean;
  settlementPolicy: string; updatedAt?: string;
};
type Bank = { code: string; name: string };

export function SellerPaymentProfileForm() {
  const [profile, setProfile] = useState<PaymentProfile | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadProfile() {
    const response = await fetch("/api/seller/payment-profile", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok) {
      setProfile(body.item || null);
      setAccountHolderName(body.item?.accountHolderName || "");
      setBankCode(body.item?.bankCode || "");
      setBankName(body.item?.bankName || "");
    }
  }
  useEffect(() => {
    loadProfile().catch(() => {});
    fetch("/api/seller/payment-profile/banks", { cache: "no-store" }).then((res) => res.json()).then((body) => setBanks(body.items || [])).catch(() => {});
  }, []);

  const selectedBank = banks.find((bank) => bank.code === bankCode);
  async function saveBankAccount(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/seller/payment-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankCode, accountNumber, accountHolderName }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Account verification failed");
      setProfile(body.item); setAccountNumber("");
      setNotice(body.item?.message || "Bank ownership resolved with Paystack. Payout eligibility remains admin-controlled.");
    } catch (reason: any) { setError(reason.message || "Could not verify bank account"); }
    setBusy(false);
  }

  async function provisionDestination() {
    if (!accountNumber || !bankCode) { setError("Re-enter the full account number and bank code for provider setup. Full account details are never stored here."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/seller/payment-profile/provision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bankCode, accountNumber }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Provider destination setup failed");
      setProfile((old) => old ? { ...old, ...body.item } : old); setAccountNumber("");
      setNotice(body.message || "Paystack destination created; settlement eligibility still requires admin approval.");
    } catch (reason: any) {
      setError(reason.message || "Provider setup failed. If the result is uncertain, do not retry until an administrator reconciles Paystack.");
      if (String(reason.message || "").includes("reconciliation")) setAccountNumber("");
    }
    setBusy(false);
  }

  const canProvision = profile?.verificationStatus === "BANK_VERIFIED" && profile?.settlementPolicy !== "DISABLED" && !profile?.payoutEligible;
  return <div className="space-y-4">
    <form onSubmit={saveBankAccount} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label htmlFor="paystack-bank">Bank</Label>{banks.length ? <select id="paystack-bank" value={bankCode} onChange={(event) => { const bank = banks.find((item) => item.code === event.target.value); setBankCode(event.target.value); setBankName(bank?.name || ""); }} className="mt-1 h-10 w-full rounded-xl border bg-background px-3 text-sm"><option value="">Select a bank</option>{banks.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}</select> : <Input id="paystack-bank" value={bankCode} onChange={(event) => setBankCode(event.target.value)} placeholder="Paystack bank code" />}</div>
        {!banks.length && <div><Label htmlFor="paystack-bank-name">Bank name</Label><Input id="paystack-bank-name" value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Bank name" /></div>}
        <div><Label htmlFor="paystack-account">Account number</Label><Input id="paystack-account" type="password" autoComplete="off" inputMode="numeric" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Enter account number" /></div>
        <div><Label htmlFor="paystack-account-name">Account holder name (optional check)</Label><Input id="paystack-account-name" value={accountHolderName} onChange={(event) => setAccountHolderName(event.target.value)} placeholder="Must match provider name" /></div>
      </div>
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={busy || !bankCode || !accountNumber}>{busy ? "Verifying…" : "Verify & save masked account"}</Button>{canProvision && <Button type="button" size="sm" variant="outline" disabled={busy || !accountNumber || !bankCode} onClick={provisionDestination}>{busy ? "Working…" : "Request provider destination setup"}</Button>}</div>
      <p className="text-xs text-muted-foreground">Account number is sent to Paystack for verification and is not stored in this app. Settlement route, recipient/subaccount references and payout eligibility are controlled by administrators.</p>
    </form>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{notice}</p>}
    {profile && <div className="rounded-xl border p-3 text-xs space-y-1">
      <div><strong>Verified bank:</strong> {profile.bankName || selectedBank?.name || profile.bankCode} • {profile.maskedAccountNumber || "No account saved"} • {profile.accountHolderName || "—"}</div>
      <div><strong>Verification:</strong> {profile.verificationStatus} • <strong>Settlement route:</strong> {profile.settlementPolicy} • <strong>Payout eligible:</strong> {profile.payoutEligible ? "Yes (administrator authorized)" : "No"}</div>
      {profile.verificationStatus === "PROVISIONING_UNKNOWN" && <p className="text-amber-800">A provider creation result is uncertain. Do not retry; an administrator must reconcile the Paystack dashboard first.</p>}
      {profile.verificationStatus === "VERIFIED" && !profile.payoutEligible && <p className="text-muted-foreground">Provider destination is verified. Await administrator authorization before accepting payments or requesting payouts.</p>}
    </div>}
  </div>;
}
