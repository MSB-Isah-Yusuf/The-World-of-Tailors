import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { ArrowRight, Scissors, ShieldCheck, MapPin, Star, Quote, Mail, Sparkles, Clock3, Award, Package } from "lucide-react";

export default async function HomePage() {
  let featuredTailors: any[] = [];
  let featuredDesigns: any[] = [];
  let featuredFabrics: any[] = [];
  try {
    featuredTailors = await prisma.tailorProfile.findMany({ where: { isPublished: true }, take: 4, include: { user: true } });
    featuredDesigns = await prisma.design.findMany({ where: { isPublished: true }, take: 6, include: { tailor: true, images: true } });
    featuredFabrics = await prisma.fabricProduct.findMany({ where: { isPublished: true }, take: 6, include: { seller: true, images: true } });
  } catch {}

  const heroStats = [
    { label: "Verified Tailors", value: "1,200+" },
    { label: "Bespoke Designs", value: "8k+" },
    { label: "Fabric Textures", value: "5k+" },
    { label: "Happy Clients", value: "24k+" },
  ];

  return (
    <div className="min-h-screen bg-ivory">
      <SiteHeader />

      {/* HERO — Midnight Navy → Royal Plum with gold glow */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-navy-plum" />
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(700px circle at 15% 25%, rgba(198,161,91,0.35), transparent 45%), radial-gradient(600px circle at 85% 15%, rgba(114,47,69,0.25), transparent 40%)" }} />
        {/* subtle fabric texture overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div className="text-ivory">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-gold/30 px-3 py-1 text-xs tracking-widest"> <Sparkles className="h-3 w-3 text-gold" /> NEW COLLECTION • AGBADA ATELIER 2025 </div>
            <h1 className="font-display text-4xl lg:text-[52px] font-semibold leading-[1.05] mt-4">
              Your Style.<br />
              <span className="text-gold font-light italic">Your Fabric.</span><br />
              Your Perfect Fit.
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-ivory/80 max-w-xl">
              Discover talented tailors, explore inspiring designs, and shop beautiful fabrics — all in one place. Track every stitch from request to delivery with verified professionals.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/tailors"><Button variant="gold" size="lg" className="rounded-full">Find Your Tailor <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <Link href="/fabrics"><Button variant="secondary" size="lg" className="rounded-full bg-white/95">Explore Fabrics</Button></Link>
              <Link href="/designs"><Button variant="ghost" size="lg" className="rounded-full bg-white/10 text-ivory border border-white/15 hover:bg-white/15">Browse Designs</Button></Link>
            </div>
            <div className="mt-6 flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 bg-emeraldDeep text-white px-2 py-1 rounded-full border border-white/10"><ShieldCheck className="h-3 w-3" /> Verified Tailors</span>
              <span className="text-ivory/70">Paystack secure • Tailor ratings • Est. turnaround shown</span>
            </div>
            <div className="mt-8 grid grid-cols-4 gap-4 border-t border-white/10 pt-5 max-w-lg">
              {heroStats.map(s => (
                <div key={s.label}><div className="font-display text-xl font-semibold text-ivory">{s.value}</div><div className="text-[11px] tracking-wide text-ivory/65">{s.label}</div></div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-[28px] p-3 bg-white/10 border border-white/15 backdrop-blur-xl shadow-premium">
              <img src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=900&auto=format&fit=crop" alt="Editorial tailoring — Agbada" className="rounded-[22px] h-[520px] w-full object-cover" />
              {/* info overlay */}
              <div className="absolute bottom-6 left-6 right-6 glass rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-midnight">Elegance Agbada — Ade Bespoke Atelier</div>
                  <div className="text-xs text-taupe flex items-center gap-1"><MapPin className="h-3 w-3" /> Lagos • Verified <ShieldCheck className="h-3 w-3 text-emeraldDeep" /> • 5.0 ★ (128)</div>
                </div>
                <Badge variant="gold">From ₦45,000</Badge>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 hidden lg:flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-premium border">
              <div className="h-10 w-10 rounded-full bg-midnight text-ivory grid place-items-center"><Scissors className="h-5 w-5" /></div>
              <div><div className="text-sm font-semibold">Live Production Tracking</div><div className="text-xs text-taupe">Request → Accepted → In Production → Ready</div></div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden lg:flex bg-emeraldDeep text-white rounded-2xl px-4 py-3 shadow-premium items-center gap-3">
              <Clock3 className="h-5 w-5 text-gold" />
              <div><div className="text-sm font-semibold">7-Day Atelier Promise</div><div className="text-xs text-white/80">Clear ETA • No hidden fees</div></div>
            </div>
          </div>
        </div>

        {/* QUICK DISCOVERY PANEL — floating glass search */}
        <div className="relative mx-auto max-w-7xl px-6 -mb-10">
          <div className="glass rounded-2xl p-4 md:p-5 border border-plum/10 grid md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold tracking-wide text-midnight">What would you like to make?</label>
              <select className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm"><option>Select garment</option><option>Agbada</option><option>Kaftan / Senator</option><option>Ankara Dress</option><option>Suit & Corporate</option><option>Bridal & Aso-Ebi</option><option>Altar/Alterations</option></select>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide text-midnight">Preferred location</label>
              <select className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm"><option>Lagos</option><option>Abuja</option><option>Ibadan</option><option>Port Harcourt</option><option>Accra</option></select>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide text-midnight">Clothing category</label>
              <select className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm"><option>Any</option><option>Traditional</option><option>Native Attire</option><option>Wedding / Bridal</option><option>Casual</option><option>Corporate</option></select>
            </div>
            <div>
              <label className="text-xs font-semibold tracking-wide text-midnight">Budget range</label>
              <select className="mt-1 w-full h-10 rounded-xl border bg-white px-3 text-sm"><option>Any price</option><option>₦15k – ₦30k</option><option>₦30k – ₦60k</option><option>₦60k – ₦120k</option><option>₦120k+</option></select>
            </div>
            <div className="flex items-end"><Link href="/tailors" className="w-full"><Button variant="primary" size="lg" className="w-full">Search Tailors</Button></Link></div>
          </div>
          <div className="text-center text-xs text-taupe mt-2">Browse without registering • Filters for specialty, rating, turnaround & availability</div>
        </div>
      </section>

      {/* FEATURED — Popular Designs */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.18em] text-plum font-semibold">EDITOR'S COLLECTION</div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold mt-1">Popular Clothing Designs</h2>
            <p className="text-sm text-taupe mt-1">Inspired by tradition, tailored for today.</p>
          </div>
          <Link href="/designs" className="hidden sm:flex text-sm font-medium text-plum items-center gap-1">Explore Gallery <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
          {(featuredDesigns.length ? featuredDesigns : Array.from({ length: 6 }).map((_, i) => ({
            id: `${i}`, slug: `design-${i}`, title: ["Heritage Agbada","Ankara Midi","Corporate Kaftan","Wedding Aso-Oke","Casual Senator","Kids Ankara"][i], price: 25000 + i*5000, images: [{ url: `https://images.unsplash.com/photo-${["1558769132-cb1aea458c5e","1529626455594-4ff0802cfb7e","1515886657613-9f3515b0c78f","1490481651871-ab68de25d43d","1441986300917-64674bd600d8","1485230893385-4a4c9ff37d2c"][i]}?q=80&w=400&auto=format&fit=crop` }], tailor: { businessName: "Ade Bespoke" }
          }))).map((d: any) => (
            <Link key={d.id} href={`/designs/${d.slug}`} className="group">
              <div className="rounded-2xl overflow-hidden border bg-white hover:shadow-card transition">
                <div className="relative">
                  <img src={d.images?.[0]?.url || `https://picsum.photos/seed/${d.slug}/400/500`} alt={d.title} className="h-56 w-full object-cover group-hover:scale-[1.04] transition duration-500" />
                  <div className="absolute top-2 left-2 bg-white/90 border rounded-full px-2 py-0.5 text-[11px] font-medium">From ₦{Number(d.price).toLocaleString()}</div>
                </div>
                <div className="p-3"><div className="text-sm font-medium line-clamp-1">{d.title}</div><div className="text-xs text-taupe">{d.tailor?.businessName || "TWT Atelier"} • View Design</div></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended Tailors */}
      <section className="bg-white border-y">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs tracking-[0.18em] text-emeraldDeep font-semibold">VERIFIED ATELIERS</div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mt-1">Recommended Tailors</h2>
              <p className="text-sm text-taupe mt-1">Craftsmanship you can trust — ratings from completed orders.</p>
            </div>
            <Link href="/tailors" className="hidden sm:flex text-sm font-medium text-plum items-center gap-1">Find Tailors <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid md:grid-cols-4 gap-6 mt-6">
            {(featuredTailors.length ? featuredTailors : [
              { id: "1", businessName: "Ade Bespoke", slug: "ade-bespoke", city: "Lagos", specialties: '["Agbada","Corporate"]', profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop", ratingAvg: 4.9 },
              { id: "2", businessName: "Zara Stitches", slug: "zara-stitches", city: "Abuja", specialties: '["Wedding","Ankara"]', profileImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop", ratingAvg: 4.8 },
              { id: "3", businessName: "Kente & Co", slug: "kente-co", city: "Accra", specialties: '["Traditional","Kente"]', profileImage: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop", ratingAvg: 4.9 },
              { id: "4", businessName: "The Cut Lagos", slug: "the-cut-lagos", city: "Lekki", specialties: '["Casual","Street"]', profileImage: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop", ratingAvg: 4.7 },
            ]).map((t: any) => (
              <Link key={t.id} href={`/tailors/${t.slug}`}>
                <Card className="overflow-hidden hover:shadow-card transition group border-midnight/10">
                  <div className="h-44 overflow-hidden relative">
                    <img src={t.profileImage || `https://picsum.photos/seed/${t.slug}/400/300`} alt={t.businessName} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                    <div className="absolute top-3 left-3 bg-emeraldDeep text-white text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Verified</div>
                  </div>
                  <CardContent className="p-4">
                    <div className="font-semibold">{t.businessName}</div>
                    <div className="text-xs text-taupe flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {t.city} • {Array.isArray(t.specialties) ? t.specialties[0] : (JSON.parse(t.specialties || '[]')[0] || "Bespoke")}</div>
                    <div className="flex items-center gap-2 mt-2"><Star className="h-3.5 w-3.5 text-gold fill-gold" /><span className="text-xs font-medium">{t.ratingAvg} • View Portfolio</span><span className="ml-auto text-xs text-emeraldDeep">From ₦25k</span></div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {/* near you strip */}
          <div className="mt-6 rounded-2xl border bg-gradient-champagne-ivory p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-sm"><span className="font-semibold">Tailors near you</span> <span className="text-taupe">— enable location to see ateliers within 5km, with distance, ETA and availability.</span></div>
            <Link href="/tailors"><Button variant="outline" size="sm">Show nearby tailors</Button></Link>
          </div>
        </div>
      </section>

      {/* Trending Fabrics — dark luxury band */}
      <section className="bg-midnight text-ivory">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs tracking-[0.18em] text-gold font-semibold">FABRIC BOUTIQUE</div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mt-1">Trending Fabrics</h2>
              <p className="text-sm text-ivory/70 mt-1">Texture close-ups • stock-aware • delivery to tailor supported.</p>
            </div>
            <Link href="/fabrics" className="hidden sm:flex text-sm font-medium text-gold items-center gap-1">Shop all fabrics <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            {(featuredFabrics.length ? featuredFabrics : Array.from({ length: 6 }).map((_, i) => ({
              id: `${i}`, slug: `fabric-${i}`, name: ["Swiss Lace Ivory","Ankara Gold Burst","Cashmere Wool Charcoal","Aso-Oke Royal","Adire Indigo","Brocade Champagne"][i], price: 8000 + i*2000, material: ["Lace","Ankara","Wool","Aso-Oke","Adire","Brocade"][i], images: [{ url: `https://images.unsplash.com/photo-${["1523381210434-271e8be1f52b","1558769132-cb1aea458c5e","1567401893414-76b7b1e5a7a5","1515886657613-9f3515b0c78f","1445205170230-053b83016050","1485230893385-4a4c9ff37d2c"][i]}?q=80&w=400&auto=format&fit=crop` }], seller: { businessName: "Lagos Fabrics" }
            }))).map((p: any) => (
              <Link key={p.id} href={`/fabrics/${p.slug}`} className="group">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white text-charcoal hover:shadow-premium transition">
                  <img src={p.images?.[0]?.url} alt={p.name} className="h-40 w-full object-cover group-hover:scale-[1.04] transition" />
                  <div className="p-3"><div className="text-sm font-medium line-clamp-1">{p.name}</div><div className="text-xs text-taupe">{p.material} • {p.seller?.businessName}</div><div className="text-sm font-semibold mt-1">₦{Number(p.price).toLocaleString()} / m</div></div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-xs text-ivory/60">Compare • Favorites • Recently viewed • Recommended for your selected design</div>
        </div>
      </section>

      {/* Collections */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Featured Fashion Collections</h2>
          <span className="text-xs tracking-widest text-taupe">CURATED BY TWT</span>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            { title: "Royal Wedding Aso-Ebi", img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=600&auto=format&fit=crop", cat: "Burgundy → Plum" },
            { title: "Corporate Heritage", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop", cat: "Emerald → Navy" },
            { title: "Soft Ankara Everyday", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=600&auto=format&fit=crop", cat: "Champagne → Ivory" },
          ].map(c => (
            <div key={c.title} className="rounded-2xl overflow-hidden border relative h-64">
              <img src={c.img} alt={c.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/70 via-midnight/10 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-xs text-gold">{c.cat}</div>
                <div className="font-display text-xl text-white">{c.title}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — premium steps */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-10">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs tracking-[0.18em] text-plum font-semibold">THE TAILORING JOURNEY</div>
          <h2 className="font-display text-3xl font-semibold mt-1">How The World of Tailors (TWT) Works</h2>
          <p className="text-sm text-taupe mt-2">From inspiration to wardrobe in five clear steps — transparent at every stitch.</p>
        </div>
        <div className="grid md:grid-cols-5 gap-4 mt-8">
          {[
            { n: "01", t: "Discover", d: "Browse tailors & designs by style, location and budget." },
            { n: "02", t: "Book", d: "Choose a design, submit measurements & instructions." },
            { n: "03", t: "Source Fabric", d: "Buy fabric and deliver to yourself or your tailor." },
            { n: "04", t: "Track", d: "Tailor confirms, stitches, and updates progress live." },
            { n: "05", t: "Receive", d: "Try on, review and celebrate — Paystack secure." },
          ].map(s => (
            <Card key={s.n} className="text-center border-plum/10 hover:shadow-card transition bg-gradient-champagne-ivory">
              <CardContent className="pt-6"><div className="mx-auto h-10 w-10 rounded-full bg-midnight text-gold grid place-items-center font-semibold text-sm border border-gold/30">{s.n}</div><h3 className="mt-3 font-semibold">{s.t}</h3><p className="text-xs text-taupe mt-1">{s.d}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Verified partners + Testimonials */}
      <section className="bg-white border-y">
        <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emeraldDeep" /><span className="text-xs tracking-[0.18em] font-semibold text-emeraldDeep">VERIFIED PROFESSIONAL PARTNERS</span></div>
            <h3 className="font-display text-xl font-semibold mt-2">Trust is stitched in</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {["House of Zara","Ade Atelier","Kente & Co","Lagos Fabrics Hub","Savile Yaba","Maison Tolu","Ankara Republic","George & Brocade"].map(p => (
                <div key={p} className="rounded-xl border bg-ivory p-4 text-center">
                  <div className="h-8 w-8 mx-auto rounded-full bg-midnight text-gold grid place-items-center text-xs">✓</div>
                  <div className="text-xs font-medium mt-2">{p}</div>
                  <div className="text-[11px] text-emeraldDeep">Verified • 4.8★</div>
                </div>
              ))}
            </div>
          </div>
          <Card className="border-gold/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2"><Quote className="h-5 w-5 text-gold" /><span className="font-semibold">Customer Love</span></div>
              <blockquote className="mt-4 text-sm leading-relaxed text-charcoal">“TWT delivered my wedding aso-ebi in 5 days. The booking wizard, measurement guide and fabric-to-tailor delivery saved me 3 trips to Yaba market!”</blockquote>
              <div className="mt-3 flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-burgundy text-white grid place-items-center text-xs">A</div><div><div className="text-xs font-medium">Amaka O., Lagos</div><div className="text-xs text-taupe">Verified Buyer • #TWT-2412 • ★★★★★</div></div></div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Become a partner + Newsletter */}
      <section className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-2 gap-6">
        <Card className="overflow-hidden border-plum/10">
          <div className="grid md:grid-cols-2">
            <div className="p-6">
              <h3 className="font-display text-xl font-semibold">Become a Partner</h3>
              <p className="text-sm text-taupe mt-1">Showcase your atelier to thousands seeking perfect fit.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Link href="/register/tailor"><Button variant="primary" className="w-full">Apply as Tailor — TWT Verified</Button></Link>
                <Link href="/register/seller"><Button variant="outline" className="w-full">Apply as Fabric Seller</Button></Link>
              </div>
              <div className="text-xs text-taupe mt-2">Map onboarding • progressive disclosure • verification in 48h</div>
            </div>
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop" alt="Atelier" className="h-full w-full object-cover hidden md:block" />
          </div>
        </Card>
        <Card className="bg-midnight text-ivory border-midnight">
          <CardContent className="p-6">
            <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-gold" /><span className="font-semibold">Join the Atelier Letter</span></div>
            <p className="text-sm text-ivory/70 mt-2">New collections, fabric drops & Lagos fashion-week edits.</p>
            <div className="mt-4 flex gap-2">
              <input placeholder="Your email" className="flex-1 h-10 rounded-full px-4 text-sm text-midnight bg-white placeholder:text-taupe" />
              <Button variant="gold" className="rounded-full">Subscribe</Button>
            </div>
            <div className="text-xs text-ivory/60 mt-2">No spam • Unsubscribe anytime • TWT respects privacy</div>
          </CardContent>
        </Card>
      </section>

      {/* Category quick links */}
      <section className="mx-auto max-w-7xl px-6 pb-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {["Men's Fashion","Women's Fashion","Traditional","Corporate","Wedding","Casual","Children","Fabrics"].map(c => (
            <Link key={c} href={`/designs?category=${encodeURIComponent(c)}`} className="rounded-2xl border bg-white p-4 hover:shadow-soft transition flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-plum/5 grid place-items-center"><Package className="h-5 w-5 text-plum" /></div>
              <div className="text-sm font-medium">{c}</div>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
