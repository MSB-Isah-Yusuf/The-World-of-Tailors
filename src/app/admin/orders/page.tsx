import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = sp?.status || "";
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;

  let where: any = {};
  if (status) where.status = status;

  let orders: any[] = [], bookings: any[] = [], totalOrders = 0;
  try {
    totalOrders = await prisma.fabricOrder.count({ where });
    orders = await prisma.fabricOrder.findMany({ where, include: { items: true, seller: { select: { businessName: true } }, customer: { select: { email: true, name: true } } }, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take });
    bookings = await prisma.tailoringBooking.findMany({ orderBy: { updatedAt: "desc" }, take: 6, select: { reference: true, status: true, paymentStatus: true } });
  } catch { orders = []; }

  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><h1 className="font-display text-2xl">Order Oversight</h1><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Fabric Orders</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{totalOrders}</div><div className="text-xs text-muted-foreground">Pending/Confirmed split via delivery status</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Booking Snapshot</CardTitle></CardHeader><CardContent><div className="text-xs space-y-1">{bookings.map((b:any) => <div key={b.reference} className="flex justify-between"><span>{b.reference}</span><Badge variant="secondary" className="text-[11px]">{b.status} • {b.paymentStatus}</Badge></div>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Filters</CardTitle></CardHeader><CardContent className="flex gap-2 flex-wrap">{["", "PENDING","CONFIRMED","PREPARING","READY_FOR_DISPATCH","IN_TRANSIT","DELIVERED","CANCELLED"].map(s => <Link key={s||"all"} href={s?`/admin/orders?status=${s}`:"/admin/orders"} className={`px-3 py-1.5 rounded-full border text-xs ${status===s?"bg-midnight text-white":"bg-white"}`}>{s||"ALL"}</Link>)}</CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle className="text-sm">Recent Fabric Orders • Admin sees all sellers (oversight, no mutation here)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {orders.length === 0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No orders — create one via /checkout (cart is per-user).</div> :
            orders.map((o:any) => (
              <div key={o.id} className="border rounded-xl p-3 bg-white space-y-2">
                <div className="flex justify-between text-sm"><span className="font-medium">{o.reference} • ₦{Number(o.total).toLocaleString()} • {o.deliveryType} → {o.seller?.businessName}</span><Badge variant={o.paymentStatus==="PAID"?"success":o.status==="CANCELLED"?"muted":"secondary"}>{o.status} • {o.paymentStatus}</Badge></div>
                <div className="text-xs text-muted-foreground">{o.customer?.name} ({o.customer?.email}) • {o.items.length} item(s): {o.items.map((i:any)=>`${i.productName} ×${i.quantity}`).join(", ")} • {new Date(o.createdAt).toLocaleString()}</div>
                <div className="text-xs">Delivery: {(o.deliveryAddress as any)?.street || "—"} • TailorDest: {o.tailorDestinationId ? String(o.tailorDestinationId).slice(0,8) : "—"}</div>
              </div>
            ))}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/orders?status=${status}&page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{orders.length===take && <Link href={`/admin/orders?status=${status}&page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
