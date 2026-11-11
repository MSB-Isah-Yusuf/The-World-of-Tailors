import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

async function createSeller(formData: FormData) {
  "use server";
  const name = String(formData.get("name")||"").trim();
  const email = String(formData.get("email")||"").toLowerCase().trim();
  const password = String(formData.get("password")||"");
  const phone = String(formData.get("phone")||"").trim();
  const businessName = String(formData.get("businessName")||"").trim();
  const city = String(formData.get("city")||"").trim();
  if (!email || !password || !businessName) redirect("/register/seller?error=MissingFields");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect(`/register/seller?error=EmailExists&email=${encodeURIComponent(email)}&role=${existing.role}`);
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,60)+"-"+Date.now().toString().slice(-4);
    const user = await prisma.user.create({ data: { name, email, passwordHash: hash, role: "FABRIC_SELLER", phone, status: "ACTIVE" } });
    await prisma.sellerProfile.create({ data: { userId: user.id, businessName, slug, city, country: "Nigeria", businessStatus: "PENDING", isPublished: false } });
    redirect("/login?registered=seller&email=" + encodeURIComponent(email));
  } catch (e:any) {
    if (e?.code === "P2002" || String(e?.message||"").includes("Unique constraint")) {
      redirect(`/register/seller?error=EmailExists&email=${encodeURIComponent(email)}`);
    }
    redirect(`/register/seller?error=CreateFailed&email=${encodeURIComponent(email)}`);
  }
}
export default async function SellerRegister({ searchParams }: { searchParams: Promise<{ error?: string; email?: string; role?: string }> }) {
  const sp = await searchParams;
  const errorMap: Record<string,{title:string;detail:string}> = {
    EmailExists: { title: "That email is already in use", detail: `The email ${sp?.email ? `“${sp.email}”` : "you entered"} is already registered${sp?.role ? ` as ${sp.role}` : ""}. Fabric seller registration requires a unique email. Log in, use another email, or reset your password.` },
    MissingFields: { title: "Missing required fields", detail: "Business name, email and password are required." },
    CreateFailed: { title: "Could not create seller account", detail: "Please try again. Contact support if this persists." },
  };
  const err = sp?.error ? errorMap[sp.error] : null;

  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Card>
          <CardHeader><CardTitle className="font-display text-2xl">Fabric Seller Registration</CardTitle><p className="text-sm text-muted-foreground">Same verification & security standards as tailors. Inventory is strictly per-seller with atomic stock updates.</p></CardHeader>
          <CardContent>
            {err && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                <div className="font-semibold">⚠ {err.title}</div>
                <div className="mt-1 text-xs leading-relaxed">{err.detail}</div>
                <div className="mt-2 flex gap-3 text-xs">
                  <Link href={`/login${sp?.email ? `?email=${encodeURIComponent(sp.email)}` : ""}`} className="underline font-semibold text-amber-900">Go to login →</Link>
                  <Link href="/forgot-password" className="underline">Reset password</Link>
                </div>
              </div>
            )}
            <form action={createSeller} className="space-y-4">
              <div><Label>Full name</Label><Input name="name" required placeholder="Emeka Okafor" /></div>
              <div><Label>Business name</Label><Input name="businessName" required placeholder="Lagos Fabrics Hub" /></div>
              <div><Label>Email</Label><Input name="email" type="email" required placeholder="seller@twt.ng" defaultValue={sp?.email||""} /></div>
              <div><Label>Password</Label><Input name="password" type="password" required placeholder="Minimum 8 characters" /></div>
              <div><Label>City</Label><Input name="city" placeholder="Lagos" /></div>
              <Button type="submit" className="w-full">Create seller account</Button>
              <div className="text-center text-sm"><Link href="/login" className="text-emerald-800 underline">Already have an account? Sign in</Link></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
