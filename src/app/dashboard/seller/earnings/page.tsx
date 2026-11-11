import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
export default async function SellerEarnings(){
  await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(await (await import("@/lib/auth")).auth() as any).user.id } });
  let orders:any[]=[]; try { orders= await prisma.fabricOrder.findMany({ where:{ sellerId: profile!.id, paymentStatus:"PAID" }, select:{ total:true } }); } catch{}
  const total= orders.reduce((s,b)=> s+(b.total||0),0);
  return <AdvancedSellerShell title="Earnings & Payouts"><div className="space-y-6"><h1 className="font-display text-2xl">Earnings — {profile?.businessName}</h1><div className="grid md:grid-cols-3 gap-4"><Card><CardHeader><CardTitle className="text-sm">Total Paid</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">₦{total.toLocaleString()}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Orders PAID</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{orders.length}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Payout</CardTitle></CardHeader><CardContent><div className="text-sm">Paystack split • Next payout scheduled</div></CardContent></Card></div><Card><CardContent className="text-xs text-muted-foreground p-4">Earnings from FabricOrder.total where paymentStatus=PAID. Delivery fees itemized.</CardContent></Card></div></AdvancedSellerShell>;
}
