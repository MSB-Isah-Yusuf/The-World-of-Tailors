import type { Metadata } from "next";
import "./globals.css";

// Fonts loaded via CSS fallback to avoid Vercel next/font Google fetch failures
// Using system font stack + editorial web-safe fallback maintains luxury typography without blocking builds

export const metadata: Metadata = {
  title: "The World of Tailors (TWT) — Tailoring & Fabric Marketplace",
  description: "The World of Tailors (TWT) — Your Style. Your Fabric. Your Perfect Fit. Discover master tailors, bespoke designs & premium fabrics in one trusted marketplace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ivory text-charcoal antialiased">{children}</body>
    </html>
  );
}
