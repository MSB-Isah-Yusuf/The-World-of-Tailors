import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function CustomerOrderDetail({ params }: { params: Promise<{ id:string }> }){
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  const { id } = await params;
  let order:any=null; let delivery:any=null;
  try {
    order = await prisma.fabricOrder.findUnique({ where:{ id }, include:{ seller:{select:{businessName:true, city:true, slug:true}}, items:true } });
    if(order && order.customerId !== uid) order = null; // ownership check
    if(order) delivery = await prisma.delivery.findFirst({ where:{ fabricOrderId: order.id }, orderBy:{ createdAt:"desc" } as any });
  } catch{}
  if(!order) return <AdvancedCustomerShell title="Order"><div className="p-8 text-center">Order not found or not yours.</div></AdvancedCustomerShell>;
  return (
    <AdvancedCustomerShell title={`Order ${order.reference}`}>
      <div className="space-y-6 max-w-4xl">
        <div><h1 className="font-display text-2xl">{order.reference} • {order.seller.businessName}</h1><p className="text-sm text-muted-foreground">{order.deliveryType} • {order.seller.city} • <Badge variant={order.status==="DELIVERED"?"success":"secondary"}>{order.status}</Badge> <Badge variant={order.paymentStatus==="PAID"?"success":"outline"}>{order.paymentStatus}</Badge></p></div>
        <Card><CardHeader><CardTitle className="text-sm">Items — {order.items.length}</CardTitle></CardHeader><CardContent className="space-y-2">{order.items.map((i:any)=><div key={i.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><span>{i.productName} • {i.unit} • {Number(i.quantity)} × ₦{Number(i.priceSnapshot).toLocaleString()}</span><span className="font-medium">₦{Number(i.lineTotal).toLocaleString()}</span></div>)}<div className="flex justify-between text-sm pt-2 border-t"><span>Subtotal</span><span>₦{Number(order.subtotal).toLocaleString()}</span></div><div className="flex justify-between text-sm"><span>Delivery</span><span>₦{Number(order.deliveryFee).toLocaleString()}</span></div><div className="flex justify-between font-semibold"><span>Total</span><span>₦{Number(order.total).toLocaleString()}</span></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Delivery — {delivery? delivery.status : "Not yet dispatched"} {delivery?.trackingCode && `• ${delivery.trackingCode}`}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{delivery ? `${(delivery.address as any)?.street||""} • ${(delivery.address as any)?.city||""} • Created ${new Date(delivery.createdAt).toLocaleString()}` : "Delivery record created on checkout per seller; seller advances to READY_FOR_DISPATCH→IN_TRANSIT→DELIVERED."}</CardContent></Card>
        <Card><CardContent className="text-xs text-muted-foreground p-3">Ownership: customerId == your id. <Link href="/dashboard/customer/orders" className="underline">Back to orders →</Link> • <Link href={`/sellers/${order.seller.slug}`} className="underline">Seller profile →</Link></CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
