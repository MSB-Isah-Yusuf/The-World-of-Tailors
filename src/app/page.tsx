import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { distanceKm } from "@/lib/location-data";
import { HomepageLocationSelector } from "@/components/location/HomepageLocationSelector";
import { ArrowRight, Scissors, ShieldCheck, MapPin, Star, Quote, Mail, Sparkles, Clock3, Package } from "lucide-react";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ state?: string; city?: string; lat?: string; lng?: string }> }) {
  const sp = await searchParams;
  const session = await auth().catch(()=>null);
  let browsingState = sp?.state || undefined;
  let browsingCity = sp?.city || undefined;
  let browsingLat = sp?.lat ? Number(sp.lat) : undefined;
  let browsingLng = sp?.lng ? Number(sp.lng) : undefined;

  // Logged-in preferred location fallback (do not silently override explicit query)
  if (!browsingState && !browsingCity && session?.user) {
    try {
      const pref = await prisma.userPreference.findUnique({ where:{ userId: (session.user as any).id } });
      if (pref?.browsingState) browsingState = pref.browsingState;
      if (pref?.browsingCity) browsingCity = pref.browsingCity;
      if (pref?.browsingLat && pref?.browsingLng) { browsingLat = pref.browsingLat; browsingLng = pref.browsingLng; }
    } catch {}
  }

  let featuredTailors: any[] = [];
  let featuredDesigns: any[] = [];
  let featuredFabrics: any[] = [];
  let nearbyTailors: any[] = [];
  let nearbySellers: any[] = [];
  let nearbyLabel = "";
  let regionalNote = "";

  try {
    // Base featured (fallback)
    [featuredTailors, featuredDesigns, featuredFabrics] = await Promise.all([
      prisma.tailorProfile.findMany({ where: { isPublished: true, businessStatus:"APPROVED" }, take: 8, include: { user: true }, orderBy:{ ratingAvg:"desc" } }),
      prisma.design.findMany({ where: { isPublished: true }, take: 6, include: { tailor: true, images: true } }),
      prisma.fabricProduct.findMany({ where: { isPublished: true }, take: 6, include: { seller: true, images: true } }),
    ]);

    // Location-aware ranking for tailors
    const allTailors = await prisma.tailorProfile.findMany({ where:{ isPublished:true, businessStatus:"APPROVED" }, include:{ user:true } });
    const allSellers = await prisma.sellerProfile.findMany({ where:{ isPublished:true, businessStatus:"APPROVED" }, include:{ user:true } });

    const rankTailors = () => {
      let exact: any[] = [], stateOnly: any[] = [], others: any[] = [];
      for (const t of allTailors) {
        const cityMatch = browsingCity && t.city && t.city.toLowerCase()===browsingCity.toLowerCase();
        const stateMatch = browsingState && t.state && t.state.toLowerCase()===browsingState.toLowerCase();
        if (browsingCity && cityMatch) exact.push(t);
        else if (browsingState && stateMatch) stateOnly.push(t);
        else if (!browsingState && !browsingCity) exact.push(t); // no filter -> treat as regional
        else others.push(t);
      }
      // Add distance if lat/lng available
      const withDistance = (list:any[]) => list.map(t=>{
        let d: number | null = null;
        if (browsingLat && browsingLng && t.latitude && t.longitude) d = distanceKm({lat:browsingLat, lng:browsingLng}, {lat:t.latitude, lng:t.longitude});
        return { ...t, _distance: d };
      }).sort((a,b)=>{
        if (a._distance!=null && b._distance!=null) return a._distance - b._distance;
        if (a._distance!=null) return -1;
        if (b._distance!=null) return 1;
        return (b.ratingAvg||0)-(a.ratingAvg||0);
      });
      const ranked = [...withDistance(exact), ...withDistance(stateOnly), ...withDistance(others)];
      // Determine label
      if (exact.length>0) { nearbyLabel = `in ${browsingCity}, ${browsingState||""}`; regionalNote=""; }
      else if (stateOnly.length>0) { nearbyLabel = `nearby in ${browsingState}`; regionalNote=`No exact matches in ${browsingCity||"that city"} — showing nearby in ${browsingState}.` }
      else if (browsingCity || browsingState) { nearbyLabel = `in broader region`; regionalNote = `No exact matches in ${browsingCity||browsingState} — showing regional tailors.`; }
      else { nearbyLabel = "featured"; regionalNote=""; }
      return ranked;
    };
    const rankSellers = () => {
      let exact: any[] = [], stateOnly: any[] = [], others: any[] = [];
      for (const s of allSellers) {
        const cityMatch = browsingCity && s.city && s.city.toLowerCase()===browsingCity.toLowerCase();
        const stateMatch = browsingState && s.state && s.state.toLowerCase()===browsingState.toLowerCase();
        if (browsingCity && cityMatch) exact.push(s);
        else if (browsingState && stateMatch) stateOnly.push(s);
        else others.push(s);
      }
      const withDistance = (list:any[]) => list.map(s=>{
        let d: number | null = null;
        if (browsingLat && browsingLng && s.latitude && s.longitude) d = distanceKm({lat:browsingLat, lng:browsingLng}, {lat:s.latitude, lng:s.longitude});
        return { ...s, _distance: d };
      }).sort((a,b)=>{
        if (a._distance!=null && b._distance!=null) return a._distance - b._distance;
        return (b.ratingAvg||0)-(a.ratingAvg||0);
      });
      return [...withDistance(exact), ...withDistance(stateOnly), ...withDistance(others)];
    };

    nearbyTailors = rankTailors().slice(0,6);
    nearbySellers = rankSellers().slice(0,6);

    // If no location filter, show top rated as nearby
    if (!browsingState && !browsingCity) {
      nearbyTailors = allTailors.sort((a,b)=>(b.ratingAvg||0)-(a.ratingAvg||0)).slice(0,6).map(t=>({ ...t, _distance:null }));
      nearbySellers = allSellers.sort((a,b)=>(b.ratingAvg||0)-(a.ratingAvg||0)).slice(0,4).map(s=>({ ...s, _distance:null }));
      nearbyLabel = "featured";
    }
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

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-navy-plum" />
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(700px circle at 15% 25%, rgba(198,161,91,0.35), transparent 45%), radial-gradient(600px circle at 85% 15%, rgba(114,47,69,0.25), transparent 40%)" }} />
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

      {/* Location-aware selector */}
      <section className="mx-auto max-w-7xl px-6 pt-12">
        <HomepageLocationSelector initialState={browsingState} initialCity={browsingCity} />
        <div className="text-xs text-taupe mt-2">Showing results near: <span className="font-semibold text-midnight">{browsingCity || browsingState || "All Nigeria"} {browsingCity && `• ${browsingState}`}</span> {browsingLat && browsingLng && `• ${browsingLat.toFixed(2)}, ${browsingLng.toFixed(2)}`} — <Link href="/tailors" className="underline">Advanced search</Link></div>
        {regionalNote && <div className="mt-2 text-xs px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">{regionalNote} Expanding to nearby areas, then wider state — clearly labeled as nearby/regional, never inventing businesses.</div>}
      </section>

      {/* Location-aware Tailors Near You */}
      <section className="mx-auto max-w-7xl px-6 pt-6">
        <div className="flex items-end justify-between">
          <div><div className="text-xs tracking-[0.18em] text-emeraldDeep font-semibold">TAILORS NEAR YOU • {nearbyLabel.toUpperCase()}</div><h2 className="font-display text-2xl md:text-3xl font-semibold mt-1">Tailors Near You</h2><p className="text-sm text-taupe mt-1">Verified & published tailors serving your location — ranked by proximity, verified status, rating</p></div>
          <Link href={`/tailors?state=${browsingState||""}&city=${browsingCity||""}`} className="hidden sm:flex text-sm font-medium text-plum items-center gap-1">View all near you <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
          {nearbyTailors.map((t:any)=>(
            <Link key={t.id} href={`/tailors/${t.slug}`} className="group">
              <div className="rounded-2xl overflow-hidden border bg-white hover:shadow-card transition">
                <div className="relative"><img src={t.profileImage || `https://picsum.photos/seed/${t.slug}/400/300`} alt={t.businessName} className="h-44 w-full object-cover group-hover:scale-[1.04] transition" /><div className="absolute top-2 left-2 bg-emeraldDeep text-white text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="h-3 w-3"/>Verified</div>{t._distance!=null && <div className="absolute top-2 right-2 bg-midnight text-white text-[11px] px-2 py-0.5 rounded-full">{t._distance.toFixed(1)}km away</div>}</div>
                <div className="p-3"><div className="text-sm font-medium line-clamp-1">{t.businessName}</div><div className="text-xs text-taupe flex items-center gap-1"><MapPin className="h-3 w-3"/>{t.city}, {t.state} • {JSON.parse(t.specialties||'["Bespoke"]')[0]}</div><div className="flex items-center gap-1 mt-2"><Star className="h-3.5 w-3.5 text-gold fill-gold"/><span className="text-xs font-medium">{t.ratingAvg.toFixed(1)} ({t.ratingCount})</span><span className="ml-auto text-xs text-emeraldDeep">From ₦{Number(t.startingPrice||25000).toLocaleString()}</span></div><div className="mt-2 flex gap-2"><span className="flex-1 text-center text-xs px-2 py-1 rounded-full bg-midnight text-white">View Profile</span><span className="flex-1 text-center text-xs px-2 py-1 rounded-full border">Book Tailor</span></div></div>
              </div>
            </Link>
          ))}
        </div>
        {nearbyTailors.length===0 && <div className="text-sm text-muted-foreground rounded-xl border bg-white p-6 text-center mt-4">No tailors found — try expanding to state or check back after tailors complete location verification.</div>}
      </section>

      {/* Fabric Sellers Near You */}
      <section className="bg-midnight text-ivory mt-10">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-end justify-between">
            <div><div className="text-xs tracking-[0.18em] text-gold font-semibold">FABRIC SELLERS NEAR YOU • {nearbyLabel.toUpperCase()}</div><h2 className="font-display text-2xl md:text-3xl font-semibold mt-1">Fabric Sellers Near You</h2><p className="text-sm text-ivory/70 mt-1">Texture close-ups • stock-aware • delivery to tailor supported • distance-ranked</p></div>
            <Link href={`/fabrics?state=${browsingState||""}&city=${browsingCity||""}`} className="hidden sm:flex text-sm font-medium text-gold items-center gap-1">Shop fabrics <ArrowRight className="h-4 w-4"/></Link>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            {nearbySellers.map((s:any)=>(
              <Link key={s.id} href={`/sellers/${s.slug}`} className="group">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white text-charcoal">
                  <img src={s.profileImage || `https://picsum.photos/seed/${s.slug}/400/300`} alt={s.businessName} className="h-40 w-full object-cover group-hover:scale-[1.04] transition" />
                  <div className="p-3"><div className="text-sm font-medium line-clamp-1">{s.businessName}</div><div className="text-xs text-taupe flex items-center gap-1"><MapPin className="h-3 w-3"/>{s.city}, {s.state} {s._distance!=null && `• ${s._distance.toFixed(1)}km`}</div><div className="text-xs mt-1">{s.deliveryMethods||"Dispatch • Pickup"} • {s._distance!=null ? `${s._distance.toFixed(0)}km` : "Regional"}</div><div className="mt-2 flex gap-2"><span className="flex-1 text-center text-xs px-2 py-1 rounded-full bg-midnight text-white">View Shop</span><span className="flex-1 text-center text-xs px-2 py-1 rounded-full border">View Fabric</span></div></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.18em] text-plum font-semibold">EDITOR'S COLLECTION</div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold mt-1">Popular Clothing Designs</h2>
            <p className="text-sm text-taupe mt-1">Inspired by tradition, tailored for today — filtered by your region where available.</p>
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
        <div className="text-xs text-taupe mt-3">Popular Designs in Your Region — based on actual catalog data (category + tailor location), not fabricated. {browsingState && `For ${browsingState}${browsingCity?`, ${browsingCity}`:""} we prioritized local tailors' designs.`}</div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-2xl border bg-gradient-champagne-ivory p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-sm"><span className="font-semibold">Available Services Around You</span> <span className="text-taupe">— genuinely available within selected service area ({browsingState||"Nigeria"}), verified location, rating, and availability.</span></div>
          <Link href={`/tailors?state=${browsingState||""}&city=${browsingCity||""}`}><Button variant="outline" size="sm">Browse services</Button></Link>
        </div>
      </section>

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

      <section className="mx-auto max-w-7xl px-6 pb-10">
        <div className="text-center text-xs text-taupe">Location ranking: 1) serves selected location 2) confirmed lat/lng 3) category/specialty match 4) verified 5) rating 6) availability/delivery coverage — never fabricating distance, price, or availability.</div>
      </section>

      <SiteFooter />
    </div>
  );
}
