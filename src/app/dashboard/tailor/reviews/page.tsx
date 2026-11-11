import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
export default async function ReviewsPage(){
  await requireRole(["TAILOR"]);
  const session= await (await import("@/lib/auth")).auth(); const profile= await prisma.tailorProfile.findUnique({ where:{ userId:(session!.user as any).id } });
  let reviews:any[]=[]; try { reviews= await prisma.review.findMany({ where:{ tailorId: profile!.id }, orderBy:{ createdAt:"desc" }, take:20 }); } catch{}
  return <AdvancedTailorShell title="Reviews"><div className="space-y-6"><h1 className="font-display text-2xl">Reviews • {profile?.ratingAvg?.toFixed(1)||"0"} ★ ({profile?.ratingCount||0})</h1><Card><CardHeader><CardTitle className="text-base">Customer feedback</CardTitle></CardHeader><CardContent className="space-y-2">{reviews.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No reviews yet — reviews are linked to completed bookings and shown on /tailors/{profile?.slug}.</div> : reviews.map((r:any)=><div key={r.id} className="border rounded-xl p-3 bg-white text-sm"><span className="font-medium">{r.rating} ★</span> • {r.comment||"—"} <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span></div>)}</CardContent></Card></div></AdvancedTailorShell>;
}
