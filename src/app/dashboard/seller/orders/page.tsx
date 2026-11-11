import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { revalidatePath } from "next/cache";

const allowed: Record<string,string[]> = { PENDING:["CONFIRMED","CANCELLED"], CONFIRMED:["PREPARING","CANCELLED"], PREPARING:["READY_FOR_DISPATCH","CANCELLED"], READY_FOR_DISPATCH:["IN_TRANSIT"], IN_TRANSIT:["DELIVERED","FAILED_DELIVERY"], DELIVERED:[], CANCELLED:[], FAILED_DELIVERY:[] };

async function transition(formData:FormData){
  "use server";
  const session= await requireRole(["FABRIC_SELLER"]);
  const orderId= String(formData.get("orderId")||"");
  const to= String(formData.get("to")||"").toUpperCase();
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  const order= await prisma.fabricOrder.findUnique({ where:{ id:orderId } });
  if(!profile||!order||order.sellerId!==profile.id) throw new Error("FORBIDDEN");
  const from= order.status;
  if(!(allowed[from]||[]).includes(to)) return;
  await prisma.fabricOrder.update({ where:{ id:orderId }, data:{ status: to as any } });
  // delivery tracking
  let delivery= await prisma.delivery.findFirst({ where:{ fabricOrderId:orderId } });
  if(delivery) await prisma.delivery.update({ where:{ id: delivery.id }, data:{ status: to } });
  await prisma.auditLog.create({ data:{ userId:(session.user as any).id, action:`ORDER_${from}_TO_${to}`, entity:"FabricOrder", entityId:orderId } });
  revalidatePath("/dashboard/seller/orders");
}

export default async function SellerOrders({ searchParams }: { searchParams: Promise<{ status?:string }> }){
  const sp= await searchParams;
  const status= (sp?.status||"all").toUpperCase();
  const session= await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  if(!profile) return <AdvancedSellerShell title="Orders"><div className="p-6">No seller profile</div></AdvancedSellerShell>;
  let orders:any[]=[];
  try {
    const where:any={ sellerId: profile.id };
    if(["PENDING","CONFIRMED","PREPARING","READY_FOR_DISPATCH","IN_TRANSIT","DELIVERED","CANCELLED"].includes(status)) where.status=status;
    orders= await prisma.fabricOrder.findMany({ where, include:{ customer:{select:{name:true,email:true}}, items:true, deliveries:true }, orderBy:{ updatedAt:"desc" }, take:20 });
  } catch {}
  return (
    <AdvancedSellerShell title="Fabric Orders">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Orders — {profile.businessName}</h1><p className="text-sm text-muted-foreground">PENDING → CONFIRMED → PREPARING → READY_FOR_DISPATCH → IN_TRANSIT → DELIVERED • Inventory reserved atomically</p></div>
        <div className="flex flex-wrap gap-2 text-xs">{["ALL","PENDING","CONFIRMED","PREPARING","READY_FOR_DISPATCH","IN_TRANSIT","DELIVERED","CANCELLED"].map(s=><Link key={s} href={`/dashboard/seller/orders${s==="ALL"?"":"?status="+s}`} className={`px-3 py-1.5 rounded-full border ${status===s?"bg-midnight text-white":"bg-white"}`}>{s}</Link>)}</div>
        <Card><CardHeader><CardTitle className="text-base">{orders.length} orders • Ownership-scoped (sellerId)</CardTitle></CardHeader><CardContent className="space-y-3">
          {orders.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No orders for {status}. List products to receive orders.</div>
          : orders.map((o:any)=><div key={o.id} className="rounded-xl border bg-white p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="font-semibold">{o.reference} • {o.customer.name} • ₦{Number(o.total).toLocaleString()} • {o.deliveryType==="TO_TAILOR"?"To Tailor":"To Customer"}</span><Badge>{o.status}</Badge></div>
            <div className="text-xs text-muted-foreground">{o.items.map((i:any)=> `${i.productName} ×${i.quantity}`).join(", ")} • {o.deliveries[0]?.trackingCode ? `Track ${o.deliveries[0].trackingCode}`:"No tracking"}</div>
            <div className="flex flex-wrap gap-2">{(allowed[o.status]||[]).map(to=><form key={to} action={transition}><input type="hidden" name="orderId" value={o.id}/><input type="hidden" name="to" value={to}/><Button size="sm" className="h-7 text-xs" variant={to==="CANCELLED"?"outline":"default"}>{to}</Button></form>)} {allowed[o.status]?.length===0 && <span className="text-xs text-muted-foreground">Terminal • Audit logged</span>}</div>
          </div>)}
        </CardContent></Card>
      </div>
    </AdvancedSellerShell>
  );
}
