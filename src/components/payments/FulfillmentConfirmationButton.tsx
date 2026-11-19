"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FulfillmentConfirmationButton({ kind, recordId }: { kind: "FABRIC_ORDER" | "TAILORING_BOOKING"; recordId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = kind === "FABRIC_ORDER" ? `/api/v1/orders/${recordId}/confirm-delivery` : `/api/v1/bookings/${recordId}/confirm-completion`;
  async function confirm() {
    if (!window.confirm(kind === "FABRIC_ORDER" ? "Confirm that you received this fabric order?" : "Confirm that the tailoring work was completed and collected?") ) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Confirmation could not be recorded");
      window.location.reload();
    } catch (reason: any) { setError(reason.message || "Confirmation failed"); setBusy(false); }
  }
  return <div className="space-y-1">
    <Button size="sm" onClick={confirm} disabled={busy}>{busy ? "Recording confirmation…" : kind === "FABRIC_ORDER" ? "Confirm delivery received" : "Confirm work completed & collected"}</Button>
    <p className="text-[11px] text-muted-foreground">Customer confirmation can move a controlled-payout ledger allocation to payable; it does not itself move funds or create escrow.</p>
    {error && <p role="alert" className="text-xs text-burgundy">{error}</p>}
  </div>;
}
