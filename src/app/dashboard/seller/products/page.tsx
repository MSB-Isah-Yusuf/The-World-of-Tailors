import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function togglePublish(formData:FormData){
  "use server";
  const session= await requireRole(["FABRIC_SELLER"]);
  const productId= String(formData.get("productId")||"");
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  const p= await prisma.fabricProduct.findUnique({ where:{ id:productId } });
  if(!profile||!p||p.sellerId!==profile.id) throw new Error("FORBIDDEN");
  const updated= await prisma.fabricProduct.update({ where:{ id:productId }, data:{ isPublished: !p.isPublished } });
  await prisma.auditLog.create({ data:{ userId:(session.user as any).id, action:updated.isPublished?"PUBLISH_PRODUCT":"UNPUBLISH_PRODUCT", entity:"FabricProduct", entityId:productId } });
  revalidatePath("/dashboard/seller/products");
}

async function createProduct(formData:FormData){
  "use server";
  const session= await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  if(!profile) redirect("/dashboard/seller/profile");
  const name= String(formData.get("name")||"").trim();
  const categoryId= String(formData.get("categoryId")||"").trim()||null;
  const price= Number(formData.get("price")||0);
  const stock= Number(formData.get("stock")||0);
  const unit= String(formData.get("unit")||"metre");
  const material= String(formData.get("material")||"").trim();
  const color= String(formData.get("color")||"").trim();
  const imageUrl= String(formData.get("imageUrl")||"").trim() || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=400&auto=format&fit=crop";
  if(!name || !price) redirect("/dashboard/seller/products?error=Missing");
  const slug= name.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,50)+"-"+Date.now().toString().slice(-6);
  const product= await prisma.fabricProduct.create({ data:{ sellerId: profile.id, categoryId, name, slug, price, stock, unit, material, color, isPublished:false } });
  await prisma.fabricProductImage.create({ data:{ productId: product.id, url:imageUrl, alt:name } });
  await prisma.inventoryMovement.create({ data:{ productId: product.id, delta: stock, reason:"Initial stock" } });
  revalidatePath("/dashboard/seller/products");
  redirect("/dashboard/seller/products?created=1");
}

export default async function SellerProducts({ searchParams }: { searchParams: Promise<{ filter?:string; q?:string; page?:string; error?:string; created?:string }> }){
  const sp= await searchParams;
  const session= await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  if(!profile) return <AdvancedSellerShell title="Products"><div className="p-6">No seller profile</div></AdvancedSellerShell>;
  const filter= sp?.filter||"all";
  const q= (sp?.q||"").toLowerCase().trim();
  const page= Math.max(1, parseInt(sp?.page||"1",10)||1);
  const pageSize= 12;
  let products:any[]=[], total=0, categories:any[]=[];
  try {
    const where:any={ sellerId: profile.id };
    if(filter==="published") where.isPublished=true;
    if(filter==="draft") where.isPublished=false;
    if(q) where.name={ contains:q, mode:"insensitive" };
    [categories, total] = await Promise.all([prisma.fabricCategory.findMany({ orderBy:{ name:"asc" } }), prisma.fabricProduct.count({ where })]);
    products= await prisma.fabricProduct.findMany({ where, include:{ images:true, category:true }, orderBy:{ updatedAt:"desc" }, skip:(page-1)*pageSize, take:pageSize });
  } catch { products=[]; }

  return (
    <AdvancedSellerShell title="My Products">
      <div className="space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">My Products — {profile.businessName}</h1><p className="text-sm text-muted-foreground">Ownership-scoped • Inventory movement logged • Delivery to tailor supported</p></div><div className="flex gap-2 text-xs"><span className="px-3 py-1 rounded-full bg-white border">{total} total</span></div></div>
        {sp?.created && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">✓ Product created as draft — publish after verification</div>}
        <Card><CardHeader><CardTitle className="text-base">+ Add fabric product</CardTitle></CardHeader><CardContent>
          <form action={createProduct} className="grid md:grid-cols-2 gap-4 text-sm">
            <div><Label>Name *</Label><Input name="name" required placeholder="Swiss Lace Ivory" /></div><div><Label>Price (NGN) *</Label><Input name="price" type="number" required placeholder="12000" /></div>
            <div><Label>Category</Label><select name="categoryId" className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">— No category —</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><Label>Stock</Label><Input name="stock" type="number" defaultValue={20} /></div>
            <div><Label>Unit</Label><select name="unit" className="w-full h-9 rounded-xl border px-3 bg-white"><option value="metre">metre</option><option value="yard">yard</option></select></div>
            <div><Label>Material</Label><Input name="material" placeholder="Lace, Ankara" /></div>
            <div><Label>Color</Label><Input name="color" placeholder="Ivory, Gold" /></div>
            <div className="md:col-span-2"><Label>Image URL</Label><Input name="imageUrl" placeholder="https://... or upload via /api/upload" /></div>
            <Button type="submit" className="md:col-span-2 w-full">Create draft product</Button>
          </form>
        </CardContent></Card>

        <div className="flex gap-2 text-xs"><Link href="/dashboard/seller/products" className={`px-3 py-1.5 rounded-full border ${filter==="all"?"bg-midnight text-white":"bg-white"}`}>All</Link><Link href="/dashboard/seller/products?filter=published" className={`px-3 py-1.5 rounded-full border ${filter==="published"?"bg-emeraldDeep text-white":"bg-white"}`}>Published</Link><Link href="/dashboard/seller/products?filter=draft" className={`px-3 py-1.5 rounded-full border ${filter==="draft"?"bg-amber-100 border-amber-200":"bg-white"}`}>Drafts</Link></div>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.length===0 ? <Card className="md:col-span-4"><CardContent className="p-8 text-center text-sm text-muted-foreground">No products — create your first fabric above. Published appear at /fabrics & /sellers/{profile.slug}</CardContent></Card>
          : products.map((p:any)=><Card key={p.id} className="overflow-hidden hover:shadow-card transition"><div className="aspect-[4/3] bg-ivory relative"><img src={p.images[0]?.url || "https://picsum.photos/seed/fabric/400/300"} alt={p.name} className="h-full w-full object-cover" /><div className="absolute top-2 left-2"><Badge variant={p.isPublished?"success":"secondary"}>{p.isPublished?"PUBLISHED":"DRAFT"}</Badge></div><div className="absolute top-2 right-2 text-[11px] px-2 py-0.5 rounded-full bg-white/90 border">{p.stock} in stock</div></div>
            <CardHeader className="pb-2"><CardTitle className="text-sm leading-tight">{p.name}</CardTitle><p className="text-xs text-muted-foreground">{p.material||"—"} • {p.color||"—"} • {p.category?.name||"—"} • ₦{Number(p.price).toLocaleString()}/{p.unit}</p></CardHeader>
            <CardContent className="flex gap-2"><form action={togglePublish} className="flex-1"><input type="hidden" name="productId" value={p.id}/><Button size="sm" variant={p.isPublished?"outline":"default"} className="w-full h-7 text-xs">{p.isPublished?"Unpublish":"Publish"}</Button></form><Link href={`/fabrics/${p.slug}`} className="flex-1"><Button size="sm" variant="outline" className="w-full h-7 text-xs">View</Button></Link></CardContent></Card>)}
        </div>
      </div>
    </AdvancedSellerShell>
  );
}
