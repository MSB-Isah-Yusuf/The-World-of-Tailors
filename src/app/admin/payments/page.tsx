import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = sp?.status || "";
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  let where: any = {};
  if (status) where.status = status as any;
  let payments: any[] = [], total = 0, totalPaid = 0;
  try {
    total = await prisma.payment.count({ where });
    payments = await prisma.payment.findMany({ where, include: { fabricOrder: { select: { reference: true } }, booking: { select: { reference: true } } }, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take });
    const paid = await prisma.payment.findMany({ where: { status: "PAID" as any }, select: { amount: true } });
    totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0);
  } catch { payments = []; }
  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Payments & Transactions</h1><p className="text-sm text-muted-foreground">Ledger • Never mark PAID from client — webhook only • Idempotent • Commissions/payouts next</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Total Transactions</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{total}</div><div className="text-xs text-muted-foreground">All payment records</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Total Paid (NGN)</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">₦{totalPaid.toLocaleString()}</div><div className="text-xs text-muted-foreground">Sum where status=PAID</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Provider</CardTitle></CardHeader><CardContent><div className="text-sm font-medium">Paystack • Verified via webhook HMAC</div><div className="text-xs text-muted-foreground">Never trust browser redirect</div></CardContent></Card>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">{["", "PENDING","PAID","FAILED"].map(s => <Link key={s||"all"} href={s?`/admin/payments?status=${s}`:"/admin/payments"} className={`px-3 py-1.5 rounded-full border ${status===s?"bg-midnight text-white":"bg-white"}`}>{s||"ALL"}</Link>)}<span className="text-xs text-muted-foreground self-center ml-2">{total} payments</span></div>
        <Card><CardHeader><CardTitle className="text-sm">Payments • {payments.length} on page — idempotent, webhook-only PAID</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {payments.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No payments for filter.</div> :
            payments.map((p:any)=><div key={p.id} className="border rounded-xl p-3 bg-white">
              <div className="flex justify-between text-sm"><span className="font-medium">{p.reference} • ₦{Number(p.amount).toLocaleString()} {p.currency} <Badge variant={p.status==="PAID"?"success":p.status==="PENDING"?"warning":"burgundy"}>{p.status}</Badge></span><span className="text-xs text-muted-foreground">{p.provider} {p.providerRef?`• ${String(p.providerRef).slice(0,12)}`:""}</span></div>
              <div className="text-xs text-muted-foreground">Order {p.fabricOrder?.reference||"—"} • Booking {p.booking?.reference||"—"} • {new Date(p.createdAt).toLocaleString()}</div>
            </div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/payments?page=${page-1}${status?`&status=${status}`:""}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{payments.length===take && <Link href={`/admin/payments?page=${page+1}${status?`&status=${status}`:""}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
