"use client";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function ResetForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = sp.get("token")||"";
  const emailQ = sp.get("email")||"";
  const [email, setEmail] = useState(emailQ);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (password !== confirm) { setErr("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ email, token, password }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg(j.message + " — redirecting to login…");
      setTimeout(()=> router.push("/login"), 1200);
    } catch (e:any) { setErr(e.message); }
    setLoading(false);
  };

  if (!token) return <Card><CardContent className="p-6 text-sm">Missing token — request a new link at <Link href="/forgot-password" className="underline">Forgot password</Link></CardContent></Card>;

  return (
    <Card><CardHeader><CardTitle>Set new password</CardTitle><p className="text-sm text-muted-foreground">Token single-use • 1h expiry • min 8 chars</p></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Email</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div><Label>New password</Label><Input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" minLength={8} /></div>
          <div><Label>Confirm</Label><Input type="password" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="••••••••" /></div>
          <Button className="w-full" disabled={loading}>{loading ? "Updating…" : "Update password"}</Button>
          {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
          {err && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{err}</div>}
          <p className="text-xs text-muted-foreground">After reset, old sessions remain but token is deleted — use new password at <Link href="/login" className="underline">/login</Link></p>
        </form>
      </CardContent></Card>
  );
}

export default function ResetPasswordPage(){
  return <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader /><div className="mx-auto max-w-md px-6 py-12"><Suspense><ResetForm /></Suspense></div></div>;
}
