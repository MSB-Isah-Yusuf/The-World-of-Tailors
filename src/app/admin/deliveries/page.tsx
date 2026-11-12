import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function AdminDeliveriesPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = sp?.status || "";
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  let where: any = {};
  if (status) where.status = status;
  let deliveries: any[] = [], total = 0;
  try {
    total = await prisma.delivery.count({ where });
    deliveries = await prisma.delivery.findMany({ where, include: { fabricOrder: { select: { reference: true, customer: { select: { name: true, email: true } } } } } as any, orderBy: { createdAt: "desc" } as any, skip: (page-1)*take, take } as any);
  } catch { deliveries = []; }
  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Deliveries</h1><p className="text-sm text-muted-foreground">Track fabric + tailoring deliveries • Read-only oversight • Separate from production statuses</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <div className="flex flex-wrap gap-2 text-xs">{["", "PENDING","CONFIRMED","PREPARING","READY_FOR_DISPATCH","IN_TRANSIT","DELIVERED","FAILED_DELIVERY"].map(s => <Link key={s||"all"} href={s?`/admin/deliveries?status=${s}`:"/admin/deliveries"} className={`px-3 py-1.5 rounded-full border ${status===s?"bg-midnight text-white":"bg-white"}`}>{s||"ALL"}</Link>)}<span className="text-xs text-muted-foreground self-center ml-2">{total} deliveries</span></div>
        <Card><CardHeader><CardTitle className="text-sm">Deliveries • {deliveries.length} on page — trackingCode + history preserved</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {deliveries.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No deliveries for filter — checkout creates one per seller order.</div> :
            deliveries.map((d:any)=><div key={d.id} className="border rounded-xl p-3 bg-white">
              <div className="flex justify-between text-sm"><span className="font-medium">{d.trackingCode||d.id.slice(0,8)} • {d.type} • {d.fabricOrder?.reference||d.bookingId?.slice(0,8)||"—"} <Badge variant={d.status==="DELIVERED"?"success":d.status==="IN_TRANSIT"?"plum":"secondary"}>{d.status}</Badge></span><span className="text-xs text-muted-foreground">{d.fabricOrder?.customer?.email || "—"}</span></div>
              <div className="text-xs text-muted-foreground">{(d.address as any)?.street || "—"} • {(d.address as any)?.city || ""} • Created {new Date(d.createdAt).toLocaleString()}</div>
            </div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/deliveries?page=${page-1}${status?`&status=${status}`:""}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{deliveries.length===take && <Link href={`/admin/deliveries?page=${page+1}${status?`&status=${status}`:""}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
