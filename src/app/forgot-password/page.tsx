"use client";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr(""); setMsg("");
    try {
      const res = await fetch("/api/forgot-password", { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ email }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg(j.message || "Check your inbox — link sent. In dev, check server console for link.");
    } catch (e:any) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader /><div className="mx-auto max-w-md px-6 py-12">
      <Card><CardHeader><CardTitle>Reset password</CardTitle><p className="text-sm text-muted-foreground">Single-use token • 1h expiry • rate-limited 5/15m • emailed via RESEND or console in dev</p></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Email</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></div>
            <Button className="w-full" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
            {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}<br/><span className="text-muted-foreground">Dev mode (EMAIL_PROVIDER=console): check Vercel Logs / local terminal for the full URL like <code>/reset-password?token=…</code></span></div>}
            {err && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{err}</div>}
            <p className="text-xs text-muted-foreground">Email via {process.env.NEXT_PUBLIC_EMAIL_PROVIDER || "console"} • On Vercel set <code>RESEND_API_KEY + EMAIL_FROM + EMAIL_PROVIDER=resend</code> to actually send. Link expires in 1h, single-use.</p>
          </form>
        </CardContent></Card>
    </div></div>
  );
}
