import { prisma } from "@/lib/prisma";
import { computeTotalCommission } from "@/lib/payments/commission";
import { getProcessingFeePolicy, getSharedFeePlatformBps } from "@/lib/payments/config";

export type CommissionCategory = "TAILORING_SERVICE" | "FABRIC_SALE";

export async function getActiveCommissionRule({ category, tailorProfileId, sellerProfileId, currency = "NGN", at = new Date() }: {
  category: CommissionCategory; tailorProfileId?: string | null; sellerProfileId?: string | null; currency?: string; at?: Date;
}) {
  if ((category === "TAILORING_SERVICE" && !tailorProfileId) || (category === "FABRIC_SALE" && !sellerProfileId)) throw new Error("Seller identity is required to resolve commission");
  const common = { category, currency, active: true, effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] };
  const specificWhere = category === "TAILORING_SERVICE" ? { ...common, tailorProfileId, sellerProfileId: null } : { ...common, sellerProfileId, tailorProfileId: null };
  const globalWhere = { ...common, tailorProfileId: null, sellerProfileId: null };
  const specific = await prisma.commissionRule.findMany({ where: specificWhere, orderBy: { effectiveFrom: "desc" }, take: 2 });
  const global = specific.length ? [] : await prisma.commissionRule.findMany({ where: globalWhere, orderBy: { effectiveFrom: "desc" }, take: 2 });
  const matches = specific.length ? specific : global;
  if (matches.length > 1) throw new Error("Ambiguous active commission rules; admin must close overlapping rules before taking payment");
  if (!matches.length) throw new Error(`No active ${category} commission rule is configured`);
  const rule: any = matches[0];
  const base = String(rule.commissionBase || "").toUpperCase();
  const allowedBases = category === "TAILORING_SERVICE" ? ["SERVICE_TOTAL"] : ["MERCHANDISE_SUBTOTAL", "ORDER_TOTAL"];
  if (!allowedBases.includes(base)) throw new Error(`Active ${category} commission rule must explicitly select a supported commissionBase`);
  return rule;
}

export async function createPaymentObligationSnapshot({
  tx,
  customerId,
  type,
  category,
  totalMinor,
  commissionBaseMinor,
  currency,
  bookingId,
  orderGroupId,
  fabricOrderId,
  tailorProfileId,
  sellerProfileId,
  dueAt,
  expiresAt,
  acceptedAt,
}: {
  tx: any; customerId: string; type: string; category: CommissionCategory; totalMinor: bigint; commissionBaseMinor?: bigint; currency: string;
  bookingId?: string | null; orderGroupId?: string | null; fabricOrderId?: string | null;
  tailorProfileId?: string | null; sellerProfileId?: string | null; dueAt?: Date | null; expiresAt?: Date | null; acceptedAt?: Date | null;
}) {
  if (totalMinor <= 0n) throw new Error("Payment obligation amount must be positive");
  const rule = await getActiveCommissionRule({ category, tailorProfileId, sellerProfileId, currency });
  const commissionBase = String(rule.commissionBase).toUpperCase();
  const commissionBaseAmount = commissionBase === "MERCHANDISE_SUBTOTAL" ? commissionBaseMinor : totalMinor;
  if (commissionBaseAmount == null || commissionBaseAmount <= 0n || commissionBaseAmount > totalMinor) throw new Error("Commission base amount is missing or invalid for the selected rule");
  const commissionTotalMinor = computeTotalCommission(commissionBaseAmount, {
    rateBps: rule.rateBps,
    fixedFeeMinor: rule.fixedFeeMinor,
    minimumCommissionMinor: rule.minimumCommissionMinor,
    maximumCommissionMinor: rule.maximumCommissionMinor,
  });
  const feePolicy = getProcessingFeePolicy();
  const sharedFeePlatformBpsSnapshot = getSharedFeePlatformBps();
  const profile = tailorProfileId
    ? await tx.sellerPaymentProfile.findUnique({ where: { tailorProfileId }, select: { settlementPolicy: true } })
    : await tx.sellerPaymentProfile.findUnique({ where: { sellerProfileId }, select: { settlementPolicy: true } });
  return tx.paymentObligation.create({
    data: {
      customerId, type, totalMinor, paidMinor: 0n, outstandingMinor: totalMinor, currency, status: "UNPAID",
      bookingId: bookingId || null, orderGroupId: orderGroupId || null, fabricOrderId: fabricOrderId || null,
      dueAt: dueAt || null, expiresAt: expiresAt || null, acceptedAt: acceptedAt || null,
      commissionRuleId: rule.id, commissionBaseSnapshot: commissionBase, commissionBaseMinor: commissionBaseAmount,
      commissionRateBps: rule.rateBps, commissionFixedFeeMinor: rule.fixedFeeMinor,
      commissionMinimumMinorSnapshot: rule.minimumCommissionMinor, commissionMaximumMinorSnapshot: rule.maximumCommissionMinor,
      commissionTotalMinor, commissionPaidMinor: 0n, feePolicySnapshot: feePolicy, sharedFeePlatformBpsSnapshot,
      settlementPolicySnapshot: profile?.settlementPolicy || "DISABLED",
    },
  });
}
