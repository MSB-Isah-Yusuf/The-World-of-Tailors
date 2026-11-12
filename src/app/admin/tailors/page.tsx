import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function setStatus(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") || "");
  const businessStatus = String(formData.get("businessStatus") || "") as any;
  if (!id || !["APPROVED","REJECTED","SUSPENDED","PENDING","UNDER_REVIEW","RESUBMISSION_REQUIRED"].includes(businessStatus)) return;
  const p: any = await prisma.tailorProfile.findUnique({ where: { id } });
  if (!p) return;
  await prisma.tailorProfile.update({ where: { id }, data: { businessStatus, isPublished: businessStatus === "APPROVED" ? true : false } });
  await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: `ADMIN_TAILOR_${businessStatus}`, entity: "TailorProfile", entityId: id, metadata: { businessName: p.businessName } } });
  revalidatePath("/admin/tailors");
  revalidatePath("/admin/verification");
}

export default async function AdminTailorsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp?.q || "").toLowerCase().trim();
  const status = sp?.status || "";
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;

  let where: any = {};
  if (status) where.businessStatus = status as any;
  if (q) where.OR = [{ businessName: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }];

  let tailors: any[] = [], total = 0;
  try {
    total = await prisma.tailorProfile.count({ where });
    tailors = await prisma.tailorProfile.findMany({ where, include: { user: { select: { email: true, name: true } } }, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take });
  } catch {}

  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Tailor Management</h1><p className="text-sm text-muted-foreground">All tailor businesses • Search, filter by status, approve/reject/suspend — audit logged</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardContent className="p-4">
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={sp?.q || ""} placeholder="Search business/city/slug" className="h-9 rounded-xl border px-3 text-sm bg-white w-56" />
            <select name="status" defaultValue={status} className="h-9 rounded-xl border px-3 text-sm bg-white">
              <option value="">All statuses</option><option value="PENDING">PENDING</option><option value="UNDER_REVIEW">UNDER_REVIEW</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option><option value="SUSPENDED">SUSPENDED</option><option value="RESUBMISSION_REQUIRED">RESUBMISSION_REQUIRED</option>
            </select>
            <Button size="sm" type="submit">Filter</Button><span className="text-xs text-muted-foreground self-center">{total} tailors • page {page}</span>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Tailors • {tailors.length} on page — ownership-safe, admin-only mutations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tailors.length === 0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No tailors for filter.</div> :
            tailors.map((t:any) => (
              <div key={t.id} className="border rounded-xl p-3 bg-white">
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="text-sm flex-1 min-w-0"><div className="font-medium truncate">{t.businessName} • {t.city}, {t.state} • {t.user.email} <Badge variant={t.businessStatus==="APPROVED"?"success":t.businessStatus==="PENDING"?"warning":t.businessStatus==="SUSPENDED"?"burgundy":"secondary"} className="ml-2">{t.businessStatus}</Badge>{t.isPublished && <Badge variant="gold" className="ml-1">PUBLISHED</Badge>}</div><div className="text-xs text-muted-foreground truncate">{t.slug} • {t.specialties?.slice(0,80)} • Joined {new Date(t.createdAt).toLocaleDateString()}</div></div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <form action={setStatus}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="businessStatus" value="APPROVED"/><Button size="sm" className="h-7 text-xs">Approve</Button></form>
                    <form action={setStatus}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="businessStatus" value="UNDER_REVIEW"/><Button size="sm" variant="outline" className="h-7 text-xs">Under Review</Button></form>
                    <form action={setStatus}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="businessStatus" value="REJECTED"/><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy">Reject</Button></form>
                    <form action={setStatus}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="businessStatus" value="SUSPENDED"/><Button size="sm" variant="outline" className="h-7 text-xs">Suspend</Button></form>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/tailors?page=${page-1}${status?`&status=${status}`:""}${q?`&q=${q}`:""}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{tailors.length===take && <Link href={`/admin/tailors?page=${page+1}${status?`&status=${status}`:""}${q?`&q=${q}`:""}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
