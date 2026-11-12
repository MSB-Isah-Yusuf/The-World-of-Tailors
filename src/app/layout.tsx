import type { Metadata } from "next";
import "./globals.css";

// Fonts loaded via CSS fallback to avoid Vercel next/font Google fetch failures
// Using system font stack + editorial web-safe fallback maintains luxury typography without blocking builds

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://twt.ng"),
  title: { default: "The World of Tailors (TWT) — Tailoring & Fabric Marketplace", template: "%s — The World of Tailors" },
  description: "The World of Tailors (TWT) — Your Style. Your Fabric. Your Perfect Fit. Discover verified tailors, bespoke designs & premium fabrics — Lagos-first, Paystack secure.",
  keywords: ["tailors Lagos", "bespoke Nigeria", "fabric marketplace", "agbada", "kaftan", "aso-oke", "ankara"],
  openGraph: { title: "The World of Tailors — TWT", description: "Verified tailors, designs & fabrics in one trusted marketplace", type: "website", locale: "en_NG" },
  twitter: { card: "summary_large_image", title: "The World of Tailors", description: "Lagos-first tailoring marketplace" },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
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
