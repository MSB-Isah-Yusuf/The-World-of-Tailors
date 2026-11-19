"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AdminAttemptVerifyButton({ reference }: { reference: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const verify = async () => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const result = await response.json().catch(() => ({}));
      const state = String(result.status || result.error || "unknown");
      const normalizedState = state.toUpperCase();
      setMessage(response.ok ? `Provider verification: ${state}.` : `${result.error || "Verification unavailable"}: ${result.message || state}.`);
      if (response.ok || ["FAILED", "ABANDONED", "REVERSED", "REVIEW_REQUIRED"].includes(normalizedState)) router.refresh();
    } catch {
      setMessage("Verification unavailable. Keep this attempt blocked and reconcile the same reference; do not issue another one.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="mt-2 flex flex-wrap items-center gap-2">
    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={verify}>
      {busy ? "Checking same reference…" : "Verify same Paystack reference"}
    </Button>
    {message && <span role="status" className="text-xs text-muted-foreground">{message}</span>}
  </div>;
}
