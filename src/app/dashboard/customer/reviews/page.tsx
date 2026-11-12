import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export default async function CustomerReviews(){
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  let reviews:any[]=[]; try { reviews = await prisma.review.findMany({ where:{ authorId: uid }, orderBy:{ createdAt:"desc" }, take: 20 }); } catch{}
  // Enrich with tailor/seller names where possible
  let enriched=reviews;
  try {
    const tailorIds = reviews.map((r:any)=>r.tailorId).filter(Boolean);
    const sellerIds = reviews.map((r:any)=>r.sellerId).filter(Boolean);
    const tailors = tailorIds.length ? await prisma.tailorProfile.findMany({ where:{ id:{ in: tailorIds } }, select:{ id:true, businessName:true, slug:true } }) : [];
    const sellers = sellerIds.length ? await prisma.sellerProfile.findMany({ where:{ id:{ in: sellerIds } }, select:{ id:true, businessName:true, slug:true } }) : [];
    const tMap=new Map(tailors.map((t:any)=>[t.id,t])); const sMap=new Map(sellers.map((s:any)=>[s.id,s]));
    enriched = reviews.map((r:any)=>({ ...r, tailor: r.tailorId? tMap.get(r.tailorId): null, seller: r.sellerId? sMap.get(r.sellerId): null }));
  } catch{}
  return (
    <AdvancedCustomerShell title="Reviews">
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-display text-2xl">My Reviews — {reviews.length}</h1>
        <Card><CardHeader><CardTitle className="text-sm">Left after COMPLETED bookings / DELIVERED orders • Visible on tailor/seller profiles</CardTitle></CardHeader><CardContent className="space-y-2">{enriched.length===0 ? <div className="p-8 text-center text-sm text-muted-foreground border rounded-xl bg-white">No reviews yet — complete a booking or receive a fabric order to review.</div>
        : enriched.map((r:any)=><div key={r.id} className="border rounded-xl p-3 bg-white text-sm"><div className="flex justify-between"><span className="font-medium">{r.rating} ★ {r.tailor? `• Tailor: ${r.tailor.businessName}` : r.seller? `• Seller: ${r.seller.businessName}`:""} </span><span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span></div><div className="text-xs text-muted-foreground">{r.comment||"—"}</div></div>)}</CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
