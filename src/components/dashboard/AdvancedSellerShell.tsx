"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { LayoutDashboard, ShoppingBag, Package, Boxes, Users, Star, Wallet, Building2, MapPin, Settings, Sun, Moon, Globe, Truck, Tag, History, FileText, BarChart3, ShieldCheck, Bell, PlusCircle } from "lucide-react";
import { useThemeToggle } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";

const NAV = [
  { href: "/dashboard/seller", label:"Overview", icon: LayoutDashboard },
  { href: "/dashboard/seller/products", label:"My Products", icon: Package },
  { href: "/dashboard/seller/products/new", label:"Add New Product", icon: PlusCircle },
  { href: "/dashboard/seller/categories", label:"Categories", icon: Tag },
  { href: "/dashboard/seller/inventory", label:"Inventory", icon: Boxes },
  { href: "/dashboard/seller/inventory/history", label:"Stock History", icon: History },
  { href: "/dashboard/seller/orders", label:"Fabric Orders", icon: ShoppingBag },
  { href: "/dashboard/seller/customers", label:"Customers", icon: Users },
  { href: "/dashboard/seller/deliveries", label:"Deliveries", icon: Truck },
  { href: "/dashboard/seller/reviews", label:"Reviews", icon: Star },
  { href: "/dashboard/seller/reports", label:"Sales Reports", icon: BarChart3 },
  { href: "/dashboard/seller/earnings", label:"Earnings", icon: Wallet },
  { href: "/dashboard/seller/profile", label:"Business Profile", icon: Building2 },
  { href: "/dashboard/seller/location", label:"Location Settings", icon: MapPin },
  { href: "/dashboard/seller/delivery", label:"Delivery Coverage", icon: FileText },
  { href: "/dashboard/seller/verification", label:"Verification", icon: ShieldCheck },
  { href: "/dashboard/seller/notifications", label:"Notifications", icon: Bell },
  { href: "/dashboard/seller/account", label:"Account Settings", icon: Settings },
];

export function AdvancedSellerShell({ title, children }: { title:string; children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolved, setTheme } = useThemeToggle();
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  return (
    <div className="min-h-screen bg-ivory dark:bg-midnight flex">
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-midnight text-ivory">
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-white/10 border border-gold/30 grid place-items-center text-gold text-xs font-bold">TWT</div><div><div className="font-display text-sm font-semibold">The World of Tailors</div><div className="text-[10px] tracking-[0.14em] text-gold">TWT • SELLER</div></div></div>
          <div className="mt-3 text-xs px-3 py-1 rounded-full bg-emeraldDeep border border-white/10 inline-flex">{title}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
          {NAV.map(n=>{
            const active = pathname===n.href;
            return <Link key={n.href} href={n.href} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${active?"bg-gold text-midnight font-semibold":"text-ivory/85 hover:bg-white/10 hover:text-ivory"}`}><n.icon className="h-4 w-4" />{n.label}</Link>;
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex gap-2">
            <button onClick={()=> setTheme(resolved==="dark"?"light":"dark")} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-xs border border-white/10 hover:bg-white/15">{resolved==="dark"?<><Sun className="h-3 w-3"/> Light</>:<><Moon className="h-3 w-3"/> Dark</>}</button>
            <button onClick={()=> setLang(lang==="EN"?"HA":"EN")} className="flex-1 px-3 py-2 rounded-xl bg-gold text-midnight text-xs font-bold">{lang==="EN"?"EN | HA":"HA | EN"}</button>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs text-ivory/70 hover:text-ivory"><Building2 className="h-3 w-3"/> Exit to Storefront</Link>
        </div>
      </aside>
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-midnight text-ivory border-t border-white/10 px-2 py-2 flex overflow-x-auto gap-1">
        {NAV.slice(0,5).map(n=><Link key={n.href} href={n.href} className={`flex flex-col items-center px-3 py-1 rounded-xl text-[10px] ${pathname===n.href?"bg-gold text-midnight":"text-ivory/80"}`}><n.icon className="h-4 w-4"/>{n.label.split(" ")[0]}</Link>)}
        <button onClick={()=>setOpen(!open)} className="px-3 py-1 rounded-xl bg-white/10 text-xs">☰</button>
      </div>
      {open && <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={()=>setOpen(false)}><div className="absolute left-0 top-0 bottom-0 w-[280px] bg-midnight text-ivory p-4 overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="font-display font-semibold mb-4">Seller Navigation</div>
        {NAV.map(n=><Link key={n.href} href={n.href} onClick={()=>setOpen(false)} className={`flex gap-2 px-3 py-2 rounded-xl text-sm ${pathname===n.href?"bg-gold text-midnight":"text-ivory/85"}`}><n.icon className="h-4 w-4"/>{n.label}</Link>)}
        <div className="mt-4 flex gap-2"><button onClick={()=>setTheme(resolved==="dark"?"light":"dark")} className="flex-1 px-3 py-2 rounded-xl bg-white/10 text-xs">{resolved==="dark"?"Light":"Dark"}</button><button onClick={()=>setLang(lang==="EN"?"HA":"EN")} className="flex-1 px-3 py-2 rounded-xl bg-gold text-midnight text-xs">{lang==="EN"?"EN→HA":"HA→EN"}</button></div>
      </div></div>}
      <div className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        <header className="h-14 bg-white dark:bg-midnight dark:border-white/10 border-b border-midnight/10 flex items-center justify-between px-6">
          <div className="text-xs tracking-[0.16em] text-taupe font-semibold">{title.toUpperCase()} WORKSPACE • <span className="text-gold">{lang}</span> • {resolved}</div>
          <div className="flex gap-2">
            <button onClick={()=>setTheme(resolved==="dark"?"light":"dark")} className="h-8 w-8 grid place-items-center rounded-full bg-ivory border dark:bg-white/10">{resolved==="dark"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}</button>
            <button onClick={()=>setLang(lang==="EN"?"HA":"EN")} className="h-8 px-3 rounded-full bg-midnight text-white text-xs flex items-center gap-1"><Globe className="h-3 w-3"/>{lang}</button>
          </div>
        </header>
        <main className="flex-1 p-6 bg-ivory dark:bg-midnight dark:text-ivory">{children}</main>
      </div>
    </div>
  );
}
