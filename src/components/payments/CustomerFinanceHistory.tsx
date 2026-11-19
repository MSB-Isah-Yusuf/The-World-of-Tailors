"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatNgn } from "@/lib/payments/money";

export function CustomerFinanceHistory({ kind }: { kind: "refunds" | "disputes" }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/customer/${kind}`, { cache: "no-store" }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not load financial requests");
      setItems(body.items || []);
    }).catch((reason) => setError(reason.message || "Could not load requests")).finally(() => setLoading(false));
  }, [kind]);
  return <div className="space-y-3">{error && <p role="alert" className="text-sm text-burgundy">{error}</p>}{loading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.length === 0 ? <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">No {kind} have been submitted yet. Requests are available from a paid booking or order detail.</div> : items.map((item: any) => {
    const payment = item.payment || {};
    return <div key={item.id} className="rounded-xl border bg-white p-4 dark:bg-white/[0.04] dark:border-white/10"><div className="flex flex-wrap justify-between gap-2"><div className="font-semibold">{kind === "refunds" ? item.reference : payment.reference || item.paymentId} • {kind === "refunds" ? formatNgn(BigInt(item.amountMinor)) : item.status}</div><span className="h-fit rounded-full border px-2 py-1 text-xs">{item.status}</span></div><div className="mt-1 text-xs text-muted-foreground">Payment {payment.reference || item.paymentId} • {payment.status || "—"} • {payment.amountMinor ? formatNgn(BigInt(payment.amountMinor)) : ""} {payment.currency || ""}</div><p className="mt-2 text-sm">{item.reason || item.resolution || "—"}</p>{kind === "refunds" && item.providerResponseSummary && <div className="mt-2 text-[11px] text-muted-foreground">Provider status summary: {String(item.providerResponseSummary.status || item.providerResponseSummary.state || "pending")}</div>}{kind === "disputes" && item.resolution && <p className="mt-2 text-xs">Resolution: {item.resolution}</p>}<div className="mt-2 text-[11px] text-muted-foreground">Submitted {new Date(item.createdAt).toLocaleString()}{item.resolvedAt ? ` • resolved ${new Date(item.resolvedAt).toLocaleString()}` : ""}</div><Link href={payment.booking ? `/dashboard/customer/bookings/${payment.booking.id}` : payment.fabricOrder ? `/dashboard/customer/orders/${payment.fabricOrder.id}` : "/dashboard/customer/orders"} className="mt-2 inline-block text-xs underline">Open payment/order details</Link></div>;
  })}</div>;
}
