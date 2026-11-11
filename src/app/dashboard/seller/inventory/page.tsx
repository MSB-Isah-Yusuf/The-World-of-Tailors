import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
export default async function InventoryPage(){
  const session= await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  let products:any[]=[]; let movements:any[]=[];
  try {
    products= await prisma.fabricProduct.findMany({ where:{ sellerId: profile!.id }, orderBy:{ stock:"asc" } });
    const ids= products.map(p=>p.id);
    movements= await prisma.inventoryMovement.findMany({ where:{ productId:{ in: ids } }, orderBy:{ createdAt:"desc" }, take:20 });
  } catch {}
  return (
    <AdvancedSellerShell title="Inventory">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Inventory — {profile?.businessName}</h1><p className="text-sm text-muted-foreground">Atomic stock + reserved vs available • Movement history • No direct edits without audit</p></div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="text-base">{products.length} products • Low stock first</CardTitle></CardHeader><CardContent className="space-y-2">
            {products.map(p=><div key={p.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><span className="font-medium">{p.name} • {p.stock} {p.unit} • {p.reserved} reserved</span><span className={`text-xs px-2 py-1 rounded-full ${p.stock<5?"bg-burgundy text-white": p.stock<10?"bg-amber-100 text-amber-800":"bg-emeraldDeep text-white"}`}>{p.stock<5?"CRITICAL": p.stock<10?"LOW":"OK"} • Avail {p.stock-p.reserved}</span></div>)}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Recent movements • Audit</CardTitle></CardHeader><CardContent className="space-y-2">{movements.length===0 ? <div className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">No movements yet — stock changes create InventoryMovement</div> : movements.map((m:any)=><div key={m.id} className="flex justify-between border rounded-xl p-3 bg-white text-xs"><span>{m.productId.slice(0,6)} • {m.delta>0?"+":""}{m.delta} • {m.reason}</span><span className="text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span></div>)}<div className="text-xs text-muted-foreground">Use <Link href="/dashboard/seller/products" className="underline">Products</Link> to adjust stock via movements, not direct edit.</div></CardContent></Card>
        </div>
      </div>
    </AdvancedSellerShell>
  );
}
