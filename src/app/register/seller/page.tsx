import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

async function createSeller(formData: FormData) {
  "use server";
  const name = String(formData.get("name")||"");
  const email = String(formData.get("email")||"").toLowerCase();
  const password = String(formData.get("password")||"");
  const phone = String(formData.get("phone")||"");
  const businessName = String(formData.get("businessName")||"");
  const city = String(formData.get("city")||"");
  if (!email || !password || !businessName) throw new Error("Missing");
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("exists");
  const hash = await bcrypt.hash(password, 10);
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,60)+"-"+Date.now().toString().slice(-4);
  const user = await prisma.user.create({ data: { name, email, passwordHash: hash, role: "FABRIC_SELLER", phone, status: "ACTIVE" } });
  await prisma.sellerProfile.create({ data: { userId: user.id, businessName, slug, city, country: "Nigeria", businessStatus: "PENDING", isPublished: false } });
  redirect("/login?registered=seller");
}
export default function SellerRegister() {
  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Card>
          <CardHeader><CardTitle className="font-display text-2xl">Fabric Seller Registration</CardTitle><p className="text-sm text-muted-foreground">Same verification & security standards as tailors. Inventory is strictly per-seller with atomic stock updates.</p></CardHeader>
          <CardContent>
            <form action={createSeller} className="space-y-4">
              <div><Label>Full name</Label><Input name="name" required /></div>
              <div><Label>Business name</Label><Input name="businessName" required placeholder="Lagos Fabrics Hub" /></div>
              <div><Label>Email</Label><Input name="email" type="email" required /></div>
              <div><Label>Password</Label><Input name="password" type="password" required /></div>
              <div><Label>City</Label><Input name="city" placeholder="Lagos" /></div>
              <Button type="submit" className="w-full">Create seller account</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
