"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { LayoutDashboard, ClipboardList, Ruler, ShoppingBag, MapPin, Heart, Star, Sun, Moon, Globe, Search, Palette, Store, FileText, ShoppingCart, MessageCircle, Truck, Bell, Settings, Lock } from "lucide-react";
import { useThemeToggle } from "@/lib/theme";
import { useLanguage } from "@/lib/i18n";

const NAV = [
  { href: "/dashboard/customer", labelKey:"overview", icon: LayoutDashboard },
  { href: "/dashboard/customer/discover", labelKey:"discoverTailors", icon: Search },
  { href: "/dashboard/customer/designs", labelKey:"browseDesigns", icon: Palette },
  { href: "/dashboard/customer/marketplace", labelKey:"fabricMarketplace", icon: Store },
  { href: "/dashboard/customer/bookings", labelKey:"myBookings", icon: ClipboardList },
  { href: "/dashboard/customer/measurements", labelKey:"measurements", icon: Ruler },
  { href: "/dashboard/customer/orders", labelKey:"fabricOrders", icon: ShoppingBag },
  { href: "/dashboard/customer/cart", labelKey:"shoppingCart", icon: ShoppingCart },
  { href: "/dashboard/customer/favorites", labelKey:"favorites", icon: Heart },
  { href: "/dashboard/customer/messages", labelKey:"messages", icon: MessageCircle },
  { href: "/dashboard/customer/deliveries", labelKey:"deliveryTracking", icon: Truck },
  { href: "/dashboard/customer/reviews", labelKey:"reviews", icon: Star },
  { href: "/dashboard/customer/addresses", labelKey:"addresses", icon: MapPin },
  { href: "/dashboard/customer/notifications", labelKey:"notifications", icon: Bell },
  { href: "/dashboard/customer/account", labelKey:"accountSettings", icon: Settings },
  { href: "/dashboard/customer/privacy", labelKey:"privacySecurity", icon: Lock },
];

export function AdvancedCustomerShell({ title, children }: { title:string; children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolved, setTheme } = useThemeToggle();
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  return (
    <div className="min-h-screen bg-ivory dark:bg-midnight flex">
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-midnight text-ivory">
        <div className="px-6 pt-6 pb-4 border-b border-white/10"><div className="flex items-center gap-2"><div className="h-8 w-8 rounded-lg bg-white/10 border border-gold/30 grid place-items-center text-gold text-xs font-bold">TWT</div><div><div className="font-display text-sm font-semibold">The World of Tailors</div><div className="text-[10px] tracking-[0.14em] text-gold">TWT • {t("customer")}</div></div></div><div className="mt-3 text-xs px-3 py-1 rounded-full bg-plum border border-white/10 inline-flex">{t(title.toLowerCase()) !== title.toLowerCase() ? t(title.toLowerCase()) : title}</div></div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-auto">
          {NAV.map(n=>{
            const active = pathname===n.href;
            return <Link key={n.href} href={n.href} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition ${active?"bg-gold text-midnight font-semibold":"text-ivory/85 hover:bg-white/10 hover:text-ivory"}`}><n.icon className="h-4 w-4"/>{t(n.labelKey)}</Link>;
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex gap-2">
            <button onClick={()=> setTheme(resolved==="dark"?"light":"dark")} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/10 text-xs border border-white/10 hover:bg-white/15">{resolved==="dark"?<><Sun className="h-3 w-3"/> {t("light")}</>:<><Moon className="h-3 w-3"/> {t("dark")}</>}</button>
            <button onClick={()=> setLang(lang==="EN"?"HA":"EN")} className="flex-1 px-3 py-2 rounded-xl bg-gold text-midnight text-xs font-bold">{lang==="EN"?"EN | HA":"HA | EN"}</button>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs text-ivory/70 hover:text-ivory"><MapPin className="h-3 w-3"/> {t("exitToStorefront")}</Link>
        </div>
      </aside>
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-midnight text-ivory border-t border-white/10 px-2 py-2 flex overflow-x-auto gap-1">
        {NAV.slice(0,5).map(n=><Link key={n.href} href={n.href} className={`flex flex-col items-center px-3 py-1 rounded-xl text-[10px] ${pathname===n.href?"bg-gold text-midnight":"text-ivory/80"}`}><n.icon className="h-4 w-4"/>{t(n.labelKey).split(" ")[0]}</Link>)}
        <button onClick={()=>setOpen(!open)} className="px-3 py-1 rounded-xl bg-white/10 text-xs">☰</button>
      </div>
      {open && <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={()=>setOpen(false)}><div className="absolute left-0 top-0 bottom-0 w-[260px] bg-midnight text-ivory p-4 overflow-auto" onClick={e=>e.stopPropagation()}>
        <div className="font-display font-semibold mb-4">TWT • {t("customer")}</div>
        {NAV.map(n=><Link key={n.href} href={n.href} onClick={()=>setOpen(false)} className={`flex gap-2 px-3 py-2 rounded-xl text-sm ${pathname===n.href?"bg-gold text-midnight":"text-ivory/85"}`}><n.icon className="h-4 w-4"/>{t(n.labelKey)}</Link>)}
      </div></div>}
      <div className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        <header className="h-14 bg-white dark:bg-midnight dark:border-white/10 border-b border-midnight/10 flex items-center justify-between px-6">
          <div className="text-xs tracking-[0.16em] text-taupe font-semibold">{(t(title.toLowerCase()) !== title.toLowerCase() ? t(title.toLowerCase()) : title).toUpperCase()} {t("workspace")} • <span className="text-gold">{lang}</span> • {resolved}</div>
          <div className="flex gap-2">
            <button onClick={()=>setTheme(resolved==="dark"?"light":"dark")} className="h-8 w-8 grid place-items-center rounded-full bg-ivory border dark:bg-white/10" title={t(resolved==="dark"?"lightMode":"darkMode")}>{resolved==="dark"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}</button>
            <button onClick={()=>setLang(lang==="EN"?"HA":"EN")} className="h-8 px-3 rounded-full bg-midnight text-white text-xs flex items-center gap-1"><Globe className="h-3 w-3"/>{lang}</button>
          </div>
        </header>
        <main className="flex-1 p-6 bg-ivory dark:bg-midnight dark:text-ivory">{children}</main>
      </div>
    </div>
  );
}
