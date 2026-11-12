import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function moderateDesign(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "") as "approve"|"reject"|"unpublish"|"request_edits";
  const note = String(formData.get("note") || "").slice(0,500);
  const d: any = await prisma.design.findUnique({ where: { id } });
  if (!d) return;
  if (action === "approve") {
    await prisma.design.update({ where: { id }, data: { isPublished: true, isArchived: false } });
    await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_APPROVE_DESIGN", entity: "Design", entityId: id, metadata: { title: d.title, note } } });
  } else if (action === "unpublish") {
    await prisma.design.update({ where: { id }, data: { isPublished: false } });
    await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_UNPUBLISH_DESIGN", entity: "Design", entityId: id, metadata: { title: d.title, note } } });
  } else if (action === "reject") {
    await prisma.design.update({ where: { id }, data: { isPublished: false, isArchived: true } });
    await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_REJECT_DESIGN", entity: "Design", entityId: id, metadata: { title: d.title, reason: note } } });
  } else if (action === "request_edits") {
    await prisma.design.update({ where: { id }, data: { isPublished: false } });
    await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_REQUEST_EDITS_DESIGN", entity: "Design", entityId: id, metadata: { title: d.title, note } } });
    // notify tailor
    const tailor: any = await prisma.tailorProfile.findUnique({ where: { id: d.tailorId } });
    if (tailor?.userId) await prisma.notification.create({ data: { userId: tailor.userId, title: "Design needs edits", message: `"${d.title}" — ${note || "Please review and resubmit"}`, type: "moderation", link: "/dashboard/tailor/designs" } });
  }
  revalidatePath("/admin/designs");
}

export default async function AdminDesignModeration({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp?.q || "").toLowerCase().trim();
  const filter = sp?.filter || "all"; // all | published | draft | reported
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  let where: any = {};
  if (filter === "published") where.isPublished = true;
  if (filter === "draft") where.isPublished = false;
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }];
  let designs: any[] = [], total = 0;
  try {
    total = await prisma.design.count({ where });
    designs = await prisma.design.findMany({ where, include: { tailor: { select: { businessName: true, slug: true } }, images: true, category: true }, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take });
  } catch { designs = []; }
  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Design Moderation</h1><p className="text-sm text-muted-foreground">Preview • Approve • Reject • Request edits • Unpublish — history preserved, never destroy order refs</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardContent className="p-4">
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={sp?.q||""} placeholder="Search title/slug" className="h-9 rounded-xl border px-3 text-sm bg-white w-56"/>
            <select name="filter" defaultValue={filter} className="h-9 rounded-xl border px-3 text-sm bg-white"><option value="all">All</option><option value="published">Published</option><option value="draft">Draft</option></select>
            <Button size="sm" type="submit">Filter</Button><span className="text-xs text-muted-foreground self-center">{total} designs • page {page}</span>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Designs • {designs.length} on page — moderation preserves historical booking refs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {designs.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No designs for filter.</div> :
            designs.map((d:any)=><div key={d.id} className="border rounded-xl p-3 bg-white">
              <div className="flex gap-3">
                <img src={d.images?.[0]?.url || `https://picsum.photos/seed/${d.slug}/80/80`} alt={d.title} className="h-16 w-16 rounded-lg object-cover border shrink-0"/>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{d.title} • {d.tailor?.businessName} <Badge variant={d.isPublished?"success":"secondary"} className="ml-2">{d.isPublished?"PUBLISHED":"DRAFT"}</Badge>{d.isArchived && <Badge variant="burgundy" className="ml-1">ARCHIVED</Badge>}</div><div className="text-xs text-muted-foreground truncate">{d.slug} • {d.category?.name||"—"} • ₦{d.price?Number(d.price).toLocaleString():"—"} • {d.tags||""}</div><div className="text-xs mt-1 line-clamp-2">{d.description?.slice(0,120) || "—"}</div></div>
                <Link href={`/designs/${d.slug}`} className="text-xs underline self-center shrink-0">Public →</Link>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <form action={moderateDesign}><input type="hidden" name="id" value={d.id}/><input type="hidden" name="action" value="approve"/><Button size="sm" className="h-7 text-xs">Approve</Button></form>
                <form action={moderateDesign} className="flex gap-1"><input type="hidden" name="id" value={d.id}/><input type="hidden" name="action" value="request_edits"/><input name="note" placeholder="What to fix?" className="h-7 rounded-full border px-3 text-xs w-40 bg-white"/><Button size="sm" variant="outline" className="h-7 text-xs">Request edits</Button></form>
                <form action={moderateDesign}><input type="hidden" name="id" value={d.id}/><input type="hidden" name="action" value="unpublish"/><Button size="sm" variant="outline" className="h-7 text-xs">Unpublish</Button></form>
                <form action={moderateDesign} className="flex gap-1"><input type="hidden" name="id" value={d.id}/><input type="hidden" name="action" value="reject"/><input name="note" placeholder="Reason" className="h-7 rounded-full border px-3 text-xs w-32 bg-white"/><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy">Reject</Button></form>
              </div>
            </div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/designs?page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{designs.length===take && <Link href={`/admin/designs?page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
