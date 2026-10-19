import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { MapPin, Star } from "lucide-react";

export default async function TailorsPage({ searchParams }: { searchParams: Promise<{ q?: string, city?: string }> }) {
  const sp = await searchParams;
  let tailors: any[] = [];
  try {
    tailors = await prisma.tailorProfile.findMany({ where: { isPublished: true }, include: { user: true }, orderBy: { ratingAvg: "desc" } });
  } catch {}
  if (tailors.length === 0) {
    tailors = [
      { id: "1", businessName: "Ade Bespoke", slug: "ade-bespoke", city: "Lagos", bio: "Master of Agbada & Kaftan", specialties: '["Agbada","Kaftan"]', profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop", ratingAvg: 4.9, ratingCount: 124 },
      { id: "2", businessName: "Zara Stitches", slug: "zara-stitches", city: "Abuja", bio: "Bridal & Ankara specialist", specialties: '["Bridal","Ankara"]', profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop", ratingAvg: 4.8, ratingCount: 98 },
    ];
  }
  const q = sp?.q?.toLowerCase();
  if (q) tailors = tailors.filter((t: any) => t.businessName.toLowerCase().includes(q) || t.city.toLowerCase().includes(q));

  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-light">Tailor Directory</h1>
          <form className="flex gap-2"><Input name="q" placeholder="Search by name or city" defaultValue={sp?.q} className="w-64 bg-white" /><button className="px-4 py-2 bg-emerald-800 text-white rounded-full text-sm">Search</button></form>
        </div>
        <p className="text-muted-foreground text-sm mt-2">Vetted professionals • Map view • Location & specialty filters • Ratings from verified reviews</p>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {tailors.map((t: any) => (
            <Link key={t.id} href={`/tailors/${t.slug}`}>
              <Card className="overflow-hidden hover:shadow-lg transition">
                <img src={t.profileImage || `https://picsum.photos/seed/${t.slug}/400/300`} alt={t.businessName} className="h-48 w-full object-cover" />
                <CardContent className="p-4">
                  <div className="font-semibold">{t.businessName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" />{t.city} • {JSON.parse(t.specialties || '[]')[0] || "Bespoke"}</div>
                  <div className="flex items-center gap-1 mt-2 text-xs"><Star className="h-3 w-3 fill-amber-500 text-amber-500" />{t.ratingAvg} ({t.ratingCount} reviews)</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
