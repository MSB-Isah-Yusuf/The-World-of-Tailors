"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useLanguage } from "@/lib/i18n";
import { useThemeToggle } from "@/lib/theme";
import {
  LayoutDashboard, ClipboardList, Users, Ruler, FileStack, Palette, Factory,
  CheckCircle2, CalendarDays, MessageCircle, Star, Wallet, Building2, MapPin,
  Settings, Sun, Moon, Globe, ShieldCheck, PackageCheck, Bell, ShoppingBag,
  Store, Search, FileText, ShoppingCart, Heart, Truck, Lock, Package, Boxes,
  Tag, History, BarChart3, FileText as FileIcon, PlusCircle, UserCheck,
  ClipboardCheck, Shield, Palette as PaletteIcon, Package as PackageIcon,
  ShoppingCart as CartIcon, Wallet as WalletIcon, Truck as TruckIcon, Flag, BarChart3 as AnalyticsIcon,
  ChevronDown, LogOut, Sparkles
} from "lucide-react";

// Types
export type NavItem = { href: string; labelKey: string; icon: React.ComponentType<any>; badge?: string };
export type NavGroup = { id: string; labelKey: string; icon?: React.ComponentType<any>; children: NavItem[]; defaultExpanded?: boolean };

type Props = {
  role: "CUSTOMER" | "TAILOR" | "SELLER" | "ADMIN";
  groups: NavGroup[];
  children: React.ReactNode;
};

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  // Handle nested like /admin/bookings? but query not in pathname, so fine
  return false;
}

function getActiveLabel(groups: NavGroup[], pathname: string, t: (k:string)=>string) {
  for (const g of groups) {
    for (const item of g.children) {
      if (isActive(pathname, item.href)) return t(item.labelKey);
    }
    if (isActive(pathname, `/dashboard/${g.id}`)) return t(g.labelKey); // fallback
  }
  // Fallback for root dashboard pages like /dashboard/customer
  const seg = pathname.split("/").filter(Boolean).pop();
  if (seg) return t(seg) !== seg ? t(seg) : seg.replace(/-/g, " ");
  return "Overview";
}

