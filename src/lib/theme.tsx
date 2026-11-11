"use client";
import * as React from "react";

type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "twt-theme";

export function useThemeToggle() {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as Theme) || "system";
  });
  const [resolved, setResolved] = React.useState<"light"|"dark">("light");

  React.useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    setResolved(next);
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
    // persist to UserPreference if logged in (fire-and-forget)
    fetch("/api/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme: theme.toUpperCase() }) }).catch(()=>{});
  }, [theme]);

  // avoid flash — set initial class synchronously on mount
  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const init = saved || "system";
    const next = init === "system" ? (systemDark ? "dark" : "light") : init;
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  return { theme, setTheme: setThemeState, resolved };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
