import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function moderateFabric(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "") as "approve"|"unpublish"|"reject"|"request_edits";
  const note = String(formData.get("note") || "").slice(0,500);
  const p: any = await prisma.fabricProduct.findUnique({ where: { id } });
  if (!p) return;
  if (action === "approve") {
    await prisma.fabricProduct.update({ where: { id }, data: { isPublished: true } });
    await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_APPROVE_FABRIC", entity: "FabricProduct", entityId: id, metadata: { name: p.name, note } } });
  } else if (action === "unpublish") {
    await prisma.fabricProduct.update({ where: { id }, data: { isPublished: false } });
    await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_UNPUBLISH_FABRIC", entity: "FabricProduct", entityId: id } });
  } else if (action === "reject") {
    await prisma.fabricProduct.update({ where: { id }, data: { isPublished: false } });
    await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_REJECT_FABRIC", entity: "FabricProduct", entityId: id, metadata: { reason: note } } });
  } else if (action === "request_edits") {
    await prisma.fabricProduct.update({ where: { id }, data: { isPublished: false } });
    await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_REQUEST_EDITS_FABRIC", entity: "FabricProduct", entityId: id, metadata: { note } } });
    const seller: any = await prisma.sellerProfile.findUnique({ where: { id: p.sellerId } });
    if (seller?.userId) await prisma.notification.create({ data: { userId: seller.userId, title: "Product needs edits", message: `"${p.name}" — ${note || "Please review"}`, type: "moderation", link: "/dashboard/seller/products" } });
  }
  revalidatePath("/admin/fabrics");
}

export default async function AdminFabricsPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const q = (sp?.q || "").toLowerCase().trim();
  const filter = sp?.filter || "all";
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  let where: any = {};
  if (filter === "published") where.isPublished = true;
  if (filter === "draft") where.isPublished = false;
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { material: { contains: q, mode: "insensitive" } }];
  let products: any[] = [], total = 0;
  try {
    total = await prisma.fabricProduct.count({ where });
    products = await prisma.fabricProduct.findMany({ where, include: { seller: { select: { businessName: true, slug: true } }, images: true, category: true }, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take });
  } catch { products = []; }
  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Fabric Product Moderation</h1><p className="text-sm text-muted-foreground">Approve • Reject • Request edits • Unpublish — never destroy historical order refs</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardContent className="p-4">
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={sp?.q||""} placeholder="Search name/material" className="h-9 rounded-xl border px-3 text-sm bg-white w-56"/>
            <select name="filter" defaultValue={filter} className="h-9 rounded-xl border px-3 text-sm bg-white"><option value="all">All</option><option value="published">Published</option><option value="draft">Draft</option></select>
            <Button size="sm" type="submit">Filter</Button><span className="text-xs text-muted-foreground self-center">{total} products • page {page}</span>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Products • {products.length} on page</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {products.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No products for filter.</div> :
            products.map((p:any)=><div key={p.id} className="border rounded-xl p-3 bg-white">
              <div className="flex gap-3">
                <img src={p.images?.[0]?.url || `https://picsum.photos/seed/${p.slug}/80/80`} alt={p.name} className="h-16 w-16 rounded-lg object-cover border shrink-0"/>
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{p.name} • {p.seller?.businessName} <Badge variant={p.isPublished?"success":"secondary"} className="ml-2">{p.isPublished?"PUBLISHED":"DRAFT"}</Badge></div><div className="text-xs text-muted-foreground truncate">{p.material} • {p.color} • {p.pattern} • ₦{Number(p.price).toLocaleString()}/{p.unit} • Stock {p.stock} Reserved {p.reserved}</div><div className="text-xs line-clamp-2">{p.description?.slice(0,120)||"—"}</div></div>
                <Link href={`/fabrics/${p.slug}`} className="text-xs underline self-center shrink-0">Public →</Link>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <form action={moderateFabric}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="action" value="approve"/><Button size="sm" className="h-7 text-xs">Approve</Button></form>
                <form action={moderateFabric} className="flex gap-1"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="action" value="request_edits"/><input name="note" placeholder="What to fix?" className="h-7 rounded-full border px-3 text-xs w-40 bg-white"/><Button size="sm" variant="outline" className="h-7 text-xs">Request edits</Button></form>
                <form action={moderateFabric}><input type="hidden" name="id" value={p.id}/><input type="hidden" name="action" value="unpublish"/><Button size="sm" variant="outline" className="h-7 text-xs">Unpublish</Button></form>
                <form action={moderateFabric} className="flex gap-1"><input type="hidden" name="id" value={p.id}/><input type="hidden" name="action" value="reject"/><input name="note" placeholder="Reason" className="h-7 rounded-full border px-3 text-xs w-32 bg-white"/><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy">Reject</Button></form>
              </div>
            </div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/fabrics?page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{products.length===take && <Link href={`/admin/fabrics?page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
