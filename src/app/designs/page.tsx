import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DesignsPage() {
  let designs: any[] = [];
  try { designs = await prisma.design.findMany({ where: { isPublished: true }, include: { images: true, tailor: true }, take: 12 }); } catch {}
  if (designs.length === 0) designs = Array.from({ length: 12 }).map((_, i) => ({ id: `${i}`, slug: `design-${i}`, title: ["Agbada Heritage","Ankara Midi","Kaftan Corporate","Aso-Oke Wedding","Senator Casual","Kids Ankara","Mens Native","Womens Bubu","Corporate Suit","Traditional Danshiki","Bridal Lace","Street Agbada"][i], price: 20000+i*4000, images: [{ url: `https://picsum.photos/seed/design${i}/400/500` }], tailor: { businessName: "Ade Bespoke" }, category: { name: ["Traditional","Casual","Corporate","Wedding","Casual","Children"][i%6] } }));
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="font-display text-3xl font-light">Design Gallery</h1>
        <div className="flex gap-2 mt-4 flex-wrap">
          {["Men's","Women's","Traditional","Corporate","Wedding","Casual","Children"].map(c => <span key={c} className="px-3 py-1 rounded-full border bg-white text-xs">{c}</span>)}
        </div>
        <div className="grid md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          {designs.map((d: any) => (
            <Link key={d.id} href={`/designs/${d.slug}`} className="group">
              <div className="rounded-2xl overflow-hidden border bg-white"><img src={d.images?.[0]?.url} alt={d.title} className="h-56 w-full object-cover group-hover:scale-105 transition" /><div className="p-3"><div className="font-medium text-sm">{d.title}</div><div className="text-xs text-muted-foreground">{d.tailor?.businessName} • ₦{Number(d.price).toLocaleString()}</div></div></div>
            </Link>
          ))}
        </div>
      </div><SiteFooter /></div>
  );
}
