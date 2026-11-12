import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/v1/bookings — list own bookings (customer or tailor, RBAC)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let where: any = {};
  if (role === "TAILOR") {
    const profile: any = await prisma.tailorProfile.findUnique({ where: { userId } });
    if (!profile) return NextResponse.json({ items: [] });
    where.tailorId = profile.id;
  } else if (role === "CUSTOMER") {
    where.customerId = userId;
  } else if (role === "ADMIN") {
    // admin can see all, optionally filtered
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (status) where.status = status;

  const items = await prisma.tailoringBooking.findMany({ where, orderBy: { updatedAt: "desc" }, take: 50, include: { tailor: { select: { businessName: true, slug: true } }, design: { select: { title: true, slug: true } } } });
  return NextResponse.json({ items });
}
