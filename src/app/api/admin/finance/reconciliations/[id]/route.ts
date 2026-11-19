import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const item: any = await prisma.paymentReconciliation.findUnique({ where: { id }, include: { items: { orderBy: [{ recordType: "asc" }, { status: "asc" }, { reference: "asc" }], take: 5000 } } });
  if (!item) return NextResponse.json({ error: "RECONCILIATION_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ item: { ...item, internalTotalMinor: String(item.internalTotalMinor), providerTotalMinor: String(item.providerTotalMinor), discrepancyMinor: String(item.discrepancyMinor), items: item.items.map((row: any) => ({ ...row, amountMinor: String(row.amountMinor) })) } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const actorId = String((session.user as any).id || "");
  const { id } = await params;
  const body: any = await req.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();
  const notes = String(body.notes || "").trim().slice(0, 2000);
  if (!["REVIEWED", "ESCALATED"].includes(status) || !notes) return NextResponse.json({ error: "status must be REVIEWED or ESCALATED and notes are required" }, { status: 400 });
  try {
    const updated = await prisma.$transaction(async (tx: any) => {
      const existing = await tx.paymentReconciliation.findUnique({ where: { id }, include: { items: { select: { status: true } } } });
      if (!existing) throw new Error("RECONCILIATION_NOT_FOUND");
      const unresolved = existing.items.filter((row: any) => !["MATCHED_SUCCESS", "MATCHED_NON_SUCCESS"].includes(row.status)).length;
      const row = await tx.paymentReconciliation.update({ where: { id }, data: { status, notes: `${existing.notes || ""}\nAdmin ${status}: ${notes}`.slice(-4000), reviewedById: actorId, reviewedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: actorId, action: `ADMIN_RECONCILIATION_${status}`, entity: "PaymentReconciliation", entityId: id, metadata: { unresolvedItems: unresolved, notes } } });
      return row;
    });
    return NextResponse.json({ ok: true, item: { id: updated.id, status: updated.status, reviewedAt: updated.reviewedAt } });
  } catch (error: any) {
    const message = String(error?.message || "RECONCILIATION_UPDATE_FAILED");
    return NextResponse.json({ error: message }, { status: message === "RECONCILIATION_NOT_FOUND" ? 404 : 409 });
  }
}
