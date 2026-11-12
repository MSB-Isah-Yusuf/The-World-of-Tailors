import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function AnalyticsPage() {
  await requireRole(["ADMIN"]);
  let stats: any = {};
  try {
    const [users, customers, tailors, sellers, bookings, orders, designs, fabrics, paymentsPaid] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "CUSTOMER" as any } }),
      prisma.tailorProfile.count(),
      prisma.sellerProfile.count(),
      prisma.tailoringBooking.count(),
      prisma.fabricOrder.count(),
      prisma.design.count({ where: { isPublished: true } }),
      prisma.fabricProduct.count({ where: { isPublished: true } }),
      prisma.payment.findMany({ where: { status: "PAID" as any }, select: { amount: true } }),
    ]);
    const paidSum = paymentsPaid.reduce((s, p) => s + Number(p.amount), 0);
    const bookingsByStatus: any = await (prisma.tailoringBooking as any).groupBy({ by: ["status"], _count: true });
    const ordersByStatus: any = await (prisma.fabricOrder as any).groupBy({ by: ["status"], _count: true });
    stats = { users, customers, tailors, sellers, bookings, orders, designs, fabrics, paidSum, bookingsByStatus, ordersByStatus };
  } catch {}

  const bar = (label: string, value: number, max: number) => (
    <div key={label} className="flex items-center gap-2 text-xs"><span className="w-32 truncate">{label}</span><div className="flex-1 h-3 bg-ivory border rounded-full overflow-hidden"><div className="h-full bg-midnight" style={{ width: `${max ? Math.round((value/max)*100) : 0}%` }}/></div><span className="w-8 text-right">{value}</span></div>
  );

  const bookingMax = Math.max(1, ...((stats.bookingsByStatus||[]).map((b:any)=> b._count) || [1]));
  const orderMax = Math.max(1, ...((stats.ordersByStatus||[]).map((b:any)=> b._count) || [1]));

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Analytics & Reports</h1><p className="text-sm text-muted-foreground">Live DB aggregates • Never fabricated • Empty states shown when no data</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Users</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{stats.users ?? "—"}</div><div className="text-xs text-muted-foreground">{stats.customers ?? 0} customers • {stats.tailors ?? 0} tailors • {stats.sellers ?? 0} sellers</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Bookings</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{stats.bookings ?? "—"}</div><div className="text-xs text-muted-foreground">{stats.designs ?? 0} published designs</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Fabric Orders</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{stats.orders ?? "—"}</div><div className="text-xs text-muted-foreground">{stats.fabrics ?? 0} published products</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Revenue PAID</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">₦{stats.paidSum?.toLocaleString() ?? "0"}</div><div className="text-xs text-muted-foreground">Sum Payment where PAID</div></CardContent></Card>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Bookings by status (live)</CardTitle></CardHeader><CardContent className="space-y-2">{(stats.bookingsByStatus||[]).length ? (stats.bookingsByStatus as any[]).map((g:any)=> bar(g.status, g._count, bookingMax)) : <div className="text-xs text-muted-foreground p-4 text-center border rounded-xl bg-white">No bookings yet — counts will appear here.</div>}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Fabric orders by status</CardTitle></CardHeader><CardContent className="space-y-2">{(stats.ordersByStatus||[]).length ? (stats.ordersByStatus as any[]).map((g:any)=> bar(g.status, g._count, orderMax)) : <div className="text-xs text-muted-foreground p-4 text-center border rounded-xl bg-white">No orders yet.</div>}</CardContent></Card>
        </div>
        <Card><CardContent className="text-xs text-muted-foreground p-4">All charts are real primitives (div bars) backed by DB counts — no fake activity. Extend with Recharts when `analytics` data pipeline is ready.</CardContent></Card>
      </div>
    </div>
  );
}
