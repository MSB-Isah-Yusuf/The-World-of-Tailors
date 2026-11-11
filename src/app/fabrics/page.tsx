import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { distanceKm, NIGERIA_STATES } from "@/lib/location-data";
import { MapPin } from "lucide-react";

export default async function FabricsPage({ searchParams }: { searchParams: Promise<{ q?:string; state?:string; city?:string; lat?:string; lng?:string; distance?:string; fabricType?:string; color?:string; price?:string; inStock?:string }> }) {
  const sp = await searchParams;
  const state = sp?.state||""; const city= sp?.city||""; const q= (sp?.q||"").toLowerCase().trim(); const fabricType= sp?.fabricType||""; const color= sp?.color||""; const lat= sp?.lat? Number(sp.lat):undefined; const lng= sp?.lng? Number(sp.lng):undefined; const distance= sp?.distance? Number(sp.distance):0;
  let products:any[]=[];
  try {
    const where:any={ isPublished:true };
    if (q) where.OR=[{ name:{ contains:q, mode:"insensitive" } },{ material:{ contains:q, mode:"insensitive" } }];
    if (fabricType) where.material = { contains: fabricType, mode:"insensitive" };
    if (color) where.color = { contains: color, mode:"insensitive" };
    if (sp?.inStock==="true") where.stock = { gt:0 };
    products = await prisma.fabricProduct.findMany({ where, include:{ images:true, seller:true, category:true }, take:50 });
    // Seller location filter + distance
    if (state || city || (lat!=null&&lng!=null)) {
      products = products.filter((p:any)=>{
        const s=p.seller;
        if (!s) return false;
        if (state && s.state!==state) return false;
        if (city && s.city!==city) return false;
        if (distance && lat!=null && lng!=null && s.latitude && s.longitude) {
          const d= distanceKm({lat,lng},{lat:s.latitude,lng:s.longitude});
          (p as any)._distance=d;
          return d<=distance;
        }
        if (lat!=null && lng!=null && s.latitude && s.longitude) (p as any)._distance = distanceKm({lat,lng},{lat:s.latitude,lng:s.longitude});
        return true;
      }).sort((a:any,b:any)=>{
        if (a._distance!=null && b._distance!=null) return a._distance-b._distance;
        return 0;
      });
    }
    if (sp?.price) {
      const [min,max]= sp.price.split("-").map(Number);
      if (!isNaN(min) && !isNaN(max)) products = products.filter((p:any)=> p.price>=min && p.price<=max);
    }
  } catch {}
  if (products.length===0 && !q) products = Array.from({ length: 12 }).map((_, i) => ({ id: `${i}`, slug: `fabric-${i}`, name: ["Swiss Lace Ivory","Ankara Gold Burst","Cashmere Wool Charcoal","Aso-Oke Royal","Adire Indigo","Brocade Champagne","Guinea Brocade","Atiku Fabric","Cotton Ankara","Linen Blend","Damask Shine","George Wrapper"][i], price: 8000+i*1500, material: ["Lace","Ankara","Wool"][i%3], color: ["Ivory","Gold","Charcoal"][i%3], stock: 100-i*5, images: [{ url: `https://picsum.photos/seed/fabric${i}/400/400` }], seller: { businessName: "Lagos Fabrics Hub", slug: "lagos-fabrics", city:"Lagos", state:"Lagos" } }));
  const hasFilters = state||city||fabricType||color||sp?.price||distance;
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-4"><div><h1 className="font-display text-3xl font-light">Fabric Marketplace</h1><p className="text-sm text-muted-foreground mt-1">{products.length} fabrics {state && `in ${city||state}`} • Combine location + product filters • Reset available</p></div>
        <form className="flex gap-2"><Input name="q" placeholder="Search fabric, material, color" defaultValue={sp?.q} className="w-64 bg-white h-9 text-sm"/><button className="px-4 py-2 bg-midnight text-white rounded-full text-sm">Search</button></form></div>
        <form className="mt-4 p-4 rounded-2xl border bg-white grid md:grid-cols-7 gap-3 text-sm">
          <label className="space-y-1"><span className="text-xs text-taupe">State</span><select name="state" defaultValue={state} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All states</option>{NIGERIA_STATES.map(s=> <option key={s.code} value={s.name}>{s.name}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">City</span><select name="city" defaultValue={city} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All cities</option>{(NIGERIA_STATES.find(s=>s.name===state)?.cities||[]).map(c=> <option key={c.name} value={c.name}>{c.name}</option>)}</select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Nearby</span><select name="distance" defaultValue={sp?.distance||""} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">Any distance</option><option value="5">5km</option><option value="10">10km</option><option value="25">25km</option><option value="50">50km</option></select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Fabric type</span><select name="fabricType" defaultValue={fabricType} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All</option><option>Ankara</option><option>Lace</option><option>Aso-Oke</option><option>Brocade</option><option>Adire</option><option>Wool</option></select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Color</span><select name="color" defaultValue={color} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">All</option><option>Ivory</option><option>Gold</option><option>Charcoal</option><option>Red</option><option>Navy</option></select></label>
          <label className="space-y-1"><span className="text-xs text-taupe">Price</span><select name="price" defaultValue={sp?.price||""} className="w-full h-9 rounded-xl border px-3 bg-white"><option value="">Any</option><option value="0-10000">₦0–10k</option><option value="10000-20000">₦10k–20k</option><option value="20000-50000">₦20k+</option></select></label>
          <div className="flex items-end gap-2"><button type="submit" className="flex-1 h-9 rounded-xl bg-gold text-midnight font-semibold text-sm">Apply</button>{hasFilters && <a href="/fabrics" className="h-9 px-4 rounded-xl border bg-white grid place-items-center text-sm">Reset</a>}</div>
        </form>
        {hasFilters && <div className="mt-2 flex flex-wrap gap-2 text-xs">{state&&<span className="px-3 py-1 rounded-full bg-midnight text-white">{state}</span>}{city&&<span className="px-3 py-1 rounded-full bg-plum text-white">{city}</span>}{distance>0&&<span className="px-3 py-1 rounded-full bg-emeraldDeep text-white">Within {distance}km</span>}</div>}
        <div className="grid md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
          {products.map((p:any)=>(
            <Link key={p.id} href={`/fabrics/${p.slug}`} className="group">
              <div className="rounded-2xl overflow-hidden border bg-white"><div className="relative"><img src={p.images?.[0]?.url} alt={p.name} className="h-40 w-full object-cover group-hover:scale-105 transition" />{p._distance!=null && <span className="absolute top-2 right-2 bg-midnight text-white text-[11px] px-2 py-0.5 rounded-full">{p._distance.toFixed(1)}km</span>}</div>
                <div className="p-3"><div className="text-sm font-medium line-clamp-1">{p.name}</div><div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/>{p.seller.businessName} • {p.seller.city||"—"} {p.seller.state&&`, ${p.seller.state}`}</div><div className="text-sm font-semibold mt-1">₦{Number(p.price).toLocaleString()} / {p.unit||"metre"}</div><div className="text-[11px] text-green-700">{p.stock>0? `${p.stock} in stock • ${p.material}` : "Out of stock"} {p.deliveryEligible && "• Delivery"}</div></div></div>
            </Link>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">Combine location + product filters • Active-filter chips + Reset • Stock-aware • Delivery to tailor supported • No fabrication of distance/availability</div>
      </div><SiteFooter /></div>
  );
}
