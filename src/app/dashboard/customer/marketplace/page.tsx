import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function CustomerMarketplace() {
  await requireRole(["CUSTOMER"]);
  let products: any[] = [];
  try { products = await prisma.fabricProduct.findMany({ where: { isPublished: true }, include: { seller: { select: { businessName: true } }, images: true }, take: 12, orderBy: { createdAt: "desc" } }); } catch {}
  return (
    <AdvancedCustomerShell title="Fabric Marketplace">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Fabric Marketplace</h1><p className="text-sm text-muted-foreground">Search Ankara, Lace, Aso-Oke • Filter by material/color/price • Add to cart</p></div>
        <Card><CardContent className="p-4 flex gap-2 text-xs"><Link href="/fabrics" className="px-4 py-2 rounded-full bg-midnight text-white">Shop → /fabrics</Link><Link href="/checkout" className="px-4 py-2 rounded-full border bg-white">Go to cart → /checkout</Link></CardContent></Card>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">{products.map((p:any)=><Link key={p.id} href={`/fabrics/${p.slug}`}><Card className="overflow-hidden hover:shadow-card transition"><div className="h-32 bg-ivory"><img src={p.images?.[0]?.url || `https://picsum.photos/seed/${p.slug}/400/300`} alt={p.name} className="h-full w-full object-cover"/></div><CardHeader className="pb-2"><CardTitle className="text-sm">{p.name}</CardTitle></CardHeader><CardContent className="text-xs">{p.material} • ₦{Number(p.price).toLocaleString()}/{p.unit} • {p.seller?.businessName}</CardContent></Card></Link>)}</div>
      </div>
    </AdvancedCustomerShell>
  );
}
