import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function CustomerFavorites(){
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  let favs:any[]=[];
  try {
    const favRows = await prisma.favorite.findMany({ where:{ userId: uid }, orderBy:{ createdAt:"desc" }, take: 24 });
    // Enrich: fetch linked designs/products by ids found
    const designIds = favRows.map((f:any)=>f.designId).filter(Boolean);
    const productIds = favRows.map((f:any)=>f.productId).filter(Boolean);
    const designs = designIds.length ? await prisma.design.findMany({ where:{ id:{ in: designIds } }, select:{ id:true, title:true, slug:true, tailor:{ select:{ businessName:true, slug:true } } } as any }) : [];
    const products = productIds.length ? await prisma.fabricProduct.findMany({ where:{ id:{ in: productIds } }, select:{ id:true, name:true, slug:true, seller:{ select:{ businessName:true } } } as any }) : [];
    const dMap = new Map(designs.map((d:any)=>[d.id,d])); const pMap=new Map(products.map((p:any)=>[p.id,p]));
    favs = favRows.map((f:any)=>({ ...f, design: f.designId? dMap.get(f.designId): null, product: f.productId? pMap.get(f.productId): null }));
  } catch{}
  return (
    <AdvancedCustomerShell title="Favorites">
      <div className="space-y-6 max-w-4xl">
        <h1 className="font-display text-2xl">Favorites — {favs.length}</h1>
        <Card><CardHeader><CardTitle className="text-sm">Saved designs & fabrics — tap to view</CardTitle></CardHeader><CardContent className="space-y-2">{favs.length===0 ? <div className="p-8 text-center text-sm text-muted-foreground border rounded-xl bg-white">No favorites yet — browse <Link href="/dashboard/customer/designs" className="underline">Designs</Link> or <Link href="/dashboard/customer/marketplace" className="underline">Marketplace</Link> and heart items.</div>
        : favs.map((f:any)=><div key={f.id} className="border rounded-xl p-3 bg-white text-sm flex justify-between">
            <span>{f.design ? `Design: ${f.design.title} • ${f.design.tailor?.businessName}` : f.product ? `Fabric: ${f.product.name} • ${f.product.seller?.businessName}` : `${f.designId||f.productId||f.id}`}</span>
            <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()} {f.design && <Link href={`/designs/${f.design.slug}`} className="underline ml-2">View →</Link>} {f.product && <Link href={`/fabrics/${f.product.slug}`} className="underline ml-2">View →</Link>}</span>
          </div>)}</CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
