import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function splitName(full: string) {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", middle: "", last: "" };
  if (parts.length === 1) return { first: parts[0], middle: "", last: "" };
  if (parts.length === 2) return { first: parts[0], middle: "", last: parts[1] };
  // 3+ : first, middle, rest as last
  return { first: parts[0], middle: parts.slice(1, -1).join(" "), last: parts[parts.length - 1] };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      tailorProfile: { select: { businessName: true, city: true, state: true, businessStatus: true, isPublished: true, slug: true } },
      sellerProfile: { select: { businessName: true, city: true, state: true, businessStatus: true, isPublished: true, slug: true } },
      customerProfile: { select: { bio: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { first, middle, last } = splitName(user.name || "");
  return NextResponse.json({ user: { ...user, firstName: first, middleName: middle, lastName: last } });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => ({}));
  const firstName = String(body.firstName || "").trim();
  const middleName = String(body.middleName || "").trim();
  const lastName = String(body.lastName || "").trim();
  const phone = body.phone !== undefined ? String(body.phone || "").trim() : undefined;

  // Validate
  if (!firstName && !lastName && !middleName) {
    // Allow partial update but require at least one name part if provided
  }

  // Reconstruct full name
  let newName: string | undefined;
  if (firstName || middleName || lastName) {
    const parts = [firstName, middleName, lastName].filter(Boolean);
    if (parts.length === 0) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }
    newName = parts.join(" ");
    if (newName.length > 80) return NextResponse.json({ error: "Name too long" }, { status: 400 });
  }

  if (phone !== undefined) {
    if (phone && !/^\+?[0-9\s\-()]{7,20}$/.test(phone)) {
      return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
    }
  }

  const updateData: any = {};
  if (newName) updateData.name = newName;
  if (phone !== undefined) updateData.phone = phone || null;

  // Do not allow role, status, verification etc changes

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const updated = await prisma.user.update({ where: { id: userId }, data: updateData });

  await prisma.auditLog.create({ data: { userId, action: "UPDATE_PROFILE", entity: "User", entityId: userId, metadata: updateData } });

  return NextResponse.json({ ok: true, user: updated });
}
