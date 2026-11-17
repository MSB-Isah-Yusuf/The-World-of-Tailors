"use client";
import Link from "next/link";
import { Button } from "./ui/button";
import { Search, Heart, Menu, ChevronDown, Globe } from "lucide-react";
import { useState } from "react";
import { CartBadge } from "./cart/CartBadge";
import { NotificationBell } from "./notifications/NotificationBell";
import { useLanguage } from "@/lib/i18n";
import { useThemeToggle } from "@/lib/theme";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const { resolved, setTheme } = useThemeToggle();
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-midnight text-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-7 flex items-center justify-between text-[11px] tracking-widest">
          <span className="opacity-80">{t("worldwideShipping")}</span>
          <span className="hidden sm:flex gap-4 opacity-80"> <Link href="/tailors" className="hover:text-gold">{t("trustSafety")}</Link> • <Link href="/fabrics" className="hover:text-gold">{t("helpCentre")}</Link> <button onClick={()=> setLang(lang==="EN"?"HA":"EN")} className="flex items-center gap-1 hover:text-gold"><Globe className="h-3 w-3"/>{lang}</button> <button onClick={()=> setTheme(resolved==="dark"?"light":"dark")} className="hover:text-gold">{resolved==="dark"?t("light"):t("dark")}</button></span>
        </div>
      </div>
      <div className="glass border-b border-white/40 dark:bg-midnight/90 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-navy-plum flex items-center justify-center text-ivory font-display font-bold text-xs tracking-widest border border-gold/20 shadow-soft">TWT</div>
              <div>
                <div className="font-display text-[19px] font-semibold leading-none text-midnight dark:text-ivory">The World of Tailors</div>
                <div className="text-[10px] tracking-[0.18em] text-taupe font-medium">TWT • EST. LAGOS</div>
              </div>
              <span className="hidden lg:inline ml-2 h-6 w-px bg-midnight/10 dark:bg-white/10" />
              <span className="hidden lg:inline text-xs tracking-widest text-burgundy font-semibold">ATELIER & MARKET</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-2 font-medium text-midnight dark:text-ivory">{t("home")}</Link>
              <Link href="/tailors" className="px-3 py-2 font-medium hover:text-plum dark:text-ivory/80 flex gap-1 items-center">{t("findTailors")} <ChevronDown className="h-3 w-3" /></Link>
              <Link href="/designs" className="px-3 py-2 font-medium hover:text-plum dark:text-ivory/80">{t("designs")}</Link>
              <Link href="/fabrics" className="px-3 py-2 font-medium hover:text-plum dark:text-ivory/80">{t("fabrics")}</Link>
              <Link href="/#how-it-works" className="px-3 py-2 font-medium hover:text-plum dark:text-ivory/80">{t("howItWorks")}</Link>
              <Link href="/register" className="px-3 py-2 font-medium hover:text-plum dark:text-ivory/80">{t("becomePartner")}</Link>
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={()=>setSearchOpen(!searchOpen)} className="h-9 w-9 grid place-items-center rounded-full border bg-white dark:bg-white/[0.06] dark:border-white/10 hover:shadow-soft" aria-label="Search"><Search className="h-4 w-4 text-midnight dark:text-ivory" /></button>
              <Link href="/dashboard/customer/favorites" className="hidden sm:grid h-9 w-9 place-items-center rounded-full border bg-white dark:bg-white/[0.06] dark:border-white/10" aria-label="Favorites"><Heart className="h-4 w-4 text-midnight dark:text-ivory" /></Link>
              <CartBadge />
              <NotificationBell />
              <Link href="/login" className="hidden sm:inline-flex"><Button variant="ghost" size="sm">{t("signIn")}</Button></Link>
              <Link href="/register" className="hidden sm:inline-flex"><Button variant="primary" size="sm">{t("getStarted")}</Button></Link>
              <button onClick={()=>setOpen(!open)} className="lg:hidden h-9 w-9 grid place-items-center rounded-full border bg-white dark:bg-white/[0.06] dark:text-ivory"><Menu className="h-4 w-4" /></button>
            </div>
          </div>
          {searchOpen && (
            <div className="pb-4">
              <div className="glass rounded-2xl p-3 flex gap-2 border border-plum/10 dark:bg-midnight dark:border-white/10">
                <input placeholder={t("searchPlaceholder")} className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-taupe dark:text-ivory dark:placeholder:text-ivory/50" autoFocus />
                <Button size="sm" variant="primary">{t("search")}</Button>
              </div>
            </div>
          )}
          {open && (
            <div className="lg:hidden pb-4 space-y-1 text-sm dark:text-ivory">
              <Link href="/tailors" className="block py-2">{t("findTailors")}</Link>
              <Link href="/designs" className="block py-2">{t("designs")}</Link>
              <Link href="/fabrics" className="block py-2">{t("fabrics")}</Link>
              <div className="flex gap-2 pt-2"><button onClick={()=> setLang(lang==="EN"?"HA":"EN")} className="px-3 py-1 rounded-full bg-gold text-midnight text-xs font-bold">{lang} → {lang==="EN"?"HA":"EN"}</button><button onClick={()=> setTheme(resolved==="dark"?"light":"dark")} className="px-3 py-1 rounded-full border dark:border-white/15 text-xs">{resolved==="dark"?t("light"):t("dark")}</button></div>
              <Link href="/login" className="block py-2 font-medium">{t("signIn")} • {t("getStarted")}</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
