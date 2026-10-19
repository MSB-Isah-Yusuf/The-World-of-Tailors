import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function FabricsPage() {
  let products: any[] = [];
  try { products = await prisma.fabricProduct.findMany({ where: { isPublished: true }, include: { images: true, seller: true }, take: 12 }); } catch {}
  if (products.length === 0) products = Array.from({ length: 12 }).map((_, i) => ({ id: `${i}`, slug: `fabric-${i}`, name: ["Swiss Lace Ivory","Ankara Gold Burst","Cashmere Wool Charcoal","Aso-Oke Royal","Adire Indigo","Brocade Champagne","Guinea Brocade","Atiku Fabric","Cotton Ankara","Linen Blend","Damask Shine","George Wrapper"][i], price: 8000+i*1500, material: ["Lace","Ankara","Wool"][i%3], color: ["Ivory","Gold","Charcoal"][i%3], stock: 100-i*5, images: [{ url: `https://picsum.photos/seed/fabric${i}/400/400` }], seller: { businessName: "Lagos Fabrics Hub", slug: "lagos-fabrics" } }));
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="font-display text-3xl font-light">Fabric Marketplace</h1>
        <div className="flex gap-2 mt-4 flex-wrap text-xs">
          {["All","Ankara","Lace","Aso-Oke","Brocade","Adire","Wool","Cotton"].map(c => <span key={c} className="px-3 py-1 rounded-full border bg-white">{c}</span>)}
          <span className="ml-auto text-muted-foreground">Stock-aware • Multi-seller cart • Deliver to tailor supported</span>
        </div>
        <div className="grid md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          {products.map((p: any) => (
            <Link key={p.id} href={`/fabrics/${p.slug}`} className="group">
              <div className="rounded-2xl overflow-hidden border bg-white"><img src={p.images?.[0]?.url} alt={p.name} className="h-40 w-full object-cover group-hover:scale-105 transition" />
                <div className="p-3"><div className="text-sm font-medium line-clamp-1">{p.name}</div><div className="text-xs text-muted-foreground">{p.material} • {p.color} • {p.seller.businessName}</div><div className="text-sm font-semibold mt-1">₦{Number(p.price).toLocaleString()} / metre</div><div className="text-[11px] text-green-700">{p.stock>0? `${p.stock} in stock` : "Out of stock"}</div></div></div>
            </Link>
          ))}
        </div>
      </div><SiteFooter /></div>
  );
}
