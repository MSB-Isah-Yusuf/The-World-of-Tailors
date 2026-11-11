import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export async function GET(){
  const session= await auth(); if(!session?.user) return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  return NextResponse.json({ profile });
}
export async function PATCH(req:Request){
  const session= await auth(); if(!session?.user) return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
  const body= await req.json();
  const data:any={}; if(body.state) data.state=body.state; if(body.city) data.city=body.city; if(body.country) data.country=body.country; if(body.address) data.address=body.address; if(body.lat) data.latitude=Number(body.lat); if(body.lng) data.longitude=Number(body.lng);
  if(data.latitude && (data.latitude<-90||data.latitude>90||data.longitude<-180||data.longitude>180)) return NextResponse.json({error:"Invalid lat/lng"},{status:400});
  const profile= await prisma.sellerProfile.update({ where:{ userId:(session.user as any).id }, data });
  await prisma.auditLog.create({ data:{ userId:(session.user as any).id, action:"UPDATE_SELLER_LOCATION", entity:"SellerProfile", entityId:profile.id, metadata:{ city:data.city } } });
  return NextResponse.json({ ok:true, profile });
}
