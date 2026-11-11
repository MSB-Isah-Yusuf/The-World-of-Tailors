import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id:string }> }){
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"UNAUTHORIZED" }, { status:401 });
  const role = (session.user as any).role;
  if (role!=="TAILOR" && role!=="ADMIN") return NextResponse.json({ error:"FORBIDDEN" }, { status:403 });
  const { id } = await params;
  const body = await req.json();
  const values: {key:string; value:number; unit:string}[] = body.values || [];
  const unit = body.unit || "cm";
  const status = body.status || "COMPLETED";

  const mp = await prisma.measurementProfile.findUnique({ where:{ id }, include:{ tailorCustomer:true } });
  if (!mp) return NextResponse.json({ error:"NOT_FOUND" }, { status:404 });
  // ownership: tailorId must match current tailor, or user is owner
  const profileTailor = await prisma.tailorProfile.findUnique({ where:{ userId: (session.user as any).id } });
  if (profileTailor && mp.tailorId && mp.tailorId !== profileTailor.id) return NextResponse.json({ error:"FORBIDDEN" }, { status:403 });
  if (mp.tailorCustomerId) {
    const tc = await prisma.tailorCustomer.findUnique({ where:{ id: mp.tailorCustomerId } });
    if (tc && profileTailor && tc.tailorId !== profileTailor.id) return NextResponse.json({ error:"FORBIDDEN" }, { status:403 });
  }

  // validate values against definitions (min/max) where defined
  for (const v of values) {
    const def = await prisma.measurementDefinition.findUnique({ where:{ key:v.key } }).catch(()=>null);
    if (def?.min!=null && v.value < def.min) return NextResponse.json({ error:`${v.key} below min ${def.min}` },{ status:400 });
    if (def?.max!=null && v.value > def.max) return NextResponse.json({ error:`${v.key} above max ${def.max}` },{ status:400 });
    if (v.value<=0 || v.value>300) return NextResponse.json({ error:`Invalid ${v.key}: ${v.value}` },{ status:400 });
  }

  const prevJson = await prisma.measurementValue.findMany({ where:{ profileId:id } });
  // replace values atomically
  await prisma.measurementValue.deleteMany({ where:{ profileId:id } });
  for (const v of values) await prisma.measurementValue.create({ data:{ profileId:id, key:v.key, value:v.value, unit: v.unit||unit } });
  await prisma.measurementProfile.update({ where:{ id }, data:{ unit, status: status as any } });
  await prisma.measurementHistory.create({ data:{ profileId:id, changedBy:(session.user as any).id, fromJson: prevJson as any, toJson: values as any, note: body.note||"Mannequin update" } });
  await prisma.auditLog.create({ data:{ userId:(session.user as any).id, action:"UPDATE_MEASUREMENT", entity:"MeasurementProfile", entityId:id, metadata:{ count:values.length } } });
  // freeze snapshot on any linked booking if booking still REQUESTED/ACCEPTED
  if (mp.bookingId) {
    const booking = await prisma.tailoringBooking.findUnique({ where:{ id: mp.bookingId } });
    if (booking && ["REQUESTED","ACCEPTED"].includes(booking.status)) {
      const snapshot:Record<string,any>={};
      for (const v of values) snapshot[v.key]= { value:v.value, unit: v.unit||unit };
      snapshot._meta = { profileId:id, unit, garment: mp.garmentType };
      await prisma.tailoringBooking.update({ where:{ id: mp.bookingId }, data:{ measurementSnapshot: snapshot as any } });
    }
  }
  return NextResponse.json({ ok:true, count: values.length });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id:string }> }){
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error:"UNAUTHORIZED" }, { status:401 });
  const { id } = await params;
  const mp = await prisma.measurementProfile.findUnique({ where:{ id }, include:{ values:true, history:{ orderBy:{ createdAt:"desc" }, take:10 } } });
  if (!mp) return NextResponse.json({ error:"NOT_FOUND" }, { status:404 });
  return NextResponse.json(mp);
}
