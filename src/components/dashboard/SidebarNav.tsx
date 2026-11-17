"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { useLanguage } from "@/lib/i18n";
import { useThemeToggle } from "@/lib/theme";
import { LayoutDashboard, ChevronDown, Sparkles, Sun, Moon, LogOut } from "lucide-react";
import type { NavGroup } from "@/components/dashboard/PersistentShell";

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

export function SidebarNav({ role, groups }: { role: "CUSTOMER"|"TAILOR"|"SELLER"|"ADMIN"; groups: NavGroup[] }) {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const { resolved, setTheme } = useThemeToggle();
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const storageKey = `twt-expanded-${role.toLowerCase()}`;
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { const raw = sessionStorage.getItem(storageKey); if (raw) return JSON.parse(raw); } catch {}
    const init: Record<string, boolean> = {};
    let activeGroup: string | null = null;
    for (const g of groups) {
      for (const c of g.children) if (isActive(pathname, c.href)) { activeGroup = g.id; break; }
      if (activeGroup) break;
    }
    for (const g of groups) init[g.id] = g.defaultExpanded ?? g.id === activeGroup;
    if (activeGroup) init[activeGroup] = true;
    return init;
  });

  React.useEffect(() => {
    const key = `twt-sidebar-${role.toLowerCase()}`;
    try { const saved = sessionStorage.getItem(key); if (saved && sidebarRef.current) sidebarRef.current.scrollTop = parseInt(saved,10); } catch {}
    const el = sidebarRef.current;
    if (!el) return;
    const onScroll = () => { try { sessionStorage.setItem(key, String(el.scrollTop)); } catch {} };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [role]);

  React.useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(expanded)); } catch {} }, [expanded, storageKey]);
  React.useEffect(() => {
    for (const g of groups) for (const c of g.children) if (isActive(pathname, c.href) && !expanded[g.id]) { setExpanded(p=>({...p, [g.id]: true})); break; }
  }, [pathname]);

  const roleBadge: Record<string,string> = { CUSTOMER: "bg-midnight", TAILOR: "bg-plum", SELLER: "bg-emeraldDeep", ADMIN: "bg-burgundy" };
  const activeLabel = (() => {
    for (const g of groups) for (const c of g.children) if (isActive(pathname, c.href)) return t(c.labelKey);
    return t("overview");
  })();

  return (
    <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-midnight text-ivory h-screen overflow-hidden border-r border-white/10">
      <div className="px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 border border-gold/30 grid place-items-center text-gold text-xs font-bold">TWT</div>
          <div className="min-w-0">
            <div className="font-display text-sm font-semibold leading-none truncate">The World of Tailors</div>
            <div className="text-[10px] tracking-[0.14em] text-gold truncate">TWT • {t(role.toLowerCase()) === role.toLowerCase() ? role : t(role.toLowerCase())}</div>
          </div>
        </div>
        <div className={`mt-4 rounded-full ${roleBadge[role]||"bg-midnight"} text-white text-xs px-3 py-1.5 inline-flex items-center gap-1.5 border border-white/10 max-w-full truncate`}>
          <LayoutDashboard className="h-3 w-3 shrink-0" /> <span className="truncate">{activeLabel}</span>
        </div>
      </div>
      <div ref={sidebarRef} className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
        {groups.map(group => {
          const isExpanded = expanded[group.id] ?? false;
          const hasActiveChild = group.children.some(c => isActive(pathname, c.href));
          return (
            <div key={group.id} className="space-y-1">
              <button onClick={()=> setExpanded(prev=>({...prev, [group.id]: !prev[group.id]}))} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition ${hasActiveChild ? "bg-white/10 text-gold" : "text-ivory/60 hover:bg-white/10 hover:text-ivory"}`} aria-expanded={isExpanded}>
                <span className="flex items-center gap-2 truncate">{group.icon && <group.icon className="h-3.5 w-3.5 shrink-0" />}<span className="truncate">{t(group.labelKey)}</span></span>
                <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </button>
              {isExpanded && (
                <div className="space-y-1 pl-1">
                  {group.children.map(item => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link key={item.href} href={item.href} scroll={false} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm leading-none transition min-h-[40px] ${active ? "bg-gold text-midnight font-semibold shadow-[0_0_12px_rgba(198,161,91,0.25)]" : "text-ivory/85 hover:bg-white/10 hover:text-ivory"}`} aria-current={active ? "page" : undefined}>
                        <item.icon className="h-4 w-4 shrink-0" /><span className="truncate flex-1 text-left">{t(item.labelKey)}</span>{active && <span className="h-2 w-2 rounded-full bg-midnight/30 shrink-0" />}
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
        <div className="rounded-xl bg-white/5 border border-white/10 p-3"><div className="text-xs font-semibold text-gold flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Atelier Verified</div><div className="text-[11px] text-ivory/60 leading-snug mt-1">Least-privilege RBAC • Ownership-scoped • Audit logged</div></div>
        <div className="flex gap-2">
          <button onClick={()=> setTheme(resolved==="dark"?"light":"dark")} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 text-xs border border-white/10 hover:bg-white/15 transition min-h-[36px]">{resolved==="dark" ? <><Sun className="h-3.5 w-3.5" /> {t("light")}</> : <><Moon className="h-3.5 w-3.5" /> {t("dark")}</>}</button>
          <button onClick={()=> setLang(lang==="EN"?"HA":"EN")} className="flex-1 px-3 py-2.5 rounded-xl bg-gold text-midnight text-xs font-bold hover:bg-[#d2b06f] transition min-h-[36px]">{lang==="EN"?"EN | HA":"HA | EN"}</button>
        </div>
        <Link href="/" className="flex items-center gap-2 text-xs text-ivory/70 hover:text-ivory transition"><LogOut className="h-3 w-3" /> {t("exitToStorefront")}</Link>
      </div>
    </aside>
  );
}
