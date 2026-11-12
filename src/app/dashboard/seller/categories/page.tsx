import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function SellerCategories() {
  await requireRole(["FABRIC_SELLER"]);
  const cats: any[] = await prisma.fabricCategory.findMany({ orderBy: { name: "asc" } }).catch(()=>[]);
  const counts = await Promise.all(cats.map(async c => ({ cat: c, count: await prisma.fabricProduct.count({ where: { categoryId: c.id } }).catch(()=>0) })));
  return (
    <AdvancedSellerShell title="Categories">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Product Categories</h1><p className="text-sm text-muted-foreground">Browse fabric categories • Your products per category • Admin manages master list</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Categories • {cats.length} • Assign at product create</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {counts.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No categories — seed creates Ankara, Lace, Aso-Oke, Brocade, Adire, Wool, Cotton.</div> :
            counts.map(({cat, count}:any)=><div key={cat.id} className="flex justify-between border rounded-xl p-3 bg-white"><span className="text-sm font-medium">{cat.name} • {cat.slug} <Badge variant="secondary" className="ml-2">{count} products</Badge></span><Link href={`/dashboard/seller/products?category=${cat.slug}`} className="text-xs underline">View →</Link></div>)}
            <div className="text-xs text-muted-foreground">Categories are platform-wide (admin Platform Settings). Sellers select at Add New Product.</div>
          </CardContent></Card>
      </div>
    </AdvancedSellerShell>
  );
}
