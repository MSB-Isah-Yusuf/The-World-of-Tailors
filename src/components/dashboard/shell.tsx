import Link from "next/link";
import { LayoutDashboard, Users, ShoppingBag, Package, Settings, LogOut, Bell } from "lucide-react";

export function DashboardShell({ role, title, nav, children }: { role: string; title: string; nav: { href: string; label: string }[]; children: React.ReactNode }) {
  const roleColor: Record<string,string> = {
    CUSTOMER: "bg-midnight",
    TAILOR: "bg-plum",
    FABRIC_SELLER: "bg-emeraldDeep",
    ADMIN: "bg-burgundy",
  };
  const bg = roleColor[role] || "bg-midnight";
  return (
    <div className="min-h-screen bg-ivory flex">
      {/* Sidebar — deep navy refined */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-midnight text-ivory">
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 border border-gold/30 grid place-items-center text-gold text-xs font-bold">TWT</div>
            <div>
              <div className="font-display text-sm font-semibold leading-none">The World of Tailors</div>
              <div className="text-[10px] tracking-[0.14em] text-gold">TWT • {role}</div>
            </div>
          </div>
          <div className={`mt-4 rounded-full ${bg} text-white text-xs px-3 py-1 inline-flex items-center gap-1 border border-white/10`}>
            <LayoutDashboard className="h-3 w-3" /> {title}
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
          {nav.map(n => (
            <Link key={n.href} href={n.href} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-ivory/85 hover:bg-white/10 hover:text-ivory transition">
              <span className="h-2 w-2 rounded-full bg-gold/60" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
            <div className="font-semibold text-gold">Atelier Verified</div>
            <div className="text-ivory/70">Least-privilege RBAC • Ownership-scoped • Audit logged</div>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs text-ivory/70 hover:text-ivory"><LogOut className="h-3 w-3" /> Exit to Storefront</Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-midnight/10 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="lg:hidden font-display font-semibold">TWT • {role}</span>
            <span className="hidden lg:block text-xs tracking-[0.16em] text-taupe font-semibold">{title.toUpperCase()} WORKSPACE</span>
            <span className="hidden sm:inline text-xs text-taupe">• Secure • Paystack • Mapbox ready</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 grid place-items-center rounded-full bg-ivory border"><Bell className="h-4 w-4" /></button>
            <div className="h-8 w-8 rounded-full bg-plum text-white grid place-items-center text-xs">U</div>
          </div>
        </header>
        <main className="flex-1 p-6 bg-ivory">{children}</main>
      </div>
    </div>
  );
}