export function PersistentShell({ role, groups, children }: Props) {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { resolved, setTheme, theme } = useThemeToggle();
  const [open, setOpen] = React.useState(false); // mobile drawer
  // Sidebar scroll preservation
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const mobileRef = React.useRef<HTMLDivElement>(null);
  const mainRef = React.useRef<HTMLElement>(null);
  // Expanded groups — persisted in sessionStorage
  const storageKey = `twt-expanded-${role.toLowerCase()}`;
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    // Default: expand group containing active item, plus first group
    const initial: Record<string, boolean> = {};
    let activeGroup: string | null = null;
    for (const g of groups) {
      for (const c of g.children) {
        if (isActive(pathname, c.href)) { activeGroup = g.id; break; }
      }
      if (activeGroup === g.id) break;
    }
    for (const g of groups) {
      initial[g.id] = g.defaultExpanded ?? g.id === activeGroup;
    }
    if (activeGroup) initial[activeGroup] = true;
    return initial;
  });

  // Restore sidebar scroll on mount and after navigation (layout stays mounted, so scroll naturally preserved, but we save/restore for refresh)
  React.useEffect(() => {
    const sidebarKey = `twt-sidebar-${role.toLowerCase()}`;
    const mobileKey = `twt-mobile-${role.toLowerCase()}`;
    // Restore sidebar
    try {
      const saved = sessionStorage.getItem(sidebarKey);
      if (saved && sidebarRef.current) sidebarRef.current.scrollTop = parseInt(saved, 10);
      const mSaved = sessionStorage.getItem(mobileKey);
      if (mSaved && mobileRef.current) mobileRef.current.scrollTop = parseInt(mSaved, 10);
    } catch {}
    const sidebar = sidebarRef.current;
    const mobile = mobileRef.current;
    const onSidebarScroll = () => {
      try { if (sidebar) sessionStorage.setItem(sidebarKey, String(sidebar.scrollTop)); } catch {}
    };
    const onMobileScroll = () => {
      try { if (mobile) sessionStorage.setItem(mobileKey, String(mobile.scrollTop)); } catch {}
    };
    sidebar?.addEventListener("scroll", onSidebarScroll, { passive: true });
    mobile?.addEventListener("scroll", onMobileScroll, { passive: true });
    return () => {
      sidebar?.removeEventListener("scroll", onSidebarScroll);
      mobile?.removeEventListener("scroll", onMobileScroll);
    };
  }, [role]);

  // Persist expanded
  React.useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(expanded)); } catch {}
  }, [expanded, storageKey]);

  // Auto-expand group of active item without collapsing others
  React.useEffect(() => {
    for (const g of groups) {
      for (const c of g.children) {
        if (isActive(pathname, c.href) && !expanded[g.id]) {
          setExpanded(prev => ({ ...prev, [g.id]: true }));
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Main content scroll management — separate from sidebar
  const prevPath = React.useRef(pathname);
  React.useEffect(() => {
    if (prevPath.current !== pathname && mainRef.current) {
      // Intentional: new section goes to top of main content, sidebar untouched
      // Use instant to avoid jarring animation; don't touch window scroll
      mainRef.current.scrollTo({ top: 0, behavior: "instant" as any });
      prevPath.current = pathname;
    }
  }, [pathname]);

  // Close mobile drawer on navigation
  React.useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const activeLabel = getActiveLabel(groups, pathname, t);

  const roleBadge: Record<string, string> = {
    CUSTOMER: "bg-midnight",
    TAILOR: "bg-plum",
    SELLER: "bg-emeraldDeep",
    ADMIN: "bg-burgundy",
  };

  return (
    <div className="h-screen overflow-hidden bg-ivory dark:bg-midnight flex">
      {/* Desktop Sidebar — fixed width, independent scroll */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-midnight text-ivory h-screen overflow-hidden border-r border-white/10">
        <div className="px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 border border-gold/30 grid place-items-center text-gold text-xs font-bold shrink-0">TWT</div>
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold leading-none truncate">The World of Tailors</div>
              <div className="text-[10px] tracking-[0.14em] text-gold truncate">TWT • {t(role.toLowerCase()) === role.toLowerCase() ? role : t(role.toLowerCase())}</div>
            </div>
          </div>
          <div className={`mt-4 rounded-full ${roleBadge[role] || "bg-midnight"} text-white text-xs px-3 py-1.5 inline-flex items-center gap-1.5 border border-white/10 max-w-full truncate`}>
            <LayoutDashboard className="h-3 w-3 shrink-0" /> <span className="truncate">{activeLabel}</span>
          </div>
        </div>

        {/* Sidebar scroll container — independent */}
        <div ref={sidebarRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
          {groups.map(group => {
            const isExpanded = expanded[group.id] ?? false;
            const hasActiveChild = group.children.some(c => isActive(pathname, c.href));
            return (
              <div key={group.id} className="space-y-1">
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition ${hasActiveChild ? "bg-white/10 text-gold" : "text-ivory/60 hover:bg-white/10 hover:text-ivory"}`}
                  aria-expanded={isExpanded}
                >
                  <span className="flex items-center gap-2 truncate">
                    {group.icon && <group.icon className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">{t(group.labelKey)}</span>
                  </span>
                  <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="space-y-1 pl-1">
                    {group.children.map(item => {
                      const active = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          scroll={false}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm leading-none transition min-h-[40px] ${active ? "bg-gold text-midnight font-semibold shadow-[0_0_12px_rgba(198,161,91,0.25)]" : "text-ivory/85 hover:bg-white/10 hover:text-ivory"}`}
                          aria-current={active ? "page" : undefined}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate flex-1 text-left">{t(item.labelKey)}</span>
                          {active && <span className="h-2 w-2 rounded-full bg-midnight/30 shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10 space-y-3 shrink-0 bg-midnight">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-xs font-semibold text-gold flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Atelier Verified</div>
            <div className="text-[11px] text-ivory/60 leading-snug mt-1">Least-privilege RBAC • Ownership-scoped • Audit logged</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTheme(resolved === "dark" ? "light" : "dark")} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 text-xs border border-white/10 hover:bg-white/15 transition min-h-[36px]">
              {resolved === "dark" ? <><Sun className="h-3.5 w-3.5" /> {t("light")}</> : <><Moon className="h-3.5 w-3.5" /> {t("dark")}</>}
            </button>
            <button onClick={() => setLang(lang === "EN" ? "HA" : "EN")} className="flex-1 px-3 py-2.5 rounded-xl bg-gold text-midnight text-xs font-bold hover:bg-[#d2b06f] transition min-h-[36px]">
              {lang === "EN" ? "EN | HA" : "HA | EN"}
            </button>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs text-ivory/70 hover:text-ivory transition">
            <LogOut className="h-3 w-3" /> {t("exitToStorefront")}
          </Link>
        </div>
      </aside>

      {/* Main column — independent scroll */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="h-14 shrink-0 bg-white dark:bg-midnight dark:border-white/10 border-b border-midnight/10 flex items-center justify-between px-4 sm:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setOpen(true)} className="lg:hidden h-9 w-9 grid place-items-center rounded-xl bg-ivory dark:bg-white/10 border dark:border-white/10 shrink-0">
              <span className="text-sm">☰</span>
            </button>
            <div className="min-w-0 hidden sm:block">
              <div className="text-xs tracking-[0.16em] text-taupe dark:text-ivory/60 font-semibold truncate">{activeLabel.toUpperCase()} {t("workspace")} • <span className="text-gold">{lang}</span></div>
              <div className="text-[11px] text-taupe/80 dark:text-ivory/40 hidden lg:block truncate">{role} • Secure • Paystack</div>
            </div>
            <div className="sm:hidden text-xs font-semibold text-midnight dark:text-ivory truncate">{activeLabel}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setTheme(resolved === "dark" ? "light" : "dark")} className="h-9 w-9 grid place-items-center rounded-full bg-ivory dark:bg-white/10 border dark:border-white/10 dark:text-ivory hover:shadow-soft transition" aria-label="Toggle theme" title={t(resolved === "dark" ? "lightMode" : "darkMode")}>
              {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => setLang(lang === "EN" ? "HA" : "EN")} className="h-9 px-3 rounded-full bg-midnight dark:bg-white/10 text-white dark:text-ivory text-xs font-medium flex items-center gap-1.5 border border-transparent dark:border-white/10 hover:opacity-90 transition">
              <Globe className="h-3.5 w-3.5" />{lang}
            </button>
            <div className="hidden sm:flex h-9 w-9 rounded-full bg-plum text-white grid place-items-center text-xs font-bold">U</div>
          </div>
        </header>

        <main
          ref={mainRef as any}
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4 sm:p-6 bg-ivory dark:bg-midnight"
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav — visible on small screens */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-midnight text-ivory border-t border-white/10 px-2 py-2 z-30">
        <div className="flex overflow-x-auto gap-1 scrollbar-none">
          {groups.flatMap(g => g.children).slice(0, 5).map(item => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} scroll={false} className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl text-[10px] font-medium min-w-[64px] shrink-0 transition ${active ? "bg-gold text-midnight" : "text-ivory/80 hover:bg-white/10"}`}>
                <item.icon className="h-5 w-5 mb-1" />
                <span className="truncate max-w-[64px]">{t(item.labelKey).split(" ")[0]}</span>
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-white/10 text-ivory text-xs font-medium shrink-0">
            <span className="text-sm">☰</span> Menu
          </button>
        </div>
      </div>

      {/* Mobile drawer — slide-out, preserves scroll */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-[300px] max-w-[85vw] bg-midnight text-ivory h-screen flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 pt-6 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white/10 border border-gold/30 grid place-items-center text-gold text-xs font-bold">TWT</div>
                  <div>
                    <div className="font-display text-sm font-semibold">The World of Tailors</div>
                    <div className="text-[10px] tracking-[0.14em] text-gold">TWT • {t(role.toLowerCase())}</div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="h-8 w-8 grid place-items-center rounded-full bg-white/10 text-ivory">✕</button>
              </div>
              <div className="mt-3 text-xs px-3 py-1.5 rounded-full bg-plum border border-white/10 inline-flex">{activeLabel}</div>
            </div>
            <div ref={mobileRef} className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-3">
              {groups.map(group => {
                const isExpanded = expanded[group.id] ?? false;
                const hasActive = group.children.some(c => isActive(pathname, c.href));
                return (
                  <div key={group.id} className="space-y-1">
                    <button onClick={() => setExpanded(prev => ({ ...prev, [group.id]: !prev[group.id] }))} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${hasActive ? "bg-white/10 text-gold" : "text-ivory/60"}`}>
                      <span className="flex items-center gap-2">{group.icon && <group.icon className="h-3.5 w-3.5" />}{t(group.labelKey)}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                    {isExpanded && (
                      <div className="space-y-1 pl-2">
                        {group.children.map(item => {
                          const active = isActive(pathname, item.href);
                          return (
                            <Link key={item.href} href={item.href} scroll={false} onClick={() => setOpen(false)} className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm ${active ? "bg-gold text-midnight font-semibold" : "text-ivory/85 hover:bg-white/10"}`}>
                              <item.icon className="h-4 w-4" />{t(item.labelKey)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
              <div className="flex gap-2">
                <button onClick={() => setTheme(resolved === "dark" ? "light" : "dark")} className="flex-1 px-3 py-2.5 rounded-xl bg-white/10 text-xs font-medium">{resolved === "dark" ? t("light") : t("dark")}</button>
                <button onClick={() => setLang(lang === "EN" ? "HA" : "EN")} className="flex-1 px-3 py-2.5 rounded-xl bg-gold text-midnight text-xs font-bold">{lang === "EN" ? "EN → HA" : "HA → EN"}</button>
              </div>
              <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 text-xs text-ivory/70"><LogOut className="h-3 w-3" />{t("exitToStorefront")}</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
