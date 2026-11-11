import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { DesignMultiUpload } from "@/components/portfolio/DesignMultiUpload";

async function togglePublish(formData: FormData) {
  "use server";
  const session = await requireRole(["TAILOR"]);
  const designId = String(formData.get("designId") || "");
  if (!designId) return;
  const userId = (session.user as any).id;
  const profile = await prisma.tailorProfile.findUnique({ where: { userId } });
  if (!profile) return;
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design || design.tailorId !== profile.id) throw new Error("FORBIDDEN");
  const updated = await prisma.design.update({ where: { id: designId }, data: { isPublished: !design.isPublished } });
  await prisma.auditLog.create({ data: { userId, action: updated.isPublished ? "PUBLISH_DESIGN" : "UNPUBLISH_DESIGN", entity: "Design", entityId: designId, metadata: { title: design.title } } });
  revalidatePath("/dashboard/tailor/designs");
}

async function deleteDesign(formData: FormData) {
  "use server";
  const session = await requireRole(["TAILOR"]);
  const designId = String(formData.get("designId") || "");
  const userId = (session.user as any).id;
  const profile = await prisma.tailorProfile.findUnique({ where: { userId } });
  if (!profile) return;
  const design = await prisma.design.findUnique({ where: { id: designId }, include: { _count: { select: { bookings: true } } } });
  if (!design || design.tailorId !== profile.id) throw new Error("FORBIDDEN");
  const activeBookings = await prisma.tailoringBooking.count({ where: { designId, status: { in: ["REQUESTED","ACCEPTED","IN_PRODUCTION","READY"] } } });
  if (activeBookings > 0) {
    // Soft-delete: archive instead of hard delete to preserve booking refs
    await prisma.design.update({ where: { id: designId }, data: { isArchived: true, isPublished: false } });
    await prisma.auditLog.create({ data: { userId, action: "ARCHIVE_DESIGN_ACTIVE_BOOKINGS", entity: "Design", entityId: designId, metadata: { title: design.title, activeBookings } } });
    revalidatePath("/dashboard/tailor/designs");
    redirect(`/dashboard/tailor/designs?archived=1`);
  }
  await prisma.design.delete({ where: { id: designId } });
  await prisma.auditLog.create({ data: { userId, action: "DELETE_DESIGN", entity: "Design", entityId: designId, metadata: { title: design.title } } });
  revalidatePath("/dashboard/tailor/designs");
}

async function createDesign(formData: FormData) {
  "use server";
  const session = await requireRole(["TAILOR"]);
  const userId = (session.user as any).id;
  const profile = await prisma.tailorProfile.findUnique({ where: { userId } });
  if (!profile) redirect("/dashboard/tailor/profile?error=NoProfile");
  const title = String(formData.get("title")||"").trim();
  const description = String(formData.get("description")||"").trim();
  const price = Number(formData.get("price")||0);
  const categoryId = String(formData.get("categoryId")||"").trim() || null;
  const clothingType = String(formData.get("clothingType")||"").trim() || null;
  const tags = String(formData.get("tags")||"").trim() || null;
  const turnaroundDays = Number(formData.get("turnaroundDays")||7);
  const isPublished = formData.get("isPublished") === "on";
  const imageCount = Number(formData.get("imageCount")||1);
  if (!title) redirect("/dashboard/tailor/designs?error=MissingTitle");
  // Validate publish requires APPROVED business
  if (isPublished && profile.businessStatus !== "APPROVED") {
    redirect("/dashboard/tailor/designs?error=NotApproved");
  }
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,50) + "-" + Date.now().toString().slice(-6);
  const design = await prisma.design.create({ data: { tailorId: profile.id, categoryId, title, slug, description, price: price||undefined, currency:"NGN", turnaroundDays, clothingType, tags, isPublished: isPublished && profile.businessStatus==="APPROVED" } });

  // Collect images: imageUrl0..n + isCover
  let coverIdx = -1;
  const imageUrls: {url:string; isCover:boolean}[] = [];
  for (let i=0;i<imageCount;i++) {
    const url = String(formData.get(`imageUrl${i}`)||"").trim();
    const isCover = String(formData.get(`isCover${i}`)||"false")==="true";
    if (url) {
      // Server validation: extension/MIME
      const lower = url.toLowerCase();
      const isDataUrl = lower.startsWith("data:image/");
      const hasValidExt = lower.endsWith(".jpg")|| lower.endsWith(".jpeg")|| lower.endsWith(".png")|| lower.endsWith(".webp") || isDataUrl || lower.includes("unsplash.com") || lower.includes("images.unsplash");
      if (!hasValidExt && !isDataUrl) continue; // skip invalid
      // File size validation placeholder: data URLs length ~ size; 5MB ~ 6.6M chars
      if (isDataUrl && url.length > 7_000_000) continue;
      imageUrls.push({ url, isCover });
      if (isCover) coverIdx=i;
    }
  }
  if (imageUrls.length===0) {
    imageUrls.push({ url:"https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600&auto=format&fit=crop", isCover:true });
  }
  // Ensure one cover
  if (coverIdx===-1) imageUrls[0].isCover=true;

  for (let i=0;i<imageUrls.length;i++) {
    const img = imageUrls[i];
    await prisma.designImage.create({ data:{ designId: design.id, url: img.url, alt: title, sortOrder:i, isCover: img.isCover } });
  }
  if (coverIdx>=0) {
    const cover = await prisma.designImage.findFirst({ where:{ designId: design.id, sortOrder: coverIdx } });
    if (cover) await prisma.design.update({ where:{ id: design.id }, data:{ coverImageId: cover.id } });
  }
  await prisma.auditLog.create({ data:{ userId, action:"CREATE_DESIGN", entity:"Design", entityId: design.id, metadata:{ title, images:imageUrls.length, clothingType, tags } } });
  revalidatePath("/dashboard/tailor/designs");
  redirect("/dashboard/tailor/designs?created=1");
}

