import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
export default async function SellerReviews(){
  await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(await (await import("@/lib/auth")).auth() as any).user.id } });
  let reviews:any[]=[]; try { reviews= await prisma.review.findMany({ where:{ sellerId: profile!.id }, orderBy:{ createdAt:"desc" }, take:20 }); } catch{}
  return <AdvancedSellerShell title="Reviews"><div className="space-y-6"><h1 className="font-display text-2xl">Reviews • {profile?.ratingAvg?.toFixed(1)||"0"} ★ ({profile?.ratingCount||0})</h1><Card><CardHeader><CardTitle className="text-base">Product reviews</CardTitle></CardHeader><CardContent className="space-y-2">{reviews.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No reviews yet — shown on /sellers/{profile?.slug}</div> : reviews.map((r:any)=><div key={r.id} className="border rounded-xl p-3 bg-white text-sm"><span className="font-medium">{r.rating} ★</span> • {r.comment||"—"} <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span></div>)}</CardContent></Card></div></AdvancedSellerShell>;
}
