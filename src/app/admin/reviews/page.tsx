import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function moderateReview(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "") as "publish"|"unpublish"|"remove";
  const r: any = await prisma.review.findUnique({ where: { id } });
  if (!r) return;
  if (action === "publish") await prisma.review.update({ where: { id }, data: { isPublished: true } });
  if (action === "unpublish") await prisma.review.update({ where: { id }, data: { isPublished: false } });
  if (action === "remove") await prisma.review.delete({ where: { id } });
  await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: `ADMIN_REVIEW_${action.toUpperCase()}`, entity: "Review", entityId: id } });
  revalidatePath("/admin/reviews");
}

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp?.q || "").toLowerCase().trim();
  const filter = sp?.filter || "all";
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  let where: any = {};
  if (filter === "published") where.isPublished = true;
  if (filter === "hidden") where.isPublished = false;
  if (q) where.comment = { contains: q, mode: "insensitive" };
  let reviews: any[] = [], total = 0;
  try {
    total = await prisma.review.count({ where });
    reviews = await prisma.review.findMany({ where, include: { author: { select: { name: true, email: true } } } as any, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take });
  } catch { reviews = []; }
  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Reviews & Reports</h1><p className="text-sm text-muted-foreground">Moderate verified-purchase reviews • Publish/unpublish/remove • Audit trail</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardContent className="p-4">
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={sp?.q||""} placeholder="Search comment" className="h-9 rounded-xl border px-3 text-sm bg-white w-56"/>
            <select name="filter" defaultValue={filter} className="h-9 rounded-xl border px-3 text-sm bg-white"><option value="all">All</option><option value="published">Published</option><option value="hidden">Hidden</option></select>
            <Button size="sm" type="submit">Filter</Button><span className="text-xs text-muted-foreground self-center">{total} reviews</span>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Reviews • {reviews.length} on page</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reviews.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No reviews for filter.</div> :
            reviews.map((r:any)=><div key={r.id} className="border rounded-xl p-3 bg-white">
              <div className="flex justify-between gap-2"><span className="text-sm font-medium">{r.author?.name || "—"} ({r.author?.email||"—"}) • {r.rating}★ <Badge variant={r.isPublished?"success":"muted"} className="ml-2">{r.isPublished?"PUBLISHED":"HIDDEN"}</Badge></span><span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span></div>
              <div className="text-xs mt-1">{r.comment?.slice(0,200) || "—"}</div>
              <div className="flex gap-2 mt-3">
                <form action={moderateReview}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="action" value="publish"/><Button size="sm" className="h-7 text-xs">Publish</Button></form>
                <form action={moderateReview}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="action" value="unpublish"/><Button size="sm" variant="outline" className="h-7 text-xs">Hide</Button></form>
                <form action={moderateReview}><input type="hidden" name="id" value={r.id}/><input type="hidden" name="action" value="remove"/><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy">Remove</Button></form>
              </div>
            </div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/reviews?page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{reviews.length===take && <Link href={`/admin/reviews?page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
