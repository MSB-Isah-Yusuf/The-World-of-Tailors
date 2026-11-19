import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function adminId(session: any): string | null {
  return session?.user && (session.user as any).role === "ADMIN" ? String((session.user as any).id || "") : null;
}
function parseMinor(value: unknown, field: string, optional = false): bigint | null {
  if ((value === undefined || value === null || value === "") && optional) return null;
  const text = String(value ?? "");
  if (!/^\d{1,18}$/.test(text)) throw new Error(`${field} must be a non-negative integer amount in minor units`);
  return BigInt(text);
}
function parseDate(value: unknown, field: string, fallback?: Date): Date {
  if (value == null || value === "") { if (fallback) return fallback; throw new Error(`${field} is required`); }
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) throw new Error(`${field} must be a valid date`);
  return date;
}
function serializeRule(rule: any) {
  return {
    ...rule,
    fixedFeeMinor: String(rule.fixedFeeMinor),
    minimumCommissionMinor: rule.minimumCommissionMinor == null ? null : String(rule.minimumCommissionMinor),
    maximumCommissionMinor: rule.maximumCommissionMinor == null ? null : String(rule.maximumCommissionMinor),
  };
}

async function ensureNoOverlap(tx: any, input: { category: string; currency: string; tailorProfileId: string | null; sellerProfileId: string | null; start: Date; end: Date | null }) {
  const scope = input.tailorProfileId ? { tailorProfileId: input.tailorProfileId, sellerProfileId: null } : input.sellerProfileId ? { sellerProfileId: input.sellerProfileId, tailorProfileId: null } : { tailorProfileId: null, sellerProfileId: null };
  const matches = await tx.commissionRule.findMany({ where: {
    category: input.category, currency: input.currency, active: true, ...scope,
    effectiveFrom: { lt: input.end || new Date("9999-12-31T00:00:00.000Z") },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.start } }],
  }, select: { id: true, effectiveFrom: true, effectiveTo: true } });
  if (matches.length) throw new Error("OVERLAPPING_ACTIVE_RULE");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!adminId(session)) return NextResponse.json({ error: "FORBIDDEN" }, { status: session?.user ? 403 : 401 });
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const rules = await prisma.commissionRule.findMany({
    where: category ? { category } : {},
    include: { tailorProfile: { select: { id: true, businessName: true } }, sellerProfile: { select: { id: true, businessName: true } }, createdBy: { select: { id: true, name: true } }, updatedBy: { select: { id: true, name: true } } },
    orderBy: [{ category: "asc" }, { effectiveFrom: "desc" }], take: 200,
  });
  return NextResponse.json({ items: rules.map(serializeRule) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const actorId = adminId(session);
  if (!actorId) return NextResponse.json({ error: "FORBIDDEN" }, { status: session?.user ? 403 : 401 });
  const body: any = await req.json().catch(() => ({}));
  try {
    const category = String(body.category || "").toUpperCase();
    if (!["TAILORING_SERVICE", "FABRIC_SALE"].includes(category)) throw new Error("category must be TAILORING_SERVICE or FABRIC_SALE");
    const commissionBase = String(body.commissionBase || "").toUpperCase();
    const allowedBases = category === "TAILORING_SERVICE" ? ["SERVICE_TOTAL"] : ["MERCHANDISE_SUBTOTAL", "ORDER_TOTAL"];
    if (!allowedBases.includes(commissionBase)) throw new Error(`commissionBase must be explicitly selected for ${category}`);
    const rateBps = Number(body.rateBps);
    if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10_000) throw new Error("rateBps must be an integer from 0 to 10000 (1000 = 10%)");
    const fixedFeeMinor = parseMinor(body.fixedFeeMinor ?? "0", "fixedFeeMinor")!;
    const minimumCommissionMinor = parseMinor(body.minimumCommissionMinor, "minimumCommissionMinor", true);
    const maximumCommissionMinor = parseMinor(body.maximumCommissionMinor, "maximumCommissionMinor", true);
    if (minimumCommissionMinor != null && maximumCommissionMinor != null && maximumCommissionMinor < minimumCommissionMinor) throw new Error("maximumCommissionMinor must be >= minimumCommissionMinor");
    const currency = String(body.currency || "NGN").toUpperCase();
    if (currency !== "NGN") throw new Error("Only NGN is currently enabled");
    const tailorProfileId = body.tailorProfileId ? String(body.tailorProfileId) : null;
    const sellerProfileId = body.sellerProfileId ? String(body.sellerProfileId) : null;
    if (tailorProfileId && sellerProfileId) throw new Error("Rule may target one seller type only");
    if (category === "TAILORING_SERVICE" && sellerProfileId) throw new Error("TAILORING_SERVICE override must use tailorProfileId");
    if (category === "FABRIC_SALE" && tailorProfileId) throw new Error("FABRIC_SALE override must use sellerProfileId");
    const effectiveFrom = parseDate(body.effectiveFrom, "effectiveFrom", new Date());
    const effectiveTo = body.effectiveTo ? parseDate(body.effectiveTo, "effectiveTo") : null;
    if (effectiveTo && effectiveTo <= effectiveFrom) throw new Error("effectiveTo must be later than effectiveFrom");
    const version = Number.isInteger(Number(body.version)) && Number(body.version) > 0 ? Number(body.version) : 1;

    const rule = await prisma.$transaction(async (tx: any) => {
      await ensureNoOverlap(tx, { category, currency, tailorProfileId, sellerProfileId, start: effectiveFrom, end: effectiveTo });
      if (tailorProfileId && !(await tx.tailorProfile.findUnique({ where: { id: tailorProfileId }, select: { id: true } }))) throw new Error("TAILOR_NOT_FOUND");
      if (sellerProfileId && !(await tx.sellerProfile.findUnique({ where: { id: sellerProfileId }, select: { id: true } }))) throw new Error("SELLER_NOT_FOUND");
      const created = await tx.commissionRule.create({ data: {
        category, commissionBase, rateBps, fixedFeeMinor, minimumCommissionMinor, maximumCommissionMinor, currency,
        effectiveFrom, effectiveTo, active: body.active !== false, version,
        tailorProfileId, sellerProfileId, createdById: actorId, updatedById: actorId,
      } });
      await tx.auditLog.create({ data: { userId: actorId, action: "CREATE_COMMISSION_RULE", entity: "CommissionRule", entityId: created.id, metadata: { category, commissionBase, rateBps, fixedFeeMinor: fixedFeeMinor.toString(), currency, effectiveFrom: effectiveFrom.toISOString(), effectiveTo: effectiveTo?.toISOString() || null, tailorProfileId, sellerProfileId } } });
      return created;
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 });
    return NextResponse.json({ ok: true, item: serializeRule(rule) }, { status: 201 });
  } catch (error: any) {
    const message = String(error?.message || "Unable to create commission rule");
    if (message.includes("OVERLAPPING_ACTIVE_RULE")) return NextResponse.json({ error: "OVERLAPPING_ACTIVE_RULE", message: "An active rule already covers part of this effective period." }, { status: 409 });
    return NextResponse.json({ error: message.slice(0, 220) }, { status: 400 });
  }
}
