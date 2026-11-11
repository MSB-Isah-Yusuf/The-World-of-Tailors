import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

async function createCustomer(formData: FormData) {
  "use server";
  const name = String(formData.get("name")||"").trim();
  const email = String(formData.get("email")||"").toLowerCase().trim();
  const password = String(formData.get("password")||"");
  const phone = String(formData.get("phone")||"").trim();
  if (!email || !password) redirect("/register/customer?error=MissingFields");
  // friendly duplicate check – redirect with banner instead of throwing digest
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // preserve email for UX and show role taken
    redirect(`/register/customer?error=EmailExists&email=${encodeURIComponent(email)}&role=${existing.role}`);
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { name, email, passwordHash: hash, role: "CUSTOMER", phone, status: "ACTIVE" } });
    redirect("/login?registered=customer&email=" + encodeURIComponent(email));
  } catch (e:any) {
    // race: unique constraint P2002
    if (e?.code === "P2002" || String(e?.message||"").includes("Unique constraint")) {
      redirect(`/register/customer?error=EmailExists&email=${encodeURIComponent(email)}`);
    }
    // unexpected – show banner, not digest
    redirect(`/register/customer?error=CreateFailed&email=${encodeURIComponent(email)}`);
  }
}

export default async function CustomerRegister({ searchParams }: { searchParams: Promise<{ error?: string; email?: string; role?: string }> }) {
  const sp = await searchParams;
  const errorMap: Record<string,{title:string;detail:string}> = {
    EmailExists: { title: "That email is already in use", detail: `The email ${sp?.email ? `“${sp.email}”` : "you entered"} is already registered${sp?.role ? ` as ${sp.role}` : ""}. Please log in with your existing password, use a different email, or reset your password. One email = one account (customer / tailor / seller).` },
    MissingFields: { title: "Missing required fields", detail: "Please fill in email and password." },
    CreateFailed: { title: "Could not create account", detail: "Please try again. If this persists, contact support." },
  };
  const err = sp?.error ? errorMap[sp.error] : null;

  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-md px-6 py-12">
        <Card>
          <CardHeader><CardTitle>Customer Registration</CardTitle><p className="text-sm text-muted-foreground">Book tailors, buy fabrics, track orders. One login for all roles.</p></CardHeader>
          <CardContent>
            {err && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                <div className="font-semibold">⚠ {err.title}</div>
                <div className="mt-1 text-xs leading-relaxed">{err.detail}</div>
                <div className="mt-2 flex gap-2 text-xs">
                  <Link href={`/login${sp?.email ? `?email=${encodeURIComponent(sp.email)}` : ""}`} className="underline font-semibold text-amber-900">Go to login →</Link>
                  <Link href="/forgot-password" className="underline">Reset password</Link>
                </div>
              </div>
            )}
            <form action={createCustomer} className="space-y-4">
              <div><Label>Full name</Label><Input name="name" required placeholder="Ade Johnson" /></div>
              <div><Label>Email</Label><Input name="email" type="email" required placeholder="you@twt.ng" defaultValue={sp?.email||""} /></div>
              <div><Label>Phone</Label><Input name="phone" placeholder="+234 ..." /></div>
              <div><Label>Password</Label><Input name="password" type="password" required placeholder="Minimum 8 characters" /></div>
              <Button type="submit" className="w-full">Create account</Button>
              <div className="text-center text-sm"><Link href="/login" className="text-emerald-800 underline">Already have an account? Sign in</Link></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
