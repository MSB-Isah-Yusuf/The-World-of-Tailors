import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function StockHistory({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireRole(["FABRIC_SELLER"]);
  const session = await (await import("@/lib/auth")).auth();
  const profile: any = await prisma.sellerProfile.findUnique({ where: { userId: (session as any).user.id } });
  if (!profile) return <AdvancedSellerShell title="Stock History"><div className="p-6">No profile</div></AdvancedSellerShell>;
  const page = Math.max(1, parseInt(((await searchParams)?.page)||"1") || 1);
  const take = 20;
  const productIds = await prisma.fabricProduct.findMany({ where: { sellerId: profile.id }, select: { id: true } }).then(ps=> ps.map(p=>p.id));
  let moves: any[] = [], total = 0;
  try {
    total = await prisma.inventoryMovement.count({ where: { productId: { in: productIds } } });
    moves = await prisma.inventoryMovement.findMany({ where: { productId: { in: productIds } }, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take });
    const products = await prisma.fabricProduct.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } });
    const map = new Map(products.map(p=>[p.id,p.name]));
    moves = moves.map(m => ({ ...m, productName: map.get(m.productId) || m.productId.slice(0,8) }));
  } catch {}
  return (
    <AdvancedSellerShell title="Stock History">
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Stock Movement History</h1><p className="text-sm text-muted-foreground">Every adjustment • Before→after via delta • Who (audit), when</p></div><Link href="/dashboard/seller/inventory" className="text-sm underline">← Inventory</Link></div>
        <Card><CardHeader><CardTitle className="text-sm">Movements • {total} total • page {page}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {moves.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No movements yet — checkout RESERVE/SOLD creates entries; manual adjustments log here too.</div> :
            moves.map((m:any)=><div key={m.id} className="border rounded-xl p-3 bg-white flex justify-between text-xs"><span className="font-medium">{m.productName} • {m.delta>0?`+${m.delta}`:m.delta} • {m.reason}</span><span className="text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span></div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/dashboard/seller/inventory/history?page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{moves.length===take && <Link href={`/dashboard/seller/inventory/history?page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </AdvancedSellerShell>
  );
}
