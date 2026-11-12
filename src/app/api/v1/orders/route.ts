import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let where: any = {};
  if (role === "FABRIC_SELLER") {
    const seller: any = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return NextResponse.json({ items: [] });
    where.sellerId = seller.id;
  } else if (role === "CUSTOMER") {
    where.customerId = userId;
  } else if (role === "ADMIN") {
    // all
  } else {
    return NextResponse.json({ error: "Forbidden for role " + role }, { status: 403 });
  }
  if (status) where.status = status;

  const items = await prisma.fabricOrder.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, include: { items: true, seller: { select: { businessName: true, slug: true } } } });
  return NextResponse.json({ items });
}
