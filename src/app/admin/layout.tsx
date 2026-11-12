import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { LayoutDashboard, Users, UserCheck, Store, ShieldCheck, Palette, Package, ClipboardList, ShoppingBag, Wallet, Truck, Star, Flag, Bell, BarChart3, Settings, Lock, User } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/customers", label: "Customer Management", icon: Users },
  { href: "/admin/tailors", label: "Tailor Management", icon: UserCheck },
  { href: "/admin/sellers", label: "Seller Management", icon: Store },
  { href: "/admin/verification", label: "Tailor Verification", icon: ShieldCheck },
  { href: "/admin/seller-verification", label: "Seller Verification", icon: ShieldCheck },
  { href: "/admin/designs", label: "Design Moderation", icon: Palette },
  { href: "/admin/fabrics", label: "Fabric Moderation", icon: Package },
  { href: "/admin/bookings", label: "Tailoring Bookings", icon: ClipboardList },
  { href: "/admin/orders", label: "Fabric Orders", icon: ShoppingBag },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/disputes", label: "Disputes", icon: Flag },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Platform Settings", icon: Settings },
  { href: "/admin/audit", label: "Security & Audit", icon: Lock },
  { href: "/admin/profile", label: "Admin Profile", icon: User },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);
  return (
    <div className="min-h-screen bg-ivory flex">
      <aside className="hidden lg:flex w-[270px] shrink-0 flex-col bg-midnight text-ivory sticky top-0 h-screen overflow-auto">
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 border border-gold/30 grid place-items-center text-gold text-xs font-bold">TWT</div>
            <div><div className="font-display text-sm font-semibold leading-none">The World of Tailors</div><div className="text-[10px] tracking-[0.14em] text-gold">ADMIN • PLATFORM CONTROL</div></div>
          </Link>
          <div className="mt-4 rounded-full bg-burgundy text-white text-xs px-3 py-1 inline-flex items-center gap-1 border border-white/10"><LayoutDashboard className="h-3 w-3"/> Administration</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
          {NAV.map((n) => (
            <Link key={n.href + n.label} href={n.href} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-ivory/85 hover:bg-white/10 hover:text-ivory transition">
              <n.icon className="h-4 w-4 shrink-0"/><span className="truncate">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs">
            <div className="font-semibold text-gold">Admin verified</div><div className="text-ivory/70">Least-privilege • Audit logged • No public admin creation</div>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs text-ivory/70 hover:text-ivory">← Exit to Storefront</Link>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden sticky top-0 z-30 bg-midnight text-ivory border-b border-white/10 px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {NAV.slice(0,6).map(n => <Link key={n.href+n.label} href={n.href} className="shrink-0 px-3 py-1 rounded-full bg-white/10 text-xs">{n.label.split(" ")[0]}</Link>)}
          <Link href="/admin" className="shrink-0 px-3 py-1 rounded-full bg-gold text-midnight text-xs font-semibold">More →</Link>
        </div>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
