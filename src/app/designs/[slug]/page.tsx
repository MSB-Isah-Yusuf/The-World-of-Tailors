import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DesignDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let design: any = null;
  try { design = await prisma.design.findUnique({ where: { slug: slug }, include: { images: true, tailor: true } }); } catch {}
  if (!design) design = { title: slug.replace(/-/g," "), slug: slug, price: 38000, description: "Hand-stitched with premium lining. Includes 2 fittings. Fabric not included — source via Fabric Marketplace and deliver to your tailor.", turnaroundDays: 7, tailor: { businessName: "Ade Bespoke", slug: "ade-bespoke" }, images: [{ url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800&auto=format&fit=crop" }] };
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8 grid lg:grid-cols-2 gap-8">
        <div><img src={design.images?.[0]?.url} alt={design.title} className="rounded-2xl w-full h-[560px] object-cover border" /><div className="grid grid-cols-3 gap-2 mt-2">{[1,2,3].map(i => <img key={i} src={`https://picsum.photos/seed/${design.slug}${i}/200/200`} alt="" className="rounded-xl h-24 object-cover border" />)}</div></div>
        <div>
          <h1 className="font-display text-3xl">{design.title}</h1>
          <div className="text-sm text-muted-foreground">by <Link href={`/tailors/${design.tailor.slug}`} className="underline">{design.tailor.businessName}</Link> • {design.turnaroundDays} day turnaround</div>
          <div className="text-2xl font-semibold mt-4">₦{Number(design.price).toLocaleString()}</div>
          <p className="text-sm text-muted-foreground mt-4">{design.description}</p>
          <div className="mt-6"><Link href={`/dashboard/customer/bookings/new?design=${design.slug}&tailor=${design.tailor.slug}`}><Button size="lg" className="w-full">Book this Design — Submit Measurements</Button></Link></div>
          <div className="text-xs text-muted-foreground mt-2">You will provide measurements & special instructions on the next step. Measurements are stored securely and only visible to your chosen tailor.</div>
        </div>
      </div><SiteFooter /></div>
  );
}
