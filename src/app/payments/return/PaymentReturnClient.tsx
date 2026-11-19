"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PaymentReturnClient({ reference }: { reference: string }) {
  const [status, setStatus] = useState<"VERIFYING" | "PAID" | "PENDING" | "FAILED">("VERIFYING");
  const [message, setMessage] = useState("Confirming your payment directly with Paystack…");

  useEffect(() => {
    if (!reference) { setStatus("FAILED"); setMessage("No payment reference was returned."); return; }
    let cancelled = false;
    fetch("/api/paystack/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.ok && json.status === "PAID") { setStatus("PAID"); setMessage("Your payment has been verified. You can return to your order or booking."); }
        else if (json.status && ["pending", "ongoing", "processing"].includes(String(json.status).toLowerCase())) { setStatus("PENDING"); setMessage("Paystack is still processing this payment. Your order will update after confirmation; do not pay again yet."); }
        else { setStatus("FAILED"); setMessage(json.message || json.error || "We could not confirm this payment. No success is assumed from the redirect alone."); }
      })
      .catch(() => { if (!cancelled) { setStatus("PENDING"); setMessage("We could not reach the verification service. Check your payment history shortly; do not retry until its status is clear."); } });
    return () => { cancelled = true; };
  }, [reference]);

  const badge = status === "PAID" ? "Payment successful" : status === "VERIFYING" ? "Verifying payment" : status === "PENDING" ? "Payment processing" : "Payment not confirmed";
  return <main className="min-h-[60vh] grid place-items-center p-6"><Card className="w-full max-w-lg"><CardHeader><CardTitle>{badge}</CardTitle><p className="text-sm text-muted-foreground">Reference: <code>{reference || "—"}</code></p></CardHeader><CardContent className="space-y-4"><p className="text-sm">{message}</p><div className="flex flex-wrap gap-2"><Link href="/dashboard/customer/orders"><Button>My fabric orders</Button></Link><Link href="/dashboard/customer/bookings"><Button variant="outline">My bookings</Button></Link></div></CardContent></Card></main>;
}