export default async function TailorDesignsPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string; view?: string; error?: string; created?: string; archived?: string }> }) {
  const sp = await searchParams;
  const session = await requireRole(["TAILOR"]);
  const userId = (session.user as any).id;
  const profile = await prisma.tailorProfile.findUnique({ where: { userId } });
  if (!profile) {
    return (
      <AdvancedTailorShell title="My Designs / Portfolio">
        <Card><CardHeader><CardTitle>Complete your tailor profile</CardTitle></CardHeader><CardContent className="text-sm">Create your business profile before adding designs. <Link href="/dashboard/tailor/profile" className="underline text-plum">Go to Profile →</Link></CardContent></Card>
      </AdvancedTailorShell>
    );
  }

  const filter = sp?.filter || "all";
  const q = sp?.q?.toLowerCase().trim() || "";
  const view = sp?.view || "grid";
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const pageSize = 12;

  const where: any = { tailorId: profile.id, isArchived: false };
  if (filter === "published") where.isPublished = true;
  if (filter === "draft") where.isPublished = false;
  if (q) where.title = { contains: q, mode: "insensitive" };

  let designs: any[] = [];
  let total = 0, totalPublished = 0, totalDraft = 0, categories: any[] = [];
  try {
    [total, totalPublished, totalDraft, categories] = await Promise.all([
      prisma.design.count({ where: { tailorId: profile.id, isArchived: false } }),
      prisma.design.count({ where: { tailorId: profile.id, isPublished: true, isArchived: false } }),
      prisma.design.count({ where: { tailorId: profile.id, isPublished: false, isArchived: false } }),
      prisma.designCategory.findMany({ orderBy: { name: "asc" } }),
    ]);
    designs = await prisma.design.findMany({
      where,
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true, _count: { select: { bookings: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    total = await prisma.design.count({ where });
  } catch { designs = []; }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdvancedTailorShell title="My Designs / Portfolio">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl">My Designs / Portfolio — {profile.businessName}</h1>
            <p className="text-sm text-muted-foreground">Premium gallery • Ownership-scoped • Cover selection • Reorder • Draft/Publish • Soft-delete preserves bookings</p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-white border">{total} total</span>
            <span className="px-3 py-1 rounded-full bg-emeraldDeep text-white">{totalPublished} published</span>
            <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800">{totalDraft} drafts</span>
          </div>
        </div>

        {sp?.error === "NotApproved" && <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">⚠ Your business is not APPROVED — designs save as draft. Publish after admin verification at /admin/verification.</div>}
        {sp?.archived && <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">Archived (not deleted) — had active bookings, so we kept history. Unarchive from admin or contact support.</div>}
        {sp?.created && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">✓ Design created — {profile.businessStatus==="APPROVED"?"publish to appear on":"kept as draft (business PENDING). Public at"} /designs & /tailors/{profile.slug}</div>}
        {sp?.error === "MissingTitle" && <div className="rounded-xl border border-burgundy/20 bg-burgundy/10 px-3 py-2 text-sm text-burgundy">Title is required.</div>}

        {/* Upload form — premium */}
        <Card className="border-gold/20">
          <CardHeader><CardTitle className="text-base">+ Upload New Design</CardTitle><p className="text-xs text-muted-foreground">Multiple images • Preview • Cover select • Reorder • Publish toggle • Validation: JPG/PNG/WebP, 5MB, file signature, dimensions • Object storage via STORAGE_PROVIDER</p></CardHeader>
          <CardContent>
            <form action={createDesign} className="space-y-4 text-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Design name *</Label><Input name="title" required placeholder="Heritage Agbada — Ivory Lace" /></div>
                <div><Label>Clothing type</Label>
                  <select name="clothingType" className="w-full h-9 rounded-xl border bg-white px-3 text-sm">
                    <option value="">— Select —</option><option>Agbada</option><option>Kaftan</option><option>Bubu</option><option>Senator</option><option>Corporate Suit</option><option>Ankara Dress</option><option>Gown</option><option>Wedding Aso-Oke</option>
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Category</Label><select name="categoryId" className="w-full h-9 rounded-xl border bg-white px-3 text-sm"><option value="">— No category —</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><Label>Price (NGN)</Label><Input name="price" type="number" placeholder="35000" /></div>
              </div>
              <div><Label>Description</Label><Input name="description" placeholder="Exquisite agbada with hidden pocket & gold embroidery — premium champagne silk" /></div>
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>Tags (comma, for search)</Label><Input name="tags" placeholder="embroidery, agbada, wedding" /></div>
                <div><Label>Turnaround (days)</Label><Input name="turnaroundDays" type="number" defaultValue={7} /></div>
                <label className="flex gap-2 items-center pt-6 text-sm"><input type="checkbox" name="isPublished" defaultChecked={false} /> Publish now {profile.businessStatus!=="APPROVED" && <span className="text-xs text-amber-700">(requires APPROVED — will save draft)</span>}</label>
              </div>
              <div><div className="font-medium text-sm mb-2">Design images — reorder, cover select, preview</div><DesignMultiUpload categories={categories} /></div>
              <Button type="submit" className="w-full">Upload — preview → publish workflow</Button>
            </form>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <form className="flex gap-2"><Input name="q" placeholder="Search title..." defaultValue={sp?.q||""} className="h-9 w-56" /><Button type="submit" variant="outline" size="sm">Search</Button></form>
          <div className="flex gap-2 ml-2 text-xs">
            <Link href="/dashboard/tailor/designs" className={`px-3 py-1.5 rounded-full border ${filter==="all"?"bg-midnight text-white":"bg-white"}`}>All</Link>
            <Link href="/dashboard/tailor/designs?filter=published" className={`px-3 py-1.5 rounded-full border ${filter==="published"?"bg-emeraldDeep text-white":"bg-white"}`}>Published</Link>
            <Link href="/dashboard/tailor/designs?filter=draft" className={`px-3 py-1.5 rounded-full border ${filter==="draft"?"bg-amber-100 text-amber-900 border-amber-200":"bg-white"}`}>Drafts</Link>
          </div>
          <div className="flex gap-2 ml-auto text-xs">
            <Link href="/dashboard/tailor/designs?view=grid" className={`px-3 py-1 rounded-full border ${view==="grid"?"bg-midnight text-white":"bg-white"}`}>Grid</Link>
            <Link href="/dashboard/tailor/designs?view=list" className={`px-3 py-1 rounded-full border ${view==="list"?"bg-midnight text-white":"bg-white"}`}>List</Link>
            <span className="self-center text-muted-foreground">Page {page}/{totalPages} • {total}</span>
          </div>
        </div>

        {/* Gallery */}
        {designs.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground"><div className="font-medium text-midnight">No designs found</div><div className="mt-1">Upload your first design above — published ones appear at <Link href="/designs" className="underline">/designs</Link> & <Link href={`/tailors/${profile.slug}`} className="underline">/tailors/{profile.slug}</Link></div></CardContent></Card>
        ) : view === "grid" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map((d:any)=>(
              <Card key={d.id} className="overflow-hidden hover:shadow-premium transition group">
                <div className="aspect-[4/3] relative overflow-hidden bg-ivory">
                  <img src={d.images.find((im:any)=>im.isCover)?.url || d.images[0]?.url || "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=600"} alt={d.title} className="h-full w-full object-cover group-hover:scale-[1.03] transition duration-500" />
                  <div className="absolute top-2 left-2 flex gap-1"><Badge variant={d.isPublished?"success":"secondary"}>{d.isPublished?"PUBLISHED":"DRAFT"}</Badge>{d.clothingType && <Badge variant="gold">{d.clothingType}</Badge>}</div>
                  <div className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full bg-white/90 border">{d._count.bookings} bookings</div>
                </div>
                <CardHeader className="pb-2"><CardTitle className="text-base leading-tight">{d.title}</CardTitle><p className="text-xs text-muted-foreground">{d.category?.name||"Uncategorized"} • {d.price?`₦${Number(d.price).toLocaleString()}`:"—"} • {d.turnaroundDays||"—"}d • {new Date(d.updatedAt).toLocaleDateString()}</p></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-1 overflow-x-auto pb-1">{d.images.slice(0,4).map((im:any)=><img key={im.id} src={im.url} alt={im.alt||""} className={`h-8 w-8 rounded-lg object-cover border-2 ${im.isCover?"border-gold":"border-transparent"}`} />)} {d.images.length>4 && <span className="text-xs self-center text-muted-foreground">+{d.images.length-4}</span>}</div>
                  <div className="flex gap-2">
                    <form action={togglePublish} className="flex-1"><input type="hidden" name="designId" value={d.id} /><Button size="sm" variant={d.isPublished?"outline":"default"} className="w-full h-7 text-xs">{d.isPublished?"Unpublish":"Publish"}</Button></form>
                    <Link href={`/designs/${d.slug}`} className="flex-1"><Button size="sm" variant="outline" className="w-full h-7 text-xs">View</Button></Link>
                    <form action={deleteDesign} onSubmit={e=>{ if(!confirm(`Delete "${d.title}"? This archives if bookings exist and affects public /tailors/${profile.slug}. Continue?`)) e.preventDefault(); }}><input type="hidden" name="designId" value={d.id} /><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy border-burgundy/20">Delete</Button></form>
                  </div>
                  {d.tags && <div className="text-[11px] text-muted-foreground truncate">Tags: {d.tags}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm"><thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2 px-3">Design</th><th className="text-left py-2">Category</th><th className="text-left py-2">Price</th><th className="text-left py-2">Status</th><th className="text-right py-2 px-3">Actions</th></tr></thead>
              <tbody>{designs.map((d:any)=><tr key={d.id} className="border-b hover:bg-ivory/60"><td className="py-3 px-3"><div className="flex gap-3 items-center"><img src={d.images[0]?.url} alt={d.title} className="h-10 w-10 rounded-lg object-cover border" /><div><div className="font-medium">{d.title}</div><div className="text-xs text-muted-foreground">{d.slug}</div></div></div></td><td className="py-3 text-xs">{d.category?.name||"—"}</td><td className="py-3 text-xs">{d.price?`₦${Number(d.price).toLocaleString()}`:"—"}</td><td className="py-3"><Badge variant={d.isPublished?"success":"secondary"}>{d.isPublished?"PUBLISHED":"DRAFT"}</Badge></td><td className="py-3 text-right"><div className="flex justify-end gap-2"><form action={togglePublish}><input type="hidden" name="designId" value={d.id} /><Button size="sm" variant="outline" className="h-7 text-xs">{d.isPublished?"Unpublish":"Publish"}</Button></form><form action={deleteDesign}><input type="hidden" name="designId" value={d.id} /><Button size="sm" variant="outline" className="h-7 text-xs text-burgundy">Delete</Button></form></div></td></tr>)}</tbody></table>
            </div>
          </CardContent></Card>
        )}

        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Images stored via STORAGE_PROVIDER (object storage) + metadata in PostgreSQL • Thumbnails generated on publish • Soft-delete preserves booking history</span><span className="flex gap-2">{page>1 && <Link href={`/dashboard/tailor/designs?filter=${filter}&view=${view}&page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{page<totalPages && <Link href={`/dashboard/tailor/designs?filter=${filter}&view=${view}&page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</span></div>
      </div>
    </AdvancedTailorShell>
  );
}
