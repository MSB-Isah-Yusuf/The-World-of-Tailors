import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-midnight text-ivory">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-navy-plum border border-gold/30 grid place-items-center font-display font-bold text-xs tracking-widest">TWT</div>
              <div>
                <div className="font-display text-lg font-semibold leading-none">The World of Tailors</div>
                <div className="text-xs tracking-widest text-gold">TWT • CRAFTSMANSHIP • TRUST</div>
              </div>
            </div>
            <p className="text-sm text-ivory/70 mt-3 max-w-md leading-relaxed">A premium atelier marketplace connecting you to verified tailors and fabric sellers. From inspiration to perfect fit — stitched with transparency, measured with care.</p>
            <div className="mt-4 flex gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">Paystack Secure</span>
              <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">Verified Tailors</span>
              <span className="px-2 py-1 rounded-full bg-white/10 border border-white/10">Nationwide Delivery</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gold text-sm tracking-wide">Marketplace</h4>
            <ul className="mt-3 space-y-2 text-sm text-ivory/75">
              <li><Link href="/tailors">Find Tailors</Link></li>
              <li><Link href="/designs">Design Gallery</Link></li>
              <li><Link href="/fabrics">Fabric Market</Link></li>
              <li><Link href="/sellers">Fabric Sellers</Link></li>
              <li>How It Works</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gold text-sm tracking-wide">Partners</h4>
            <ul className="mt-3 space-y-2 text-sm text-ivory/75">
              <li><Link href="/register/tailor">Become a Tailor</Link></li>
              <li><Link href="/register/seller">Become a Fabric Seller</Link></li>
              <li>Verification & Trust</li>
              <li>Pricing & Fees</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gold text-sm tracking-wide">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-ivory/75">
              <li>Help Centre</li><li>Delivery Policy</li><li>Privacy • Terms</li><li>Contact</li>
              <li className="pt-2 text-xs text-ivory/50">© {new Date().getFullYear()} The World of Tailors Ltd. (TWT)</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-ivory/60">
          <span>Deep luxury colours — Midnight Navy #10182B • Royal Plum #51254F • Emerald #145447 • Gold #C6A15B • Warm Ivory #F8F4EC</span>
          <span>Accessibility • Reduced-motion • Keyboard nav • Lagos • Abuja • Accra</span>
        </div>
      </div>
    </footer>
  );
}
