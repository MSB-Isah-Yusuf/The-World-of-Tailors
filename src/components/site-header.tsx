"use client";
import Link from "next/link";
import { Button } from "./ui/button";
import { Search, ShoppingBag, Heart, Menu, ChevronDown } from "lucide-react";
import { useState } from "react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-midnight text-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-7 flex items-center justify-between text-[11px] tracking-widest">
          <span className="opacity-80">WORLDWIDE SHIPPING • VERIFIED TAILORS • PAYSTACK SECURE</span>
          <span className="hidden sm:flex gap-4 opacity-80"> <Link href="/tailors" className="hover:text-gold">Trust & Safety</Link> • <Link href="/fabrics" className="hover:text-gold">Help Centre</Link> </span>
        </div>
      </div>
      <div className="glass border-b border-white/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-navy-plum flex items-center justify-center text-ivory font-display font-bold text-xs tracking-widest border border-gold/20 shadow-soft">TWT</div>
              <div>
                <div className="font-display text-[19px] font-semibold leading-none text-midnight">The World of Tailors</div>
                <div className="text-[10px] tracking-[0.18em] text-taupe font-medium">TWT • EST. LAGOS</div>
              </div>
              <span className="hidden lg:inline ml-2 h-6 w-px bg-midnight/10" />
              <span className="hidden lg:inline text-xs tracking-widest text-burgundy font-semibold">ATELIER & MARKET</span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1 text-sm">
              <Link href="/" className="px-3 py-2 font-medium text-midnight">Home</Link>
              <Link href="/tailors" className="px-3 py-2 font-medium hover:text-plum flex gap-1 items-center">Find Tailors <ChevronDown className="h-3 w-3" /></Link>
              <Link href="/designs" className="px-3 py-2 font-medium hover:text-plum">Designs</Link>
              <Link href="/fabrics" className="px-3 py-2 font-medium hover:text-plum">Fabrics</Link>
              <Link href="/#how-it-works" className="px-3 py-2 font-medium hover:text-plum">How It Works</Link>
              <Link href="/register" className="px-3 py-2 font-medium hover:text-plum">Become a Partner</Link>
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={()=>setSearchOpen(!searchOpen)} className="h-9 w-9 grid place-items-center rounded-full border bg-white hover:shadow-soft"><Search className="h-4 w-4 text-midnight" /></button>
              <Link href="/dashboard/customer/favorites" className="hidden sm:grid h-9 w-9 place-items-center rounded-full border bg-white"><Heart className="h-4 w-4 text-midnight" /></Link>
              <Link href="/checkout" className="hidden sm:grid h-9 w-9 place-items-center rounded-full border bg-white relative"><ShoppingBag className="h-4 w-4 text-midnight" /><span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-burgundy text-white text-[10px] grid place-items-center">2</span></Link>
              <Link href="/login" className="hidden sm:inline-flex"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link href="/register" className="hidden sm:inline-flex"><Button variant="primary" size="sm">Get Started</Button></Link>
              <button onClick={()=>setOpen(!open)} className="lg:hidden h-9 w-9 grid place-items-center rounded-full border bg-white"><Menu className="h-4 w-4" /></button>
            </div>
          </div>
          {searchOpen && (
            <div className="pb-4">
              <div className="glass rounded-2xl p-3 flex gap-2 border border-plum/10">
                <input placeholder="Search tailors, designs, fabrics…" className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-taupe" autoFocus />
                <Button size="sm" variant="primary">Search</Button>
              </div>
            </div>
          )}
          {open && (
            <div className="lg:hidden pb-4 space-y-1 text-sm">
              <Link href="/tailors" className="block py-2">Find Tailors</Link>
              <Link href="/designs" className="block py-2">Designs</Link>
              <Link href="/fabrics" className="block py-2">Fabrics</Link>
              <Link href="/login" className="block py-2 font-medium">Sign In • Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
