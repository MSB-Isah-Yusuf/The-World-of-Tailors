import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { distanceKm } from "@/lib/location-data";

// GET /api/search?q=&type=tailor|fabric|design|all&state=&city=&lat=&lng=&distance=&page=&take=
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q")||"").trim().toLowerCase();
  const type = searchParams.get("type")||"all"; // all|tailor|fabric|design
  const state = searchParams.get("state")||"";
  const city = searchParams.get("city")||"";
  const lat = searchParams.get("lat")? Number(searchParams.get("lat")): undefined;
  const lng = searchParams.get("lng")? Number(searchParams.get("lng")): undefined;
  const distance = searchParams.get("distance")? Number(searchParams.get("distance")): 0;
  const page = Math.max(1, Number(searchParams.get("page")||1));
  const take = Math.min(50, Math.max(6, Number(searchParams.get("take")||12)));
  const skip = (page-1)*take;

  let tailors:any[]=[], fabrics:any[]=[], designs:any[]=[];
  const includeTailor = type==="all"||type==="tailor";
  const includeFabric = type==="all"||type==="fabric";
  const includeDesign = type==="all"||type==="design";

  try {
    if (includeTailor) {
      const where:any={ isPublished:true, businessStatus:"APPROVED" };
      if (state) where.state=state;
      if (city) where.city=city;
      let t = await prisma.tailorProfile.findMany({ where, take: 100, include:{ user:{ select:{ name:true } } }, orderBy:{ ratingAvg:"desc" } });
      if (q) t = t.filter((x:any)=> x.businessName.toLowerCase().includes(q) || (x.bio||"").toLowerCase().includes(q) || (x.city||"").toLowerCase().includes(q));
      if (lat!=null&&lng!=null) {
        t = t.map((x:any)=>({ ...x, _d: x.latitude&&x.longitude? distanceKm({lat,lng},{lat:x.latitude,lng:x.longitude}): null })).sort((a:any,b:any)=>{
          if (distance && a._d!=null && b._d!=null) return a._d-b._d;
          if (a._d!=null&&b._d!=null) return a._d-b._d;
          if (a._d!=null) return -1;
          return 0;
        });
        if (distance) t = t.filter((x:any)=> x._d==null || x._d<=distance);
      }
      tailors = t;
    }
    if (includeFabric) {
      const where:any={ isPublished:true };
      if (q) where.OR=[{ name:{ contains:q, mode:"insensitive"}},{ material:{ contains:q, mode:"insensitive"}},{ color:{ contains:q, mode:"insensitive"}}];
      let f = await prisma.fabricProduct.findMany({ where, include:{ seller:true, images:true }, take: 100, orderBy:{ createdAt:"desc"} });
      if (state||city) f = f.filter((p:any)=> (!state||p.seller?.state===state) && (!city||p.seller?.city===city));
      if (lat!=null&&lng!=null) {
        f = f.map((p:any)=>({ ...p, _d: p.seller?.latitude&&p.seller?.longitude? distanceKm({lat,lng},{lat:p.seller.latitude,lng:p.seller.longitude}): null })).sort((a:any,b:any)=> (a._d??9999)-(b._d??9999));
        if (distance) f = f.filter((p:any)=> p._d==null || p._d<=distance);
      }
      fabrics = f;
    }
    if (includeDesign) {
      let d = await prisma.design.findMany({ where:{ isPublished:true }, include:{ tailor:true, images:true }, take: 100, orderBy:{ createdAt:"desc"} });
      if (q) d = d.filter((x:any)=> x.title.toLowerCase().includes(q) || (x.description||"").toLowerCase().includes(q));
      if (state||city) d = d.filter((x:any)=> (!state||x.tailor?.state===state) && (!city||x.tailor?.city===city));
      designs = d;
    }
  } catch(e:any){ return NextResponse.json({ error: e.message }, { status:500 }); }

  // Paginate combined if all, else per-type pagination
  const paginate = (arr:any[])=> arr.slice(skip, skip+take);
  return NextResponse.json({
    query:{ q, type, state, city, lat, lng, distance, page, take },
    counts:{ tailors: tailors.length, fabrics: fabrics.length, designs: designs.length },
    results:{
      tailors: paginate(tailors).map((t:any)=>({ id:t.id, slug:t.slug, businessName:t.businessName, city:t.city, state:t.state, ratingAvg:t.ratingAvg, ratingCount:t.ratingCount, startingPrice:t.startingPrice, profileImage:t.profileImage, distance:t._d??null, type:"tailor"})),
      fabrics: paginate(fabrics).map((p:any)=>({ id:p.id, slug:p.slug, name:p.name, price:p.price, unit:p.unit, material:p.material, color:p.color, stock:p.stock, seller:{ businessName:p.seller?.businessName, city:p.seller?.city, slug:p.seller?.slug }, image: p.images?.[0]?.url, distance:p._d??null, type:"fabric"})),
      designs: paginate(designs).map((d:any)=>({ id:d.id, slug:d.slug, title:d.title, price:d.price, tailor:{ businessName:d.tailor?.businessName, city:d.tailor?.city, slug:d.tailor?.slug }, image: d.images?.[0]?.url, type:"design"})),
    },
    pagination:{ page, take, skip }
  });
}
