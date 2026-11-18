"use client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({
  variant = "ghost",
  size = "sm",
  className,
  showIcon = true,
  label = "Log out",
  redirectTo = "/",
}: {
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
  label?: string;
  redirectTo?: string;
}) {
  const handleLogout = async () => {
    if (!confirm("Log out? Your session will be invalidated and you will be redirected.")) return;
    try {
      await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    } catch {}
    try {
      sessionStorage.clear();
      localStorage.removeItem("twt-avatar-cache");
    } catch {}
    window.location.href = redirectTo + "?loggedOut=1";
  };

  return (
    <Button variant={variant as any} size={size as any} className={className} onClick={handleLogout}>
      {showIcon && <LogOut className="h-4 w-4 mr-1.5" />}
      {label}
    </Button>
  );
}

export function LogoutMenuItem({ onAfter }: { onAfter?: () => void }) {
  const handle = async () => {
    if (!confirm("Log out of World of Tailors?")) return;
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {}
    try {
      sessionStorage.clear();
    } catch {}
    window.location.href = "/?loggedOut=1";
    onAfter?.();
  };
  return (
    <button onClick={handle} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-burgundy hover:bg-burgundy/10 dark:hover:bg-burgundy/20">
      <LogOut className="h-4 w-4" /> Log out
    </button>
  );
}
