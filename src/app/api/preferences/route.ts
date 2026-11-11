import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(){
  const session = await auth();
  if (!session?.user) return NextResponse.json({ theme:"SYSTEM", language:"EN" });
  const pref = await prisma.userPreference.findUnique({ where:{ userId: (session.user as any).id } });
  return NextResponse.json(pref || { theme:"SYSTEM", language:"EN" });
}
export async function PATCH(req:Request){
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok:true });
  const body = await req.json();
  const data:any={};
  if (body.theme) data.theme = body.theme;
  if (body.language) data.language = body.language;
  if (body.browsingState) data.browsingState = body.browsingState;
  if (body.browsingCity) data.browsingCity = body.browsingCity;
  if (body.browsingLat) data.browsingLat = body.browsingLat;
  if (body.browsingLng) data.browsingLng = body.browsingLng;
  await prisma.userPreference.upsert({ where:{ userId:(session.user as any).id }, update:data, create:{ userId:(session.user as any).id, ...data } });
  return NextResponse.json({ ok:true });
}
