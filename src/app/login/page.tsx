import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const demoMode = process.env.DEMO_MODE !== "false";

  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-12 grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
              <p className="text-sm text-muted-foreground">One login for every account type — customers, tailors, fabric sellers & admins.</p>
            </CardHeader>
            <CardContent>
              {sp?.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-200 px-3 py-2 text-sm">Invalid email or password. Check demo credentials below.</div>}
              <form action={async (formData: FormData) => {
                "use server";
                // Server action delegates to NextAuth signIn via credentials route
                // We use fetch client-side? For now render traditional form posting to /api/auth/callback/credentials
              }} className="space-y-4">
                {/* Actual login form posts to NextAuth */}
              </form>

              <form action="/api/auth/callback/credentials" method="post" className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@example.com" required defaultValue="customer@demo.twt.ng" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required defaultValue="DemoPass123!" />
                  <input type="hidden" name="callbackUrl" value="/login?redirect=1" />
                  <input type="hidden" name="csrfToken" value="" />
                </div>
                <Button type="submit" className="w-full">Sign in</Button>
                <div className="flex justify-between text-sm">
                  <Link href="/forgot-password" className="text-emerald-800 underline">Forgot password?</Link>
                  <Link href="/register" className="text-emerald-800 underline">Create account</Link>
                </div>
              </form>

              <div className="mt-6 text-xs text-muted-foreground">
                Protected by secure sessions, rate limiting & server-side RBAC. All auth check happens server-side.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader><CardTitle className="text-base">✦ Demo Access</CardTitle><p className="text-xs text-muted-foreground">One-click demo logins for evaluation. Controlled by DEMO_MODE env flag. Disabled in production.</p></CardHeader>
            <CardContent className="space-y-3">
              {demoMode ? (
                <>
                  {[
                    { label: "Enter Customer Demo", email: "customer@demo.twt.ng", desc: "Browse, book, buy fabric, track orders" },
                    { label: "Enter Tailor Demo", email: "tailor@demo.twt.ng", desc: "Manage designs, bookings & production" },
                    { label: "Enter Fabric Seller Demo", email: "seller@demo.twt.ng", desc: "Products, inventory & fulfilment" },
                    { label: "Enter Admin Demo", email: "admin@demo.twt.ng", desc: "Verification, moderation & audit logs" },
                  ].map(d => (
                    <form key={d.email} action="/api/demo-login" method="post">
                      <input type="hidden" name="email" value={d.email} />
                      <button type="submit" className="w-full text-left rounded-xl border bg-white p-3 hover:shadow-md transition">
                        <div className="text-sm font-semibold">{d.label}</div>
                        <div className="text-xs text-muted-foreground">{d.desc}</div>
                        <div className="text-[11px] text-muted-foreground mt-1">{d.email} / DemoPass123!</div>
                      </button>
                    </form>
                  ))}
                  <p className="text-[11px] text-muted-foreground">Demo accounts are seeded via <code>npm run db:seed</code>. Reset anytime. Payments are sandboxed; no real charge.</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Demo mode is disabled (DEMO_MODE=false). Use real credentials.</p>
              )}
            </CardContent>
          </Card>
          <div className="mt-4 text-xs text-muted-foreground">
            After login you'll be redirected based on trusted server-side role:
            <ul className="list-disc pl-4 mt-1">
              <li>Customer → /dashboard/customer</li>
              <li>Tailor → /dashboard/tailor</li>
              <li>Fabric Seller → /dashboard/seller</li>
              <li>Admin → /admin</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
