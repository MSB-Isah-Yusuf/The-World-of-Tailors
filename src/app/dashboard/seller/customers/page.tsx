import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
export default async function SellerCustomers(){
  const session= await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  let rows:any[]=[];
  try {
    const orders= await prisma.fabricOrder.findMany({ where:{ sellerId: profile!.id }, select:{ customerId:true, customer:{select:{id:true,name:true,email:true}}, status:true, createdAt:true } });
    const map=new Map();
    for(const o of orders){ if(!map.has(o.customer.id)) map.set(o.customer.id,{ ...o.customer, orders:0, lastActive:o.createdAt, statuses:new Set() }); const m=map.get(o.customer.id); m.orders++; m.statuses.add(o.status); if(o.createdAt>m.lastActive) m.lastActive=o.createdAt; }
    rows= Array.from(map.values());
  } catch {}
  return <AdvancedSellerShell title="Customers"><div className="space-y-6"><h1 className="font-display text-2xl">Customers — {profile?.businessName}</h1><p className="text-sm text-muted-foreground">Only customers who ordered from you (sellerId scoped)</p><Card><CardHeader><CardTitle className="text-base">{rows.length} customers</CardTitle></CardHeader><CardContent>{rows.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No customers yet — sell at /fabrics to get orders</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2 px-2">Customer</th><th className="text-left">Orders</th><th className="text-left">Statuses</th><th className="text-right">Actions</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id} className="border-b"><td className="py-3 px-2"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.email}</div></td><td>{r.orders}</td><td className="text-xs">{Array.from(r.statuses as Set<string>).join(", ")}</td><td className="text-right"><Link href={`/dashboard/seller/orders`} className="text-xs underline text-plum">Orders →</Link></td></tr>)}</tbody></table></div>}</CardContent></Card></div></AdvancedSellerShell>;
}
