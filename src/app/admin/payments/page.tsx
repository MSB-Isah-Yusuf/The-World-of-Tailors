import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { formatNgn } from "@/lib/payments/money";
import { AdminAttemptVerifyButton } from "@/components/payments/AdminAttemptVerifyButton";

const ACTIVE_ATTEMPT_STATES = ["INITIALIZING", "INITIALIZATION_UNKNOWN", "AWAITING_CUSTOMER", "PENDING", "PROCESSING", "ONGOING"];

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = sp?.status || "";
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  const where: any = status ? { status } : {};
  let payments: any[] = [];
  let total = 0;
  let verifiedPaidTotal = 0n;
  let unresolvedAttempts = 0;
  try {
    const [count, rows, verifiedRows, unresolved] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        include: {
          fabricOrder: { select: { reference: true } },
          booking: { select: { reference: true } },
          attempts: { select: { id: true, providerReference: true, attemptNumber: true, status: true, createdAt: true }, orderBy: { attemptNumber: "desc" }, take: 5 },
        },
        orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take,
      }),
      prisma.payment.findMany({ where: { status: "PAID", currency: "NGN", verifiedAt: { not: null }, providerTransactionId: { not: null }, amountMinor: { not: null } }, select: { amountMinor: true } }),
      prisma.paymentAttempt.count({ where: { status: { in: ACTIVE_ATTEMPT_STATES }, authorizationUrl: null } }),
    ]);
    total = count;
    payments = rows;
    verifiedPaidTotal = verifiedRows.reduce((sum: bigint, payment: any) => sum + BigInt(payment.amountMinor), 0n);
    unresolvedAttempts = unresolved;
  } catch {
    payments = [];
  }

  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between gap-3"><div><h1 className="font-display text-2xl">Payments & transactions</h1><p className="text-sm text-muted-foreground">Only backend-verified Paystack captures count as verified. Legacy `PAID` markers without verification evidence are not included in the verified total.</p></div><Link href="/admin/finance" className="text-sm underline">Finance controls</Link></div>
        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Payment records</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{total}</div><div className="text-xs text-muted-foreground">All records for filter</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Verified paid total (NGN)</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{formatNgn(verifiedPaidTotal)}</div><div className="text-xs text-muted-foreground">Requires provider transaction ID and verification timestamp</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Unresolved attempts</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{unresolvedAttempts}</div><div className="text-xs text-muted-foreground">Active attempts without a checkout URL; verify the same provider reference, never create a replacement while unresolved</div></CardContent></Card>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">{["", "PENDING", "PAID", "FAILED", "REVIEW_REQUIRED"].map((value) => <Link key={value || "all"} href={value ? `/admin/payments?status=${value}` : "/admin/payments"} className={`px-3 py-1.5 rounded-full border ${status === value ? "bg-midnight text-white" : "bg-white"}`}>{value || "ALL"}</Link>)}<span className="text-xs text-muted-foreground self-center ml-2">{total} payments</span></div>
        <Card><CardHeader><CardTitle className="text-sm">Payment records • {payments.length} on page</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {payments.length === 0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No payments for filter.</div> : payments.map((payment: any) => {
              const verified = Boolean(payment.verifiedAt && payment.providerTransactionId);
              const amount = payment.amountMinor != null ? formatNgn(payment.amountMinor) : `Legacy amount ₦${Number(payment.amount).toLocaleString()}`;
              return <div key={payment.id} className="border rounded-xl p-3 bg-white">
                <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{payment.reference} • {amount} {payment.currency} <Badge variant={payment.status === "PAID" && verified ? "success" : payment.status === "PENDING" ? "warning" : "burgundy"}>{payment.status}{payment.status === "PAID" && !verified ? " • legacy/review evidence missing" : ""}</Badge></span><span className="text-xs text-muted-foreground">{payment.provider} {payment.providerRef ? `• ${String(payment.providerRef).slice(0, 18)}` : ""}</span></div>
                <div className="text-xs text-muted-foreground">Order {payment.fabricOrder?.reference || "—"} • Booking {payment.booking?.reference || "—"} • Created {new Date(payment.createdAt).toLocaleString()}{payment.verifiedAt ? ` • Verified ${new Date(payment.verifiedAt).toLocaleString()}` : ""}</div>
                {payment.attempts?.length > 0 && <div className="mt-2 border-t pt-2 space-y-2">{payment.attempts.map((attempt: any) => <div key={attempt.id} className="rounded-lg bg-ivory/70 p-2 text-xs"><div className="flex flex-wrap justify-between gap-2"><span>Attempt {attempt.attemptNumber} • {attempt.status} • {new Date(attempt.createdAt).toLocaleString()}</span><code>{attempt.providerReference}</code></div>{ACTIVE_ATTEMPT_STATES.includes(String(attempt.status).toUpperCase()) && <AdminAttemptVerifyButton reference={attempt.providerReference} />}</div>)}</div>}
              </div>;
            })}
            <div className="flex gap-2 pt-2 text-xs">{page > 1 && <Link href={`/admin/payments?page=${page - 1}${status ? `&status=${status}` : ""}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{payments.length === take && <Link href={`/admin/payments?page=${page + 1}${status ? `&status=${status}` : ""}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
