import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

// Role → dashboard mapping (server-trusted, never from client)
const roleHome: Record<string, string> = {
  CUSTOMER: "/dashboard/customer",
  TAILOR: "/dashboard/tailor",
  FABRIC_SELLER: "/dashboard/seller",
  ADMIN: "/admin",
};

async function getRedirectForEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user?.role && roleHome[user.role]) return roleHome[user.role];
  } catch {}
  return "/"; // fallback; Auth will still set session
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const sp = await searchParams;
  const demoMode = process.env.DEMO_MODE !== "false";

  async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const password = String(formData.get("password") || "");
    if (!email || !password) redirect("/login?error=MissingFields");

    // Pre-resolve role to choose correct post-login destination (trusted DB, not client)
    const redirectTo = await getRedirectForEmail(email);

    try {
      // Auth.js v5 server action — handles bcrypt + session, no CSRF token needed
      await signIn("credentials", { email, password, redirectTo });
    } catch (error) {
      // Next.js redirect throws — must be re-thrown
      if (error && typeof error === "object" && "digest" in error && String((error as any).digest).includes("NEXT_REDIRECT")) {
        throw error;
      }
      if (error instanceof AuthError) {
        // CredentialsSignin, etc.
        redirect("/login?error=CredentialsSignin");
      }
      redirect("/login?error=CredentialsSignin");
    }
  }

  async function demoLogin(formData: FormData) {
    "use server";
    if (process.env.DEMO_MODE === "false") redirect("/login?error=DemoDisabled");
    const email = String(formData.get("email") || "").toLowerCase().trim();
    const allowed = ["customer@demo.twt.ng", "tailor@demo.twt.ng", "seller@demo.twt.ng", "admin@demo.twt.ng"];
    if (!allowed.includes(email)) redirect("/login?error=DemoNotAllowed");
    const redirectTo = await getRedirectForEmail(email);
    try {
      await signIn("credentials", { email, password: "DemoPass123!", redirectTo });
    } catch (error) {
      if (error && typeof error === "object" && "digest" in error && String((error as any).digest).includes("NEXT_REDIRECT")) throw error;
      redirect("/login?error=DemoFailed");
    }
  }

  const errorMap: Record<string, string> = {
    CredentialsSignin: "Invalid email or password. Try demo accounts below.",
    MissingCSRF: "Session expired — please try again.",
    MissingFields: "Please fill in both email and password.",
    DemoDisabled: "Demo mode is disabled on this environment.",
    DemoNotAllowed: "That demo account is not allowed.",
    DemoFailed: "Demo sign-in failed — ensure seed data is present (npm run db:seed).",
  };

  return (
    <div className="min-h-screen bg-ivory">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-12 grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <Card className="shadow-premium border-midnight/10">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
              <p className="text-sm text-taupe">One trusted login for customers, tailors, fabric sellers & admins. Redirect is role-derived server-side.</p>
            </CardHeader>
            <CardContent>
              {sp?.error && (
                <div className="mb-4 rounded-xl bg-burgundy/10 text-burgundy border border-burgundy/20 px-3 py-2 text-sm">
                  {errorMap[sp.error] || "Sign-in failed. Please try again."}{" "}
                  <span className="text-xs opacity-80">({sp.error})</span>
                </div>
              )}

              <form action={loginAction} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@example.com" required defaultValue="customer@demo.twt.ng" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" required defaultValue="DemoPass123!" />
                </div>
                <Button type="submit" className="w-full" variant="primary">Sign in</Button>
                <div className="flex justify-between text-sm">
                  <Link href="/forgot-password" className="text-plum underline">Forgot password?</Link>
                  <Link href="/register" className="text-plum underline">Create account</Link>
                </div>
              </form>

              <div className="mt-6 text-xs text-taupe">
                Protected by secure httpOnly sessions, server-side RBAC & ownership checks. CSRF is handled server-side — no hidden csrfToken needed.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-gold/30 bg-gradient-champagne-ivory">
            <CardHeader><CardTitle className="text-base">✦ Demo Access (TWT)</CardTitle><p className="text-xs text-taupe">One-click demo logins — controlled by <code>DEMO_MODE</code> env flag. Disabled when <code>DEMO_MODE=false</code> in production.</p></CardHeader>
            <CardContent className="space-y-3">
              {demoMode ? (
                <>
                  {[
                    { label: "Enter Customer Demo", email: "customer@demo.twt.ng", desc: "Browse, book, buy fabric, track orders" },
                    { label: "Enter Tailor Demo", email: "tailor@demo.twt.ng", desc: "Manage designs, bookings & production" },
                    { label: "Enter Fabric Seller Demo", email: "seller@demo.twt.ng", desc: "Products, inventory & fulfilment" },
                    { label: "Enter Admin Demo", email: "admin@demo.twt.ng", desc: "Verification, moderation & audit logs" },
                  ].map(d => (
                    <form key={d.email} action={demoLogin}>
                      <input type="hidden" name="email" value={d.email} />
                      <button type="submit" className="w-full text-left rounded-xl border bg-white p-3 hover:shadow-card transition">
                        <div className="text-sm font-semibold">{d.label}</div>
                        <div className="text-xs text-taupe">{d.desc}</div>
                        <div className="text-[11px] text-taupe mt-1">{d.email} / DemoPass123!</div>
                      </button>
                    </form>
                  ))}
                  <p className="text-[11px] text-taupe">Seeded via <code>npm run db:seed</code>. Redirect uses trusted DB role → correct dashboard.</p>
                </>
              ) : (
                <p className="text-sm text-taupe">Demo mode is disabled (DEMO_MODE=false). Use real credentials or enable DEMO_MODE in Vercel env.</p>
              )}
            </CardContent>
          </Card>
          <div className="mt-4 text-xs text-taupe">
            After login trusted server routing:
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
