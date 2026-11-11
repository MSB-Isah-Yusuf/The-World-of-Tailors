import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function approveTailor(formData:FormData){
  "use server";
  const session= await requireRole(["ADMIN"]);
  const id= String(formData.get("id")||"");
  const profile= await prisma.tailorProfile.findUnique({ where:{ id } });
  if(!profile) return;
  await prisma.tailorProfile.update({ where:{ id }, data:{ businessStatus:"APPROVED", isPublished:true } });
  await prisma.auditLog.create({ data:{ userId:(session.user as any).id, action:"APPROVE_TAILOR", entity:"TailorProfile", entityId:id, metadata:{ businessName: profile.businessName } } });
  revalidatePath("/admin/verification");
}
async function rejectTailor(formData:FormData){
  "use server";
  const session= await requireRole(["ADMIN"]);
  const id= String(formData.get("id")||"");
  await prisma.tailorProfile.update({ where:{ id }, data:{ businessStatus:"REJECTED" } });
  revalidatePath("/admin/verification");
}
async function approveSeller(formData:FormData){
  "use server";
  const session= await requireRole(["ADMIN"]);
  const id= String(formData.get("id")||"");
  const s= await prisma.sellerProfile.findUnique({ where:{ id } });
  if(!s) return;
  await prisma.sellerProfile.update({ where:{ id }, data:{ businessStatus:"APPROVED", isPublished:true } });
  await prisma.auditLog.create({ data:{ userId:(session.user as any).id, action:"APPROVE_SELLER", entity:"SellerProfile", entityId:id } });
  revalidatePath("/admin/verification");
}

export default async function AdminVerification(){
  await requireRole(["ADMIN"]);
  let pendingTailors:any[]=[], pendingSellers:any[]=[];
  try {
    [pendingTailors, pendingSellers] = await Promise.all([
      prisma.tailorProfile.findMany({ where:{ businessStatus:"PENDING" }, include:{ user:{select:{email:true,name:true,phone:true}} }, orderBy:{ createdAt:"desc" } }),
      prisma.sellerProfile.findMany({ where:{ businessStatus:"PENDING" }, include:{ user:{select:{email:true,name:true}} }, orderBy:{ createdAt:"desc" } }),
    ]);
  } catch {}
  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div><h1 className="font-display text-2xl">Admin Verification — Business Approval</h1><p className="text-sm text-muted-foreground">Only ADMIN can approve • Tailors/Sellers start PENDING, not published • Audit logged • Least-privilege</p></div>
        <Card><CardHeader><CardTitle className="text-base">{pendingTailors.length} pending tailors • Verification required before publishing</CardTitle></CardHeader><CardContent className="space-y-3">{pendingTailors.length===0 ? <div className="text-sm text-muted-foreground rounded-xl border bg-white p-6 text-center">No pending tailors — all verified. Demo tailors are APPROVED via seed.</div> : pendingTailors.map((t:any)=><div key={t.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><div><div className="font-medium">{t.businessName} • {t.city}, {t.state} • {t.user.email}</div><div className="text-xs text-muted-foreground">{t.bio||"—"} • Lat {t.latitude?.toFixed(4)||"—"} Lng {t.longitude?.toFixed(4)||"—"} • Radius {t.serviceRadiusKm||20}km</div></div><div className="flex gap-2"><form action={approveTailor}><input type="hidden" name="id" value={t.id}/><Button size="sm" className="h-7 text-xs">Approve & Publish</Button></form><form action={rejectTailor}><input type="hidden" name="id" value={t.id}/><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy">Reject</Button></form></div></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">{pendingSellers.length} pending sellers</CardTitle></CardHeader><CardContent className="space-y-3">{pendingSellers.length===0 ? <div className="text-sm text-muted-foreground rounded-xl border bg-white p-6 text-center">No pending sellers.</div> : pendingSellers.map((s:any)=><div key={s.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><span>{s.businessName} • {s.city}, {s.state} • {s.user.email}</span><form action={approveSeller}><input type="hidden" name="id" value={s.id}/><Button size="sm" className="h-7 text-xs">Approve</Button></form></div>)}</CardContent></Card>
        <div className="text-xs text-muted-foreground">Security: server-side role check on every mutation • AuditLog (APPROVE_TAILOR/SELLER) • No client trust • Tailor walk-in data never exposed to admin unless authorized need.</div>
        <Link href="/admin" className="text-sm underline">← Back to Admin</Link>
      </div>
    </div>
  );
}
