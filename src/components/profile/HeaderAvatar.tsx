"use client";
import * as React from "react";
import { UserAvatar } from "@/components/ui/avatar";
import Link from "next/link";
import { LogOut } from "lucide-react";

type SessionUser = { name?: string | null; email?: string | null; image?: string | null; role?: string };

export function HeaderAvatar({ size = "md", showLogout = true, dropdown = true }: { size?: "sm" | "md" | "lg"; showLogout?: boolean; dropdown?: boolean }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  const fetchUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/profile/avatar", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setUser(j.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUser();
    const onAvatar = (e: any) => {
      setUser((prev) => (prev ? { ...prev, image: e.detail } : prev));
      // refetch to be safe
      setTimeout(fetchUser, 300);
    };
    const onStorage = () => fetchUser();
    window.addEventListener("twt-avatar-updated", onAvatar as any);
    window.addEventListener("storage", onStorage);
    // Also refetch on visibility
    document.addEventListener("visibilitychange", fetchUser);
    return () => {
      window.removeEventListener("twt-avatar-updated", onAvatar as any);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", fetchUser);
    };
  }, [fetchUser]);

  if (loading) {
    return <div className="h-9 w-9 rounded-full bg-ivory dark:bg-[#303030] border dark:border-[#3A3936] animate-pulse" />;
  }

  if (!user) return null;

  const roleHome: Record<string, string> = { CUSTOMER: "/dashboard/customer", TAILOR: "/dashboard/tailor", FABRIC_SELLER: "/dashboard/seller", ADMIN: "/admin" };
  const dashboardLink = roleHome[user.role || ""] || "/dashboard/customer";

  const handleLogout = async () => {
    if (!confirm("Log out of World of Tailors? You will be redirected to the homepage.")) return;
    try {
      // Use NextAuth signOut endpoint
      await fetch("/api/auth/signout", { method: "POST" });
      // Clear client caches
      try {
        localStorage.removeItem("twt-avatar-cache");
        sessionStorage.clear();
      } catch {}
      // Redirect to home with logout confirmation
      window.location.href = "/?loggedOut=1";
    } catch {
      window.location.href = "/api/auth/signout";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => (dropdown ? setOpen(!open) : (window.location.href = dashboardLink))}
        className="flex items-center gap-2 rounded-full border bg-white dark:bg-[#292929] dark:border-[#3A3936] px-1.5 py-1 pr-3 hover:bg-ivory dark:hover:bg-[#303030] transition"
        aria-label="Account menu"
      >
        <UserAvatar name={user.name} image={user.image} size={size} />
        <span className="hidden sm:block text-xs font-medium max-w-[120px] truncate">{user.name?.split(" ")[0] || "Account"}</span>
      </button>
      {open && dropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border bg-white dark:bg-[#292929] dark:border-[#3A3936] shadow-premium p-2 z-50">
            <div className="px-3 py-3 flex gap-3 border-b dark:border-[#3A3936] mb-2">
              <UserAvatar name={user.name} image={user.image} size="md" />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground dark:text-[#B8B5AE] truncate">{user.email}</div>
                <div className="text-[11px] px-2 py-0.5 rounded-full bg-ivory dark:bg-[#303030] dark:border dark:border-[#3A3936] inline-block mt-1">{user.role}</div>
              </div>
            </div>
            <Link
              href={dashboardLink}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm hover:bg-ivory dark:hover:bg-[#303030] dark:text-[#F5F3EF]"
              onClick={() => setOpen(false)}
            >
              Dashboard
            </Link>
            <Link href="/dashboard/customer/account" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm hover:bg-ivory dark:hover:bg-[#303030] dark:text-[#F5F3EF]" onClick={() => setOpen(false)}>
              Profile Settings
            </Link>
            {showLogout && (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-burgundy hover:bg-burgundy/10 dark:hover:bg-burgundy/20 mt-1"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardHeaderAvatar() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  React.useEffect(() => {
    fetch("/api/profile/avatar", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setUser(j?.user || null))
      .catch(() => null);
    const onAvatar = (e: any) => setUser((prev) => (prev ? { ...prev, image: e.detail } : prev));
    window.addEventListener("twt-avatar-updated", onAvatar as any);
    return () => window.removeEventListener("twt-avatar-updated", onAvatar as any);
  }, []);
  if (!user) return <div className="hidden sm:flex h-9 w-9 rounded-full bg-plum text-white dark:bg-[#C6A15B] dark:text-[#191919] grid place-items-center text-xs font-bold">U</div>;
  return <UserAvatar name={user.name} image={user.image} size="md" />;
}
