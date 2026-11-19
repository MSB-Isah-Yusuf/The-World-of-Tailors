import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const actorId = String((session.user as any).id || "");
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const body: any = await req.json().catch(() => ({}));
  const forbidden = ["commissionBase", "rateBps", "fixedFeeMinor", "minimumCommissionMinor", "maximumCommissionMinor", "category", "currency", "tailorProfileId", "sellerProfileId", "effectiveFrom"];
  if (forbidden.some((key) => body[key] !== undefined)) return NextResponse.json({ error: "COMMISSION_RULES_IMMUTABLE", message: "Create a new future-effective rule; do not rewrite the rate snapshot history." }, { status: 400 });
  const rule = await prisma.commissionRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const effectiveTo = body.effectiveTo === undefined ? rule.effectiveTo : body.effectiveTo === null ? null : new Date(String(body.effectiveTo));
  if (effectiveTo && (!Number.isFinite(effectiveTo.getTime()) || effectiveTo <= rule.effectiveFrom)) return NextResponse.json({ error: "Invalid effectiveTo" }, { status: 400 });
  const active = body.active === undefined ? rule.active : Boolean(body.active);
  try {
    const updated = await prisma.$transaction(async (tx: any) => {
      const row = await tx.commissionRule.update({ where: { id }, data: { active, effectiveTo, updatedById: actorId } });
      await tx.auditLog.create({ data: { userId: actorId, action: "CLOSE_COMMISSION_RULE", entity: "CommissionRule", entityId: id, metadata: { previousActive: rule.active, active, previousEffectiveTo: rule.effectiveTo?.toISOString() || null, effectiveTo: effectiveTo?.toISOString() || null } } });
      return row;
    });
    return NextResponse.json({ ok: true, item: { ...updated, fixedFeeMinor: String(updated.fixedFeeMinor), minimumCommissionMinor: updated.minimumCommissionMinor == null ? null : String(updated.minimumCommissionMinor), maximumCommissionMinor: updated.maximumCommissionMinor == null ? null : String(updated.maximumCommissionMinor) } });
  } catch {
    return NextResponse.json({ error: "COMMISSION_RULE_UPDATE_FAILED" }, { status: 409 });
  }
}
