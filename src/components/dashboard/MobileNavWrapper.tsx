"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";
import type { NavGroup } from "@/components/dashboard/PersistentShell";

function isActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

export function MobileNavWrapper({ role, groups }: { role: string; groups: NavGroup[] }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = React.useState(false);
  const mobileRef = React.useRef<HTMLDivElement>(null);

  // Preserve drawer scroll
  React.useEffect(() => {
    const key = `twt-mobile-${role.toLowerCase()}`;
    try { const saved = sessionStorage.getItem(key); if (saved && mobileRef.current) mobileRef.current.scrollTop = parseInt(saved,10); } catch {}
    const el = mobileRef.current;
    if (!el) return;
    const onScroll = () => { try { sessionStorage.setItem(key, String(el.scrollTop)); } catch {} };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [role, open]);

  React.useEffect(() => { if (open) document.body.style.overflow = "hidden"; else document.body.style.overflow = ""; return ()=> { document.body.style.overflow=""; }; }, [open]);
  React.useEffect(()=> { setOpen(false); }, [pathname]);

  // Bottom bar (always visible on mobile)
  return (
    <>
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-midnight text-ivory border-t border-white/10 px-2 py-2 z-30 safe-pb">
        <div className="flex overflow-x-auto gap-1 scrollbar-none">
          {groups.flatMap(g=> g.children).slice(0,5).map(item => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} scroll={false} className={`flex flex-col items-center justify-center px-3 py-2 rounded-xl text-[10px] font-medium min-w-[64px] shrink-0 transition ${active ? "bg-gold text-midnight" : "text-ivory/80 hover:bg-white/10"}`}>
                <item.icon className="h-5 w-5 mb-1" /><span className="truncate max-w-[64px]">{t(item.labelKey).split(" ")[0]}</span>
              </Link>
            );
          })}
          <button onClick={()=> setOpen(true)} className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-white/10 text-ivory text-xs font-medium shrink-0">☰ Menu</button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=> setOpen(false)} />
          <div className="relative w-[300px] max-w-[85vw] bg-midnight text-ivory h-screen flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 pt-6 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white/10 border border-gold/30 grid place-items-center text-gold text-xs font-bold">TWT</div>
                  <div><div className="font-display text-sm font-semibold">TWT</div><div className="text-[10px] tracking-[0.14em] text-gold">TWT • {role}</div></div>
                </div>
                <button onClick={()=> setOpen(false)} className="h-8 w-8 grid place-items-center rounded-full bg-white/10 text-ivory">✕</button>
              </div>
            </div>
            <div ref={mobileRef} className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-3">
              {groups.map(group => {
                const hasActive = group.children.some(c=> isActive(pathname, c.href));
                // For mobile, default to expanded if has active, otherwise collapsed but remember last
                return (
                  <MobileGroup key={group.id} group={group} hasActive={hasActive} />
                );
              })}
            </div>
            <div className="p-4 border-t border-white/10 shrink-0">
              <Link href="/" onClick={()=> setOpen(false)} className="flex items-center gap-2 text-xs text-ivory/70">← {t("exitToStorefront")}</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileGroup({ group, hasActive }: { group: NavGroup; hasActive: boolean }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [expanded, setExpanded] = React.useState(hasActive);
  React.useEffect(()=> { if (hasActive) setExpanded(true); }, [hasActive]);
  return (
    <div className="space-y-1">
      <button onClick={()=> setExpanded(v=>!v)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${hasActive ? "bg-white/10 text-gold" : "text-ivory/60"}`}>
        <span className="flex items-center gap-2">{group.icon && <group.icon className="h-3.5 w-3.5" />}{t(group.labelKey)}</span>
        <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>⌄</span>
      </button>
      {expanded && (
        <div className="space-y-1 pl-2">
          {group.children.map(item => {
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} scroll={false} className={`flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm ${active ? "bg-gold text-midnight font-semibold" : "text-ivory/85 hover:bg-white/10"}`}>
                <item.icon className="h-4 w-4" />{t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
