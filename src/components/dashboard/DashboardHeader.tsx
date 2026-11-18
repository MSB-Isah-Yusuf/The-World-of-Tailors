"use client";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useLanguage } from "@/lib/i18n";
import { useThemeToggle } from "@/lib/theme";
import { Sun, Moon, Globe } from "lucide-react";
import { DashboardHeaderAvatar } from "@/components/profile/HeaderAvatar";
import type { NavGroup } from "@/components/dashboard/PersistentShell";

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

export function DashboardHeader({ groups, onMenuOpen }: { groups: NavGroup[]; onMenuOpen?: () => void }) {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { resolved, setTheme } = useThemeToggle();
  const activeLabel = React.useMemo(() => {
    for (const g of groups) for (const c of g.children) if (isActive(pathname, c.href)) return t(c.labelKey);
    return t("overview");
  }, [pathname, groups, t]);

  return (
    <header className="h-14 shrink-0 bg-white dark:bg-midnight dark:border-white/10 border-b border-midnight/10 flex items-center justify-between px-4 sm:px-6 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuOpen && <button onClick={onMenuOpen} className="lg:hidden h-9 w-9 grid place-items-center rounded-xl bg-ivory dark:bg-white/10 border dark:border-white/10 shrink-0">☰</button>}
        <div className="min-w-0 hidden sm:block">
          <div className="text-xs tracking-[0.16em] text-taupe dark:text-ivory/60 font-semibold truncate">{activeLabel.toUpperCase()} {t("workspace")} • <span className="text-gold">{lang}</span></div>
          <div className="text-[11px] text-taupe/80 dark:text-ivory/40 hidden lg:block truncate">Secure • Paystack</div>
        </div>
        <div className="sm:hidden text-xs font-semibold text-midnight dark:text-ivory truncate">{activeLabel}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={()=> setTheme(resolved==="dark"?"light":"dark")} className="h-9 w-9 grid place-items-center rounded-full bg-ivory dark:bg-white/10 border dark:border-white/10 dark:text-ivory hover:shadow-soft transition" aria-label="Toggle theme" title={t(resolved==="dark"?"lightMode":"darkMode")}>
          {resolved==="dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button onClick={()=> setLang(lang==="EN"?"HA":"EN")} className="h-9 px-3 rounded-full bg-midnight dark:bg-white/10 text-white dark:text-ivory text-xs font-medium flex items-center gap-1.5 border border-transparent dark:border-white/10 hover:opacity-90 transition">
          <Globe className="h-3.5 w-3.5" />{lang}
        </button>
        <div className="hidden sm:flex">
          <DashboardHeaderAvatar />
        </div>
      </div>
    </header>
  );
}
