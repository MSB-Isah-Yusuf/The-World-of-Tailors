import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
export async function GET(_req:Request, { params }: { params: Promise<{ id:string }> }){
  const session = await auth(); if(!session?.user) return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
  const { id }= await params;
  const mp: any = await prisma.measurementProfile.findUnique({ where:{ id }, include:{ values:true, tailorCustomer:true, user:{ select:{ name:true, email:true } } } });
  if(!mp) return NextResponse.json({error:"NOT_FOUND"},{status:404});
  return NextResponse.json({ profile: mp, exportedAt: new Date().toISOString() }, { headers:{ "Content-Disposition": `attachment; filename=measurement-${id}.json` } });
}
