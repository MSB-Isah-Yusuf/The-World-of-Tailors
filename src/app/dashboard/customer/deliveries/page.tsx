import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export default async function CustomerDeliveries() {
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  let deliveries: any[] = [];
  try { const orders = await prisma.fabricOrder.findMany({ where: { customerId: uid }, select: { id: true } }); const ids = orders.map(o=>o.id); if (ids.length) deliveries = await prisma.delivery.findMany({ where: { fabricOrderId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 20, include: { fabricOrder: { select: { reference: true } } } as any }); } catch {}
  return (
    <AdvancedCustomerShell title="Delivery Tracking">
      <div className="space-y-6 max-w-4xl">
        <div><h1 className="font-display text-2xl">Delivery Tracking</h1><p className="text-sm text-muted-foreground">Fabric orders separately tracked • Tailoring delivery separate from production</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Active deliveries • {deliveries.length}</CardTitle></CardHeader><CardContent className="space-y-2">{deliveries.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No deliveries — created on checkout per seller; status updates via webhook & seller advance.</div> : deliveries.map((d:any)=><div key={d.id} className="border rounded-xl p-3 bg-white"><div className="flex justify-between text-sm"><span className="font-medium">{d.trackingCode||d.id.slice(0,8)} • {d.type} • {d.fabricOrder?.reference} <Badge variant={d.status==="DELIVERED"?"success":"secondary"}>{d.status}</Badge></span><span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</span></div><div className="text-xs text-muted-foreground">{(d.address as any)?.street || "—"} • {(d.address as any)?.city || ""}</div></div>)}</CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
