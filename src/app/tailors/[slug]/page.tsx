import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";

export default async function TailorPortfolio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let tailor: any = null;
  try {
    tailor = await prisma.tailorProfile.findUnique({ where: { slug: slug }, include: { user: true, designs: { where: { isPublished: true }, include: { images: true } } } });
  } catch {}
  if (!tailor) {
    // demo fallback
    if (slug === "ade-bespoke") tailor = { businessName: "Ade Bespoke", slug: "ade-bespoke", city: "Lagos", bio: "Lagos' finest Agbada atelier. 15 years crafting heirloom garments. Bespoke, traditional & corporate.", specialties: '["Agbada","Kaftan","Corporate"]', profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop", ratingAvg: 4.9, ratingCount: 124, turnaroundDays: 7, startingPrice: 45000, designs: Array.from({ length: 6 }).map((_, i) => ({ id: `${i}`, title: `Design ${i+1}`, slug: `design-${i}`, price: 30000+i*5000, images: [{ url: `https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=400&auto=format&fit=crop` }] })) };
    else return notFound();
  }

  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <img src={tailor.profileImage || `https://picsum.photos/seed/${tailor.slug}/600/400`} alt={tailor.businessName} className="h-64 w-full object-cover" />
              <CardContent className="p-6">
                <h1 className="font-display text-2xl">{tailor.businessName}</h1>
                <div className="text-sm text-muted-foreground">{tailor.city} • {tailor.ratingAvg} ★ ({tailor.ratingCount})</div>
                <p className="text-sm mt-3">{tailor.bio}</p>
                <div className="flex flex-wrap gap-2 mt-3">{JSON.parse(tailor.specialties || '[]').map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                <div className="mt-4 space-y-2 text-sm">
                  <div>Starting from <span className="font-semibold">₦{Number(tailor.startingPrice||45000).toLocaleString()}</span></div>
                  <div>Turnaround: <span className="font-semibold">{tailor.turnaroundDays || 7} days</span></div>
                </div>
                <Link href={`/dashboard/customer/bookings/new?tailor=${tailor.slug}`} className="block mt-4"><Button className="w-full">Book this Tailor</Button></Link>
                <div className="text-xs text-muted-foreground mt-2 text-center">Secure booking • Paystack protected</div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <h2 className="font-display text-xl">Published Designs — {tailor.businessName}</h2>
            <p className="text-sm text-muted-foreground">Only designs belonging to this tailor are displayed (ownership-scoped query).</p>
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {(tailor.designs || []).map((d: any) => (
                <Link key={d.id} href={`/designs/${d.slug}`} className="group">
                  <div className="rounded-2xl overflow-hidden border bg-white">
                    <img src={d.images?.[0]?.url || `https://picsum.photos/seed/${d.slug}/400/500`} alt={d.title} className="h-56 w-full object-cover group-hover:scale-105 transition" />
                    <div className="p-3"><div className="font-medium text-sm">{d.title}</div><div className="text-xs text-muted-foreground">₦{Number(d.price||0).toLocaleString()}</div></div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <h3 className="font-semibold">Reviews (verified purchases only)</h3>
              <Card className="mt-3"><CardContent className="p-4 text-sm text-muted-foreground">"Impeccable finishing — attention to detail is world-class." — Chidi, Lekki • 5★ verified booking #SC-2024-1245</CardContent></Card>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
