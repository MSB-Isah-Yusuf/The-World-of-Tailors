import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export async function POST(req:Request, { params }: { params: Promise<{ id:string }> }){
  const session = await auth(); if(!session?.user) return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
  const { id }= await params; const body= await req.json().catch(()=>({}));
  const mp = await prisma.measurementProfile.findUnique({ where:{ id }, include:{ values:true } });
  if(!mp) return NextResponse.json({error:"NOT_FOUND"},{status:404});
  const copy = await prisma.measurementProfile.create({ data:{ userId: mp.userId, tailorId: mp.tailorId, tailorCustomerId: mp.tailorCustomerId, name: String(body.name|| mp.name+" (copy)"), garmentType: mp.garmentType, bodyTemplate: mp.bodyTemplate, unit: mp.unit, status: mp.status, notes: mp.notes } });
  for(const v of mp.values) await prisma.measurementValue.create({ data:{ profileId: copy.id, key:v.key, value:v.value, unit:v.unit } });
  return NextResponse.json({ ok:true, id: copy.id });
}
