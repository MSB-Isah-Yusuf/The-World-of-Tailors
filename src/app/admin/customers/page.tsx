import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp?.q || "").toLowerCase().trim();
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  let where: any = { role: "CUSTOMER" as any };
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }];
  let customers: any[] = [], total = 0;
  try {
    total = await prisma.user.count({ where });
    const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take, select: { id: true, name: true, email: true, status: true, phone: true, createdAt: true } });
    // enrich with order/booking counts
    const ids = users.map(u => u.id);
    const [bookingCounts, orderCounts] = await Promise.all([
      ids.length ? prisma.tailoringBooking.groupBy({ by: ["customerId"], where: { customerId: { in: ids } }, _count: true }).then(gs => new Map(gs.map(g=> [g.customerId, g._count]))) : new Map(),
      ids.length ? prisma.fabricOrder.groupBy({ by: ["customerId"], where: { customerId: { in: ids } }, _count: true }).then(gs => new Map(gs.map(g=> [g.customerId, g._count]))) : new Map(),
    ]);
    customers = users.map(u => ({ ...u, bookings: bookingCounts.get(u.id) || 0, orders: orderCounts.get(u.id) || 0 }));
  } catch { customers = []; }
  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Customer Management</h1><p className="text-sm text-muted-foreground">All customers • bookings/orders per customer • admin read-only; no measurement exposure</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardContent className="p-4">
          <form className="flex gap-2"><input name="q" defaultValue={sp?.q||""} placeholder="Search name/email" className="h-9 rounded-xl border px-3 text-sm bg-white w-64"/><Button size="sm" type="submit">Search</Button><span className="text-xs text-muted-foreground self-center">{total} customers • page {page}</span></form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Customers • {customers.length} on page • Sensitive measurements never shown here</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {customers.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No customers for filter.</div> :
            customers.map((c:any)=><div key={c.id} className="border rounded-xl p-3 bg-white flex justify-between gap-2"><div className="text-sm flex-1"><div className="font-medium">{c.name} • {c.email} <Badge variant={c.status==="ACTIVE"?"success":"burgundy"}>{c.status}</Badge></div><div className="text-xs text-muted-foreground">{c.phone||"—"} • {c.bookings} bookings • {c.orders} fabric orders • Joined {new Date(c.createdAt).toLocaleDateString()}</div></div><div className="text-xs flex gap-2 self-center"><Link href={`/admin/users?q=${encodeURIComponent(c.email)}`} className="underline">Open in Users →</Link></div></div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/customers?page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{customers.length===take && <Link href={`/admin/customers?page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
