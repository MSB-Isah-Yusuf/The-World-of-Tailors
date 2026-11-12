import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function advanceOrder(formData: FormData) {
  "use server";
  const session = await requireRole(["FABRIC_SELLER"]);
  const id = String(formData.get("id") || "");
  const to = String(formData.get("to") || "") as any;
  const note = String(formData.get("note") || "").slice(0,300);
  const profile: any = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  const order: any = await prisma.fabricOrder.findUnique({ where: { id } });
  if (!profile || !order || order.sellerId !== profile.id) return;
  const allowed: Record<string,string[]> = { PENDING:["CONFIRMED","CANCELLED"], CONFIRMED:["PREPARING","CANCELLED"], PREPARING:["READY_FOR_DISPATCH","CANCELLED"], READY_FOR_DISPATCH:["IN_TRANSIT"], IN_TRANSIT:["DELIVERED","FAILED_DELIVERY"], FAILED_DELIVERY:["IN_TRANSIT","CANCELLED"] };
  if (!allowed[order.status]?.includes(to)) return;
  await prisma.fabricOrder.update({ where: { id }, data: { status: to } });
  await prisma.delivery.updateMany({ where: { fabricOrderId: id }, data: { status: to } });
  await prisma.notification.create({ data: { userId: order.customerId, title: `Order ${to}`, message: `${order.reference} is now ${to} ${note?"— "+note:""}`, type: "order", link: "/dashboard/customer/orders" } });
  revalidatePath(`/dashboard/seller/orders/${id}`);
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["FABRIC_SELLER"]);
  const { id } = await params;
  const session = await (await import("@/lib/auth")).auth();
  const profile: any = await prisma.sellerProfile.findUnique({ where: { userId: (session as any).user.id } });
  let order: any = null;
  try { order = await prisma.fabricOrder.findUnique({ where: { id }, include: { items: true, deliveries: true, customer: { select: { name: true, email: true } } } }); } catch {}
  if (!order || order.sellerId !== profile?.id) return <AdvancedSellerShell title="Order"><div className="p-6">Order not found or not yours.</div></AdvancedSellerShell>;
  const allowed: Record<string,string[]> = { PENDING:["CONFIRMED","CANCELLED"], CONFIRMED:["PREPARING","CANCELLED"], PREPARING:["READY_FOR_DISPATCH","CANCELLED"], READY_FOR_DISPATCH:["IN_TRANSIT"], IN_TRANSIT:["DELIVERED","FAILED_DELIVERY"] };
  const next = allowed[order.status] || [];
  return (
    <AdvancedSellerShell title="Order Details">
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">{order.reference} • {order.customer?.name}</h1><p className="text-sm text-muted-foreground">{order.deliveryType} • {(order.deliveryAddress as any)?.street || "—"} • {(order.deliveryAddress as any)?.city || ""} • TailorDest {order.tailorDestinationId?.slice(0,8) || "—"}</p></div><Badge variant={order.status==="DELIVERED"?"success":order.status==="PENDING"?"warning":"secondary"}>{order.status} • {order.paymentStatus}</Badge></div>
        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Subtotal</CardTitle></CardHeader><CardContent>₦{Number(order.subtotal).toLocaleString()}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Delivery Fee</CardTitle></CardHeader><CardContent>₦{Number(order.deliveryFee).toLocaleString()}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent className="font-semibold">₦{Number(order.total).toLocaleString()}</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-sm">Items • {order.items.length} • Unit visible throughout marketplace</CardTitle></CardHeader>
          <CardContent className="space-y-2">{order.items.map((i:any)=><div key={i.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><span>{i.productName} • {i.quantity} {i.unit} × ₦{Number(i.priceSnapshot).toLocaleString()}</span><span>₦{Number(i.lineTotal).toLocaleString()}</span></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Delivery • {order.deliveries?.length || 0} record(s)</CardTitle></CardHeader>
          <CardContent className="space-y-2">{(order.deliveries||[]).length ? order.deliveries.map((d:any)=><div key={d.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><span>{d.trackingCode} • {d.type} <Badge variant="secondary">{d.status}</Badge></span><span className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleString()}</span></div>) : <div className="text-xs text-muted-foreground">No delivery history — created at checkout.</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Advance • Validated transitions only</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">{next.length ? next.map((to:any)=><form key={to} action={advanceOrder} className="flex gap-2"><input type="hidden" name="id" value={order.id}/><input type="hidden" name="to" value={to}/><input name="note" placeholder="Note…" className="h-8 rounded-full border px-3 text-xs bg-white w-40"/><Button size="sm" className="h-7 text-xs">{to}</Button></form>) : <span className="text-xs text-muted-foreground">Terminal state — no further moves.</span>}<div className="text-xs text-muted-foreground w-full">Seller cannot change tailoring statuses; tailor cannot change inventory — RBAC enforced at DB layer.</div></CardContent></Card>
        <Link href="/dashboard/seller/orders" className="text-sm underline">← Back to orders</Link>
      </div>
    </AdvancedSellerShell>
  );
}
