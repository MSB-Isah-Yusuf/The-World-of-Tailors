import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

async function createTailor(formData: FormData) {
  "use server";
  const name = String(formData.get("name")||"");
  const email = String(formData.get("email")||"").toLowerCase();
  const password = String(formData.get("password")||"");
  const phone = String(formData.get("phone")||"");
  const businessName = String(formData.get("businessName")||"");
  const city = String(formData.get("city")||"");
  const bio = String(formData.get("bio")||"");
  if (!email || !password || !businessName) throw new Error("Missing fields");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email already exists");
  const hash = await bcrypt.hash(password, 10);
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,60)+"-"+Date.now().toString().slice(-4);
  const user = await prisma.user.create({ data: { name, email, passwordHash: hash, role: "TAILOR", phone, status: "ACTIVE" } });
  await prisma.tailorProfile.create({ data: { userId: user.id, businessName, slug, bio, specialties: JSON.stringify(["Bespoke"]), city, country: "Nigeria", businessStatus: "PENDING", isPublished: false } });
  redirect("/login?registered=tailor");
}

export default function TailorRegister() {
  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Card>
          <CardHeader><CardTitle className="font-display text-2xl">Tailor Registration</CardTitle><p className="text-sm text-muted-foreground">Verified tailors get a public portfolio at /tailors/[slug]. Business verification is required before publishing.</p></CardHeader>
          <CardContent>
            <form action={createTailor} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Full name</Label><Input name="name" required placeholder="Ade Johnson" /></div>
                <div><Label>Phone</Label><Input name="phone" placeholder="+234 ..." /></div>
              </div>
              <div><Label>Email</Label><Input name="email" type="email" required placeholder="tailor@example.com" /></div>
              <div><Label>Password</Label><Input name="password" type="password" required /></div>
              <div><Label>Business name</Label><Input name="businessName" required placeholder="Ade Bespoke Atelier" /></div>
              <div><Label>City</Label><Input name="city" placeholder="Lagos" /></div>
              <div><Label>Bio / Specializations</Label><Input name="bio" placeholder="Kaftan, Agbada, Corporate — 12 years experience" /></div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">Location picker: address search + map marker + optional geolocation is available on profile setup after registration. Manual entry is always allowed. Private residential addresses are not published by default.</div>
              <Button type="submit" className="w-full">Submit application — await verification</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
