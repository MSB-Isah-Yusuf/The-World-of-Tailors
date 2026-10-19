import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request) {
  try {
    const tailors = await prisma.tailorProfile.findMany({ where: { isPublished: true }, include: { user: { select: { name: true, email: true } } }, take: 20 });
    return NextResponse.json({ data: tailors });
  } catch (e) {
    return NextResponse.json({ data: [], note: "DB not seeded — run npm run db:seed" });
  }
}
