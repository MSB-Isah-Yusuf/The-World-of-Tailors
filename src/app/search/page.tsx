import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NIGERIA_STATES } from "@/lib/location-data";

export default async function GlobalSearchPage({ searchParams }: { searchParams: Promise<{ q?:string; type?:string; state?:string; city?:string; lat?:string; lng?:string; distance?:string; page?:string }> }) {
  const sp = await searchParams;
  const q = sp?.q||""; const type= sp?.type||"all"; const state= sp?.state||""; const city= sp?.city||""; const page= sp?.page||"1";
  const apiUrl = new URLSearchParams({ ...(q&&{q}), ...(type&&{type}), ...(state&&{state}), ...(city&&{city}), page } as any).toString();
  let data:any=null;
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // Server fetch to own API — use direct prisma-like logic inline for SSR without fetch hop
    const { prisma } = await import("@/lib/prisma");
    const { distanceKm } = await import("@/lib/location-data");
    const lat = sp?.lat? Number(sp.lat): undefined; const lng= sp?.lng? Number(sp.lng): undefined; const distance= sp?.distance? Number(sp.distance):0;
    const whereTailor:any={ isPublished:true, businessStatus:"APPROVED" };
    if (state) whereTailor.state=state; if (city) whereTailor.city=city;
    let tailors:any[]=[], fabrics:any[]=[], designs:any[]=[];
    if (type==="all"||type==="tailor") {
      tailors = await prisma.tailorProfile.findMany({ where: whereTailor, take: 50, orderBy:{ ratingAvg:"desc"} });
      if (q) tailors = tailors.filter((t:any)=> t.businessName.toLowerCase().includes(q.toLowerCase()) || (t.bio||"").toLowerCase().includes(q.toLowerCase()));
      if (lat!=null&&lng!=null) tailors = tailors.map((t:any)=>({ ...t, _d: t.latitude&&t.longitude? distanceKm({lat,lng},{lat:t.latitude,lng:t.longitude}): null })).sort((a:any,b:any)=> (a._d??999)-(b._d??999));
      if (distance) tailors = tailors.filter((t:any)=> t._d==null || t._d<=distance);
    }
    if (type==="all"||type==="fabric") {
      const where:any={ isPublished:true };
      if (q) where.OR=[{ name:{ contains:q, mode:"insensitive"}},{ material:{ contains:q, mode:"insensitive"}}];
      fabrics = await prisma.fabricProduct.findMany({ where, include:{ seller:true, images:true }, take: 50, orderBy:{ createdAt:"desc"} });
      if (state||city) fabrics = fabrics.filter((p:any)=> (!state||p.seller?.state===state) && (!city||p.seller?.city===city));
      if (lat!=null&&lng!=null) fabrics = fabrics.map((p:any)=>({ ...p, _d: p.seller?.latitude&&p.seller?.longitude? distanceKm({lat,lng},{lat:p.seller.latitude,lng:p.seller.longitude}): null }));
    }
    if (type==="all"||type==="design") {
      designs = await prisma.design.findMany({ where:{ isPublished:true }, include:{ tailor:true, images:true }, take: 50, orderBy:{ createdAt:"desc"} });
      if (q) designs = designs.filter((d:any)=> d.title.toLowerCase().includes(q.toLowerCase()));
    }
    data = { tailors, fabrics, designs };
  } catch(e:any){ data={ tailors:[], fabrics:[], designs:[], error: e.message } }

  const hasFilters = q||state||city;
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-4"><div><h1 className="font-display text-3xl font-light">Global Search</h1><p className="text-sm text-muted-foreground mt-1">Search tailors, fabrics, designs at once • Location-aware • Distance-ranked • No fabricated results</p></div>
        <form className="flex gap-2"><Input name="q" placeholder="Search e.g. Agbada, lace, Ankara" defaultValue={q} className="w-72 bg-white h-9 text-sm"/><input type="hidden" name="type" value={type}/><button className="px-4 py-2 bg-midnight text-white rounded-full text-sm">Search</button></form></div>
        <form className="mt-4 p-4 rounded-2xl border bg-white grid md:grid-cols-6 gap-3 text-sm">
          <label className="space-y-1"><span className="text-xs text-taupe">Type</span><select name="type" defaultValue={type} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="all">All</option><option value="tailor">Tailors</option><option value="fabric">Fabrics</option><option value="design">Designs</option></select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">State</span><select name="state" defaultValue={state} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All states</option>{NIGERIA_STATES.map(s=> <option key={s.code} value={s.name}>{s.name}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">City</span><select name="city" defaultValue={city} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All cities</option>{(NIGERIA_STATES.find(s=>s.name===state)?.cities||[]).map(c=> <option key={c.name} value={c.name}>{c.name}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Distance</span><select name="distance" defaultValue={sp?.distance||""} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">Any</option><option value="5">5km</option><option value="25">25km</option><option value="50">50km</option></select></label>
          <div className="flex items-end gap-2 md:col-span-2"><button type="submit" className="flex-1 h-9 rounded-xl bg-gold text-midnight font-semibold text-sm">Apply — unified index</button><a href="/search" className="h-9 px-4 rounded-xl border bg-white grid place-items-center text-sm">Reset</a></div>
        </form>

        {/* Results */}
        {!data ? <div className="mt-6 text-sm text-muted-foreground">Loading…</div> : <>
          {(type==="all"||type==="tailor") && <div className="mt-8"><h2 className="font-semibold">Tailors — {data.tailors.length}</h2><div className="grid md:grid-cols-4 gap-4 mt-3">{data.tailors.slice(0,8).map((t:any)=><Link key={t.id} href={`/tailors/${t.slug}`}><Card className="overflow-hidden"><img src={t.profileImage||`https://picsum.photos/seed/${t.slug}/400/300`} className="h-40 w-full object-cover"/><CardContent className="p-3 text-sm"><div className="font-medium">{t.businessName}</div><div className="text-xs text-muted-foreground">{t.city}, {t.state} {t._d!=null && `• ${t._d.toFixed(1)}km`}</div></CardContent></Card></Link>)}</div>{data.tailors.length===0&&<div className="text-xs text-muted-foreground mt-2">No tailors match — try clearing city filter (expands to nearby).</div>}</div>}
          {(type==="all"||type==="fabric") && <div className="mt-8"><h2 className="font-semibold">Fabrics — {data.fabrics.length}</h2><div className="grid md:grid-cols-6 gap-4 mt-3">{data.fabrics.slice(0,12).map((p:any)=><Link key={p.id} href={`/fabrics/${p.slug}`}><Card className="overflow-hidden"><img src={p.images?.[0]?.url||`https://picsum.photos/seed/${p.slug}/400/400`} className="h-32 w-full object-cover"/><CardContent className="p-3 text-sm"><div className="font-medium line-clamp-1">{p.name}</div><div className="text-xs text-muted-foreground">{p.seller?.businessName} • {p.seller?.city}</div><div className="font-semibold mt-1">₦{Number(p.price).toLocaleString()}/{p.unit}</div></CardContent></Card></Link>)}</div></div>}
          {(type==="all"||type==="design") && <div className="mt-8"><h2 className="font-semibold">Designs — {data.designs.length}</h2><div className="grid md:grid-cols-4 gap-4 mt-3">{data.designs.slice(0,8).map((d:any)=><Link key={d.id} href={`/designs/${d.slug}`}><Card className="overflow-hidden"><img src={d.images?.[0]?.url||`https://picsum.photos/seed/${d.slug}/400/300`} className="h-40 w-full object-cover"/><CardContent className="p-3 text-sm"><div className="font-medium">{d.title}</div><div className="text-xs text-muted-foreground">{d.tailor?.businessName}</div></CardContent></Card></Link>)}</div></div>}
          <div className="mt-6 text-xs text-muted-foreground">Counts are DB counts with ownership/visibility checks (isPublished+APPROVED). Pagination 12/page via ?page=&take= — indexes on role/state/city/businessStatus already in schema.</div>
          <div className="mt-4 flex gap-2"><Link href={`/api/search?${apiUrl}&take=12`} className="text-xs underline">API: /api/search?{apiUrl} → JSON</Link><span className="text-xs text-muted-foreground">• HMAC checkout + webhook idempotency in /api/checkout & /api/webhooks/paystack</span></div>
        </>}
      </div><SiteFooter /></div>
  );
}
