import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const where: any = { userId };
  if (unreadOnly) where.isRead = false;
  const items = await prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 });
  const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });
  return NextResponse.json({ items, unreadCount });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await req.json().catch(() => ({} as any));
  if (body.markAllRead) {
    await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return NextResponse.json({ ok: true });
  }
  if (body.id) {
    const n = await prisma.notification.findUnique({ where: { id: body.id } });
    if (!n || n.userId !== userId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    await prisma.notification.update({ where: { id: body.id }, data: { isRead: true } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id or markAllRead required" }, { status: 400 });
}
