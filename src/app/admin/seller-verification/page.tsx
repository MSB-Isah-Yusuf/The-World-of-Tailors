import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function approveSeller(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") || "");
  const s: any = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!s) return;
  await prisma.sellerProfile.update({ where: { id }, data: { businessStatus: "APPROVED", isPublished: true } });
  await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "APPROVE_SELLER", entity: "SellerProfile", entityId: id } });
  if (s.userId) await prisma.notification.create({ data: { userId: s.userId, title: "Seller approved", message: `${s.businessName} is now verified and published`, type: "verification", link: "/dashboard/seller/profile" } });
  revalidatePath("/admin/seller-verification");
}
async function rejectSeller(formData: FormData) {
  "use server";
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").slice(0,300) || "Not specified";
  await prisma.sellerProfile.update({ where: { id }, data: { businessStatus: "REJECTED" } });
  revalidatePath("/admin/seller-verification");
}

export default async function SellerVerificationPage() {
  await requireRole(["ADMIN"]);
  let pending: any[] = [];
  try { pending = await prisma.sellerProfile.findMany({ where: { businessStatus: "PENDING" }, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: "desc" } }); } catch {}
  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Seller Verification</h1><p className="text-sm text-muted-foreground">Pending fabric sellers • Approve publishes marketplace display • Audit+notify</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardHeader><CardTitle className="text-sm">{pending.length} pending sellers</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {pending.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No pending sellers — all verified.</div> :
            pending.map((s:any)=><div key={s.id} className="border rounded-xl p-3 bg-white flex flex-wrap justify-between gap-2">
              <div className="text-sm flex-1"><div className="font-medium">{s.businessName} • {s.city}, {s.state} • {s.user.email} <Badge variant="warning">PENDING</Badge></div><div className="text-xs text-muted-foreground">{s.bio?.slice(0,100)||"—"} • {new Date(s.createdAt).toLocaleDateString()} • Lat {s.latitude?.toFixed(2)||"—"}</div></div>
              <div className="flex gap-2 shrink-0"><form action={approveSeller}><input type="hidden" name="id" value={s.id}/><Button size="sm" className="h-7 text-xs">Approve & Publish</Button></form><form action={rejectSeller} className="flex gap-1"><input type="hidden" name="id" value={s.id}/><input name="reason" placeholder="Reason" className="h-7 rounded-full border px-3 text-xs w-28 bg-white"/><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy">Reject</Button></form></div>
            </div>)}
          </CardContent></Card>
      </div>
    </div>
  );
}
