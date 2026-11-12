import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function createProduct(formData: FormData) {
  "use server";
  const session = await requireRole(["FABRIC_SELLER"]);
  const profile: any = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) redirect("/dashboard/seller/profile");
  const name = String(formData.get("name") || "").trim();
  const categoryId = String(formData.get("categoryId") || "").trim() || null;
  const price = Number(formData.get("price") || 0);
  const stock = Number(formData.get("stock") || 0);
  const unit = String(formData.get("unit") || "metre");
  const material = String(formData.get("material") || "").trim();
  const color = String(formData.get("color") || "").trim();
  const pattern = String(formData.get("pattern") || "").trim();
  const minOrderQty = Number(formData.get("minOrderQty") || 1);
  const imageUrl = String(formData.get("imageUrl") || "").trim() || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=400&auto=format&fit=crop";
  if (!name || !price) return;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,50)+"-"+Date.now().toString().slice(-6);
  const product: any = await prisma.fabricProduct.create({ data: { sellerId: profile.id, categoryId, name, slug, price, stock, unit, material, color, pattern, minOrderQty, isPublished: false } });
  await prisma.fabricProductImage.create({ data: { productId: product.id, url: imageUrl, alt: name } });
  await prisma.inventoryMovement.create({ data: { productId: product.id, delta: stock, reason: "Initial stock" } });
  await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "CREATE_PRODUCT", entity: "FabricProduct", entityId: product.id } });
  revalidatePath("/dashboard/seller/products");
  redirect("/dashboard/seller/products?created=1");
}

export default async function NewProductPage() {
  await requireRole(["FABRIC_SELLER"]);
  const cats: any[] = await prisma.fabricCategory.findMany({ orderBy: { name: "asc" } }).catch(()=>[]);
  return (
    <AdvancedSellerShell title="Add New Product">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Add New Product</h1><p className="text-sm text-muted-foreground">Units per yard/metre/piece/roll/bundle • Visible throughout marketplace • Draft until published</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Product details • publish after verification</CardTitle></CardHeader><CardContent>
          <form action={createProduct} className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="md:col-span-2"><Label>Name *</Label><Input name="name" required placeholder="Swiss Lace Ivory — Champagne Burst" /></div>
            <div><Label>Price (NGN) *</Label><Input name="price" type="number" required placeholder="12000" /></div>
            <div><Label>Stock</Label><Input name="stock" type="number" defaultValue={20} /></div>
            <div><Label>Unit</Label><select name="unit" className="w-full h-9 rounded-xl border px-3 bg-white"><option value="metre">per metre</option><option value="yard">per yard</option><option value="piece">per piece</option><option value="roll">per roll</option><option value="bundle">per bundle</option></select></div>
            <div><Label>Min order qty</Label><Input name="minOrderQty" type="number" defaultValue={1} /></div>
            <div><Label>Material</Label><Input name="material" placeholder="Lace, Ankara, Wool" /></div>
            <div><Label>Color</Label><Input name="color" placeholder="Ivory, Gold, Navy" /></div>
            <div><Label>Pattern</Label><Input name="pattern" placeholder="Floral, Geometric, Plain" /></div>
            <div><Label>Category</Label><select name="categoryId" className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">— No category —</option>{cats.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="md:col-span-2"><Label>Image URL</Label><Input name="imageUrl" placeholder="https://... or use /api/uploads then paste URL" /></div>
            <Button type="submit" className="md:col-span-2 w-full">Create draft — add to /dashboard/seller/products</Button>
          </form>
        </CardContent></Card>
      </div>
    </AdvancedSellerShell>
  );
}
