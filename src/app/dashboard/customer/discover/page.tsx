import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function DiscoverTailors() {
  await requireRole(["CUSTOMER"]);
  let tailors: any[] = [];
  try { tailors = await prisma.tailorProfile.findMany({ where: { isPublished: true, businessStatus: "APPROVED" as any }, include: { user: { select: { name: true } } }, take: 12, orderBy: { ratingAvg: "desc" } }); } catch {}
  return (
    <AdvancedCustomerShell title="Discover Tailors">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Discover Tailors</h1><p className="text-sm text-muted-foreground">Search by state/city/distance, specialty, rating, price — verified only</p></div>
        <Card><CardContent className="p-4 flex gap-2 text-xs"><Link href="/tailors" className="px-4 py-2 rounded-full bg-midnight text-white">Open full discovery → /tailors</Link><span className="self-center text-muted-foreground">Filters: state/city/distance/specialty/rating/price • distanceKm ranking</span></CardContent></Card>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">{tailors.map((t:any)=><Card key={t.id} className="overflow-hidden"><div className="h-32 bg-ivory"><img src={t.profileImage||`https://picsum.photos/seed/${t.slug}/400/300`} alt={t.businessName} className="h-full w-full object-cover"/></div><CardHeader className="pb-2"><CardTitle className="text-sm">{t.businessName} • {t.city}</CardTitle></CardHeader><CardContent className="text-xs"><div>{t.ratingAvg?.toFixed(1)}★ ({t.ratingCount}) • From ₦{t.startingPrice?.toLocaleString()||"—"}</div><Link href={`/tailors/${t.slug}`} className="underline text-plum">View portfolio →</Link></CardContent></Card>)}</div>
      </div>
    </AdvancedCustomerShell>
  );
}
