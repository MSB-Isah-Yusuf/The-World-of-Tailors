import type { Metadata } from "next";
import "./globals.css";

// Fonts loaded via CSS fallback to avoid Vercel next/font Google fetch failures
// Using system font stack + editorial web-safe fallback maintains luxury typography without blocking builds

export const metadata: Metadata = {
  title: "The World of Tailors (TWT) — Tailoring & Fabric Marketplace",
  description: "The World of Tailors (TWT) — Your Style. Your Fabric. Your Perfect Fit. Discover master tailors, bespoke designs & premium fabrics in one trusted marketplace.",
};

function ThemeScript(){
  const js = `try{const k='twt-theme';const s=localStorage.getItem(k);const m=window.matchMedia('(prefers-color-scheme: dark)').matches;const t=s||'system';const d=t==='system'?m:t==='dark';document.documentElement.classList.toggle('dark',d)}catch(e){}`;
  return <script dangerouslySetInnerHTML={{__html:js}} />;
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><ThemeScript /></head>
      <body className="min-h-screen bg-ivory text-charcoal antialiased dark:bg-midnight dark:text-ivory">{children}</body>
    </html>
  );
}
