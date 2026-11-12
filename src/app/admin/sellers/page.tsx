import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function setSellerStatus(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") || "");
  const businessStatus = String(formData.get("businessStatus") || "") as any;
  if (!id || !["APPROVED","REJECTED","SUSPENDED","PENDING","UNDER_REVIEW","RESUBMISSION_REQUIRED"].includes(businessStatus)) return;
  const s: any = await prisma.sellerProfile.findUnique({ where: { id } });
  if (!s) return;
  await prisma.sellerProfile.update({ where: { id }, data: { businessStatus, isPublished: businessStatus === "APPROVED" } });
  await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: `ADMIN_SELLER_${businessStatus}`, entity: "SellerProfile", entityId: id } });
  revalidatePath("/admin/sellers");
  revalidatePath("/admin/verification");
}

export default async function AdminSellersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp?.q || "").toLowerCase().trim();
  const status = sp?.status || "";
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  let where: any = {};
  if (status) where.businessStatus = status as any;
  if (q) where.OR = [{ businessName: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }];
  let sellers: any[] = [], total = 0;
  try {
    total = await prisma.sellerProfile.count({ where });
    sellers = await prisma.sellerProfile.findMany({ where, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take });
  } catch {}
  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Fabric Seller Management</h1><p className="text-sm text-muted-foreground">All sellers • Approve activates marketplace display • Audit logged</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardContent className="p-4">
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={sp?.q || ""} placeholder="Search business/city" className="h-9 rounded-xl border px-3 text-sm bg-white w-56" />
            <select name="status" defaultValue={status} className="h-9 rounded-xl border px-3 text-sm bg-white"><option value="">All statuses</option><option value="PENDING">PENDING</option><option value="UNDER_REVIEW">UNDER_REVIEW</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="SUSPENDED">SUSPENDED</option><option value="RESUBMISSION_REQUIRED">RESUBMISSION_REQUIRED</option></select>
            <Button size="sm" type="submit">Filter</Button><span className="text-xs text-muted-foreground self-center">{total} sellers • page {page}</span>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Sellers • {sellers.length} on page</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sellers.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No sellers for filter.</div> :
            sellers.map((s:any)=><div key={s.id} className="border rounded-xl p-3 bg-white flex flex-wrap justify-between gap-2"><div className="text-sm flex-1"><div className="font-medium">{s.businessName} • {s.city}, {s.state} • {s.user.email} <Badge variant={s.businessStatus==="APPROVED"?"success":s.businessStatus==="PENDING"?"warning":"secondary"}>{s.businessStatus}</Badge>{s.isPublished && <Badge variant="gold" className="ml-1">PUBLISHED</Badge>}</div><div className="text-xs text-muted-foreground">{s.slug} • Joined {new Date(s.createdAt).toLocaleDateString()}</div></div><div className="flex gap-2 shrink-0"><form action={setSellerStatus}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="businessStatus" value="APPROVED"/><Button size="sm" className="h-7 text-xs">Approve</Button></form><form action={setSellerStatus}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="businessStatus" value="UNDER_REVIEW"/><Button size="sm" variant="outline" className="h-7 text-xs">Under Review</Button></form><form action={setSellerStatus}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="businessStatus" value="REJECTED"/><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy">Reject</Button></form><form action={setSellerStatus}><input type="hidden" name="id" value={s.id}/><input type="hidden" name="businessStatus" value="SUSPENDED"/><Button size="sm" variant="outline" className="h-7 text-xs">Suspend</Button></form></div></div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/sellers?page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{sellers.length===take && <Link href={`/admin/sellers?page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
