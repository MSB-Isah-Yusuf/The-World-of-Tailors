import type { Metadata } from "next";
import "./globals.css";
import { Inter, Playfair_Display, Manrope } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-playfair" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "The World of Tailors (TWT) — Tailoring & Fabric Marketplace",
  description: "The World of Tailors (TWT) — Your Style. Your Fabric. Your Perfect Fit. Discover master tailors, bespoke designs & premium fabrics in one trusted marketplace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-ivory text-charcoal">{children}</body>
    </html>
  );
}
