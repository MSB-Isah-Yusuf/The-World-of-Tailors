import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function CustomerOrders() {
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  let orders:any[]=[];
  try { orders = await prisma.fabricOrder.findMany({ where:{ customerId: uid }, include:{ seller:{select:{businessName:true, city:true, slug:true}}, items:{select:{productName:true, quantity:true, lineTotal:true}} }, orderBy:{createdAt:"desc"}, take:20 }); } catch{}
  return (
    <AdvancedCustomerShell title="Fabric Orders">
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between"><h1 className="font-display text-2xl">Fabric Orders — {orders.length}</h1><Link href="/dashboard/customer/marketplace" className="text-xs underline">Browse fabrics →</Link></div>
        <Card><CardHeader><CardTitle className="text-sm">Orders by seller • PENDING→DELIVERED • Payment PAID via Paystack webhook • Delivery per seller</CardTitle></CardHeader>
          <CardContent className="space-y-2">{orders.length===0 ? <div className="p-8 text-center text-sm text-muted-foreground border rounded-xl bg-white">No orders — add to cart & checkout at <Link href="/checkout" className="underline">/checkout</Link></div>
          : orders.map((o:any)=><div key={o.id} className="border rounded-xl p-3 bg-white">
              <div className="flex justify-between text-sm"><span className="font-medium">{o.reference} • {o.seller.businessName} • {o.deliveryType} <Badge variant={o.status==="DELIVERED"?"success":o.status==="PENDING"?"warning":"secondary"}>{o.status}</Badge> <Badge variant={o.paymentStatus==="PAID"?"success":"outline"}>{o.paymentStatus}</Badge></span><span className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</span></div>
              <div className="text-xs text-muted-foreground">{o.items.map((i:any)=>`${i.productName} ×${i.quantity}`).join(" • ")} • ₦{Number(o.total).toLocaleString()} (delivery ₦{Number(o.deliveryFee).toLocaleString()})</div>
              <div className="text-xs"><Link href={`/dashboard/customer/orders/${o.id}`} className="underline">Order detail →</Link> {o.seller.slug && <Link href={`/sellers/${o.seller.slug}`} className="underline ml-2">Seller profile →</Link>}</div>
            </div>)}
          </CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
