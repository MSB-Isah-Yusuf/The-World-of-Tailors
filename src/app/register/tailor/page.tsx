import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { TailorRegisterClient } from "./TailorRegisterClient";

async function createTailor(formData: FormData) {
  "use server";
  const name = String(formData.get("name")||"").trim();
  const email = String(formData.get("email")||"").toLowerCase().trim();
  const password = String(formData.get("password")||"");
  const phone = String(formData.get("phone")||"").trim();
  const businessName = String(formData.get("businessName")||"").trim();
  const bio = String(formData.get("bio")||"").trim();
  const country = String(formData.get("country")||"Nigeria").trim();
  const countryCode = String(formData.get("countryCode")||"NG").trim();
  const state = String(formData.get("state")||"").trim();
  const city = String(formData.get("city")||"").trim();
  const lga = String(formData.get("lga")||"").trim();
  const address = String(formData.get("address")||"").trim();
  const street = String(formData.get("street")||address).trim();
  const latitude = formData.get("latitude") ? Number(formData.get("latitude")) : undefined;
  const longitude = formData.get("longitude") ? Number(formData.get("longitude")) : undefined;
  const serviceRadiusKm = formData.get("serviceRadiusKm") ? Number(formData.get("serviceRadiusKm")) : 20;
  const specialties = String(formData.get("specialties")||"Bespoke").trim();
  if (!email || !password || !businessName) redirect("/register/tailor?error=MissingFields");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect(`/register/tailor?error=EmailExists&email=${encodeURIComponent(email)}&role=${existing.role}`);
  try {
    const hash = await bcrypt.hash(password, 10);
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,60)+"-"+Date.now().toString().slice(-4);
    const user = await prisma.user.create({ data: { name, email, passwordHash: hash, role: "TAILOR", phone, status: "ACTIVE" } });
    await prisma.tailorProfile.create({ data: { userId: user.id, businessName, slug, bio, specialties: JSON.stringify(specialties.split(",").map(s=>s.trim())), city, state, country, countryCode, lga, address, street, latitude, longitude, serviceRadiusKm, businessStatus: "PENDING", isPublished: false } });
    await prisma.auditLog.create({ data:{ userId: user.id, action:"REGISTER_TAILOR", entity:"TailorProfile", entityId: user.id, metadata:{ businessName, state, city, lat:latitude, lng:longitude } } });
    redirect("/login?registered=tailor&email=" + encodeURIComponent(email));
  } catch (e:any) {
    if (e?.code === "P2002" || String(e?.message||"").includes("Unique constraint")) redirect(`/register/tailor?error=EmailExists&email=${encodeURIComponent(email)}`);
    redirect(`/register/tailor?error=CreateFailed&email=${encodeURIComponent(email)}`);
  }
}

export default async function TailorRegister({ searchParams }: { searchParams: Promise<{ error?: string; email?: string; role?: string }> }) {
  const sp = await searchParams;
  const errorMap: Record<string,{title:string;detail:string}> = {
    EmailExists: { title: "That email is already in use", detail: `The email ${sp?.email ? `“${sp.email}”` : "you entered"} is already registered${sp?.role ? ` as ${sp.role}` : ""}. A tailor account cannot reuse an existing email.` },
    MissingFields: { title: "Missing required fields", detail: "Business name, email and password are required." },
    CreateFailed: { title: "Could not create tailor account", detail: "Please try again. Contact support if this persists." },
  };
  const err = sp?.error ? errorMap[sp.error] : null;
  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Card>
          <CardHeader><CardTitle className="font-display text-2xl">Tailor Registration</CardTitle><p className="text-sm text-muted-foreground">Verified tailors get a public portfolio at /tailors/[slug]. Business verification required before publishing. Location is searchable.</p></CardHeader>
          <CardContent>
            {err && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                <div className="font-semibold">⚠ {err.title}</div>
                <div className="mt-1 text-xs leading-relaxed">{err.detail}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <Link href={`/login${sp?.email ? `?email=${encodeURIComponent(sp.email)}` : ""}`} className="underline font-semibold text-amber-900">Go to login →</Link>
                  <Link href="/forgot-password" className="underline">Reset password</Link>
                </div>
              </div>
            )}
            <form action={createTailor} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Full name *</Label><Input name="name" required placeholder="Ade Johnson" /></div>
                <div><Label>Phone</Label><Input name="phone" placeholder="+234 ..." /></div>
              </div>
              <div><Label>Email *</Label><Input name="email" type="email" required placeholder="tailor@example.com" defaultValue={sp?.email||""} /></div>
              <div><Label>Password *</Label><Input name="password" type="password" required placeholder="Minimum 8 characters" /></div>
              <div><Label>Business name *</Label><Input name="businessName" required placeholder="Ade Bespoke Atelier" /></div>
              <TailorRegisterClient />
              <div><Label>Specialties (comma separated)</Label><Input name="specialties" placeholder="Agbada, Kaftan, Corporate — 12 years experience" defaultValue="Bespoke, Agbada, Kaftan" /></div>
              <div><Label>Bio</Label><Input name="bio" placeholder="12 years experience, Ikeja atelier..." /></div>
              <Button type="submit" className="w-full">Submit application — await verification</Button>
              <div className="text-center text-sm"><Link href="/login" className="text-emerald-800 underline">Already have an account? Sign in</Link></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
