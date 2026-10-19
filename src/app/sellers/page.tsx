import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

export default async function SellersPage() {
  let sellers: any[] = [];
  try { sellers = await prisma.sellerProfile.findMany({ where: { isPublished: true }, include: { user: true } }); } catch {}
  if (sellers.length===0) sellers = [{ id: "1", businessName: "Lagos Fabrics Hub", slug: "lagos-fabrics", city: "Yaba, Lagos", bio: "Ankara, lace & aso-oke specialists since 2010.", profileImage: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=400&auto=format&fit=crop", ratingAvg: 4.8 }];
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="font-display text-3xl">Fabric Sellers</h1>
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {sellers.map((s:any) => (
            <Link key={s.id} href={`/sellers/${s.slug}`}><Card className="overflow-hidden hover:shadow-lg"><img src={s.profileImage || `https://picsum.photos/seed/${s.slug}/400/300`} alt={s.businessName} className="h-40 w-full object-cover" /><CardContent className="p-4"><div className="font-semibold">{s.businessName}</div><div className="text-xs text-muted-foreground">{s.city} • {s.bio}</div></CardContent></Card></Link>
          ))}
        </div>
      </div><SiteFooter /></div>
  );
}
