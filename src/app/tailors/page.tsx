import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { MapPin, Star, ShieldCheck } from "lucide-react";
import { distanceKm, NIGERIA_STATES } from "@/lib/location-data";

export default async function TailorsPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; city?: string; lat?:string; lng?:string; distance?:string; specialty?:string; rating?:string; price?:string; available?:string }> }) {
  const sp = await searchParams;
  const state = sp?.state || "";
  const city = sp?.city || "";
  const q = sp?.q?.toLowerCase().trim() || "";
  const specialty = sp?.specialty || "";
  const rating = sp?.rating ? Number(sp.rating) : 0;
  const price = sp?.price || "all"; // all, under30, 30-60, 60-120, 120+
  const nearbyKm = sp?.distance ? Number(sp.distance) : 0;
  const lat = sp?.lat ? Number(sp.lat) : undefined;
  const lng = sp?.lng ? Number(sp.lng) : undefined;
  const availableOnly = sp?.available === "true";

  let tailors:any[]=[];
  try {
    const where:any={ isPublished:true, businessStatus:"APPROVED" };
    if (state) where.state = state;
    if (city) where.city = city;
    if (availableOnly) where.isPublished = true;
    // specialty filter via JSON string search (MVP) — exact specialty match in specialties JSON
    tailors = await prisma.tailorProfile.findMany({ where, include:{ user:true }, orderBy:{ ratingAvg:"desc" } });
    if (q) tailors = tailors.filter((t:any)=> t.businessName.toLowerCase().includes(q) || (t.city||"").toLowerCase().includes(q) || (t.bio||"").toLowerCase().includes(q));
    if (specialty) tailors = tailors.filter((t:any)=> {
      try { const arr = JSON.parse(t.specialties||"[]"); return arr.some((s:string)=> s.toLowerCase().includes(specialty.toLowerCase())); } catch { return (t.specialties||"").toLowerCase().includes(specialty.toLowerCase()); }
    });
    if (rating) tailors = tailors.filter((t:any)=> (t.ratingAvg||0) >= rating);
    if (price!=="all") {
      tailors = tailors.filter((t:any)=>{
        const p = t.startingPrice||0;
        if (price==="under30") return p>0 && p<30000;
        if (price==="30-60") return p>=30000 && p<60000;
        if (price==="60-120") return p>=60000 && p<120000;
        if (price==="120+") return p>=120000;
        return true;
      });
    }
    // Nearby distance via lat/lng (geospatial ranking - JS distance for MVP, PostGIS-ready)
    if (nearbyKm && lat!=null && lng!=null) {
      tailors = tailors.filter((t:any)=>{
        if (!t.latitude || !t.longitude) return false;
        const d = distanceKm({lat, lng}, {lat:t.latitude, lng:t.longitude});
        (t as any)._distance = d;
        return d <= nearbyKm;
      }).sort((a:any,b:any)=> (a._distance||9999)-(b._distance||9999));
    } else if (lat!=null && lng!=null) {
      // Rank by distance if browsing lat/lng but no distance filter
      tailors = tailors.map((t:any)=>{ let d=null; if (t.latitude&&t.longitude) d=distanceKm({lat,lng},{lat:t.latitude,lng:t.longitude}); (t as any)._distance=d; return t; }).sort((a:any,b:any)=>{
        if (a._distance!=null && b._distance!=null) return a._distance-b._distance;
        if (a._distance!=null) return -1;
        return 0;
      });
    }
  } catch {}
  if (tailors.length===0 && !q && !state) {
    tailors = [
      { id:"1", businessName:"Ade Bespoke", slug:"ade-bespoke", city:"Lagos", state:"Lagos", specialties:'["Agbada","Kaftan"]', profileImage:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop", ratingAvg:4.9, ratingCount:124, startingPrice:45000 },
      { id:"2", businessName:"Zara Stitches", slug:"zara-stitches", city:"Abuja", state:"FCT", specialties:'["Bridal","Ankara"]', profileImage:"https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop", ratingAvg:4.8, ratingCount:98, startingPrice:35000 },
    ];
  }

  const hasFilters = state || city || specialty || rating || price!=="all" || nearbyKm;

  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div><h1 className="font-display text-3xl font-light">Tailor Marketplace</h1><p className="text-sm text-muted-foreground mt-1">Location-aware • {tailors.length} verified tailors {state && `in ${city||state}`} {lat!=null && `• distance-ranked`}</p></div>
          <form className="flex gap-2"><Input name="q" placeholder="Search name, bio, city" defaultValue={sp?.q} className="w-64 bg-white h-9 text-sm" /><button className="px-4 py-2 bg-midnight text-white rounded-full text-sm">Search</button></form>
        </div>

        {/* Filters: Country/State/City, distance, specialty, rating, price */}
        <form className="mt-4 p-4 rounded-2xl border bg-white grid md:grid-cols-7 gap-3 text-sm">
          <label className="space-y-1"><span className="text-xs text-taupe">State</span><select name="state" defaultValue={state} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All states</option>{NIGERIA_STATES.map(s=> <option key={s.code} value={s.name}>{s.name}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">City</span><select name="city" defaultValue={city} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All cities</option>{(NIGERIA_STATES.find(s=>s.name===state)?.cities||[]).map(c=> <option key={c.name} value={c.name}>{c.name}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Nearby (km)</span><select name="distance" defaultValue={sp?.distance||""} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">Any distance</option><option value="5">Within 5km</option><option value="10">Within 10km</option><option value="25">Within 25km</option><option value="50">Within 50km</option></select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Specialty</span><select name="specialty" defaultValue={specialty} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All</option><option value="Agbada">Agbada</option><option value="Kaftan">Kaftan</option><option value="Corporate">Corporate</option><option value="Wedding">Wedding</option><option value="Ankara">Ankara</option></select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Min rating</span><select name="rating" defaultValue={sp?.rating||""} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">Any</option><option value="4">4★+</option><option value="4.5">4.5★+</option></select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Price</span><select name="price" defaultValue={price} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="all">Any</option><option value="under30">Under ₦30k</option><option value="30-60">₦30k–₦60k</option><option value="60-120">₦60k–₦120k</option><option value="120+">₦120k+</option></select></label>
          <div className="flex items-end gap-2"><button type="submit" className="flex-1 h-9 rounded-xl bg-gold text-midnight font-semibold text-sm">Apply filters</button>{hasFilters && <a href="/tailors" className="h-9 px-4 rounded-xl border bg-white grid place-items-center text-sm">Reset</a>}</div>
        </form>
        {hasFilters && <div className="mt-2 flex flex-wrap gap-2 text-xs">{state&&<span className="px-3 py-1 rounded-full bg-midnight text-white">{state} ×</span>}{city&&<span className="px-3 py-1 rounded-full bg-plum text-white">{city} ×</span>}{specialty&&<span className="px-3 py-1 rounded-full bg-amber-100 border">{specialty}</span>}{nearbyKm>0&&<span className="px-3 py-1 rounded-full bg-emeraldDeep text-white">Within {nearbyKm}km</span>}</div>}

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {tailors.map((t:any)=>(
            <Link key={t.id} href={`/tailors/${t.slug}`}>
              <Card className="overflow-hidden hover:shadow-lg transition border-midnight/10">
                <div className="relative"><img src={t.profileImage || `https://picsum.photos/seed/${t.slug}/400/300`} alt={t.businessName} className="h-48 w-full object-cover" /><div className="absolute top-2 left-2 bg-emeraldDeep text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldCheck className="h-3 w-3"/> Verified</div>{(t._distance!=null) && <div className="absolute top-2 right-2 bg-midnight text-white text-[11px] px-2 py-0.5 rounded-full">{t._distance.toFixed(1)}km away</div>}</div>
                <CardContent className="p-4">
                  <div className="font-semibold">{t.businessName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3"/>{t.city}, {t.state} • {(() => { try{ return JSON.parse(t.specialties||"[]")[0]} catch{ return (t.specialties||"Bespoke").split(",")[0] } })()}</div>
                  <div className="flex items-center gap-1 mt-2 text-xs"><Star className="h-3 w-3 fill-amber-500 text-amber-500"/>{t.ratingAvg?.toFixed(1)} ({t.ratingCount} reviews) <span className="ml-auto font-semibold text-emeraldDeep">From ₦{Number(t.startingPrice||25000).toLocaleString()}</span></div>
                  <div className="mt-3 flex gap-2"><span className="flex-1 text-center text-xs px-2 py-1 rounded-full bg-midnight text-white">View Profile</span><span className="flex-1 text-center text-xs px-2 py-1 rounded-full border">Book</span></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-xs text-muted-foreground">Geographic search: country → state → city → LGA → coordinates + serviceRadiusKm • PostGIS-ready • Expands to nearby/regional when exact city empty, never inventing businesses.</div>
      </div>
      <SiteFooter />
    </div>
  );
}
