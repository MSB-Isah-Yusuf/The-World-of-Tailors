import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function SellerDeliveries() {
  await requireRole(["FABRIC_SELLER"]);
  const session = await (await import("@/lib/auth")).auth();
  const profile: any = await prisma.sellerProfile.findUnique({ where: { userId: (session as any).user.id } });
  let deliveries: any[] = [];
  try {
    const orders = await prisma.fabricOrder.findMany({ where: { sellerId: profile.id }, select: { id: true } });
    const ids = orders.map(o=>o.id);
    if (ids.length) deliveries = await prisma.delivery.findMany({ where: { fabricOrderId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 20, include: { fabricOrder: { select: { reference: true, deliveryType: true, customer: { select: { name: true } } } } } as any } as any);
  } catch {}
  return (
    <AdvancedSellerShell title="Deliveries">
      <div className="space-y-6 max-w-4xl">
        <div><h1 className="font-display text-2xl">Deliveries • {profile?.businessName}</h1><p className="text-sm text-muted-foreground">Home delivery vs. to-tailor • Handover tracking • Fabric delivery separate from tailoring production</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Active deliveries • {deliveries.length}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {deliveries.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No deliveries yet — they’re created on checkout per seller order; dispatch updates appear here.</div> :
            deliveries.map((d:any)=><div key={d.id} className="border rounded-xl p-3 bg-white">
              <div className="flex justify-between text-sm"><span className="font-medium">{d.trackingCode||d.id.slice(0,8)} • {d.type} • {d.fabricOrder?.reference} <Badge variant={d.status==="DELIVERED"?"success":d.status==="IN_TRANSIT"?"plum":"secondary"}>{d.status}</Badge></span><span className="text-xs text-muted-foreground">{d.fabricOrder?.customer?.name||"—"}</span></div>
              <div className="text-xs text-muted-foreground">{(d.address as any)?.street || "—"} • {d.fabricOrder?.deliveryType||d.type} • Created {new Date(d.createdAt).toLocaleString()}</div>
            </div>)}
          </CardContent></Card>
      </div>
    </AdvancedSellerShell>
  );
}
