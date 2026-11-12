import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function CustomerDesigns() {
  await requireRole(["CUSTOMER"]);
  let designs: any[] = [];
  try { designs = await prisma.design.findMany({ where: { isPublished: true }, include: { tailor: { select: { businessName: true, slug: true } }, images: true }, take: 12, orderBy: { createdAt: "desc" } }); } catch {}
  return (
    <AdvancedCustomerShell title="Browse Designs">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Browse Designs</h1><p className="text-sm text-muted-foreground">Discover bespoke pieces • Book directly with tailor</p></div>
        <Card><CardContent className="p-4 flex gap-2 text-xs"><Link href="/designs" className="px-4 py-2 rounded-full bg-midnight text-white">Open full gallery → /designs</Link><span className="self-center text-muted-foreground">12 latest published designs below</span></CardContent></Card>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">{designs.map((d:any)=><Link key={d.id} href={`/designs/${d.slug}`}><Card className="overflow-hidden hover:shadow-card transition"><div className="h-48 bg-ivory"><img src={d.images?.[0]?.url || `https://picsum.photos/seed/${d.slug}/400/300`} alt={d.title} className="h-full w-full object-cover"/></div><CardHeader className="pb-2"><CardTitle className="text-sm">{d.title}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{d.tailor?.businessName} • ₦{d.price?Number(d.price).toLocaleString():"—"}</CardContent></Card></Link>)}</div>
      </div>
    </AdvancedCustomerShell>
  );
}
