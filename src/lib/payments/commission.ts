export type CommissionRuleSnapshot = {
  rateBps: number;
  fixedFeeMinor: bigint;
  minimumCommissionMinor?: bigint | null;
  maximumCommissionMinor?: bigint | null;
};

export function computeTotalCommission(grossMinor: bigint, rule: CommissionRuleSnapshot): bigint {
  if (grossMinor < 0n) throw new Error("Gross amount cannot be negative");
  if (!Number.isInteger(rule.rateBps) || rule.rateBps < 0 || rule.rateBps > 10_000) throw new Error("Commission rate must be 0–10000 basis points");
  if (rule.fixedFeeMinor < 0n) throw new Error("Fixed fee cannot be negative");
  if (rule.minimumCommissionMinor != null && rule.minimumCommissionMinor < 0n) throw new Error("Minimum commission cannot be negative");
  if (rule.maximumCommissionMinor != null && rule.maximumCommissionMinor < 0n) throw new Error("Maximum commission cannot be negative");
  if (rule.minimumCommissionMinor != null && rule.maximumCommissionMinor != null && rule.minimumCommissionMinor > rule.maximumCommissionMinor) throw new Error("Minimum commission cannot exceed maximum commission");
  // Half-up rounding to the nearest kobo.
  let commission = (grossMinor * BigInt(rule.rateBps) + 5_000n) / 10_000n + rule.fixedFeeMinor;
  if (rule.minimumCommissionMinor != null && commission < rule.minimumCommissionMinor) commission = rule.minimumCommissionMinor;
  if (rule.maximumCommissionMinor != null && commission > rule.maximumCommissionMinor) commission = rule.maximumCommissionMinor;
  if (commission > grossMinor) throw new Error("Commission exceeds the transaction amount");
  return commission;
}

/** Allocate a quotation-level commission proportionally over confirmed instalments.
 * The final instalment receives the remaining kobo so the sum exactly equals the snapshot.
 */
export function allocateCommissionForInstalment({
  grossTotalMinor,
  commissionTotalMinor,
  paidBeforeMinor,
  currentPaymentMinor,
}: {
  grossTotalMinor: bigint;
  commissionTotalMinor: bigint;
  paidBeforeMinor: bigint;
  currentPaymentMinor: bigint;
}): bigint {
  if (grossTotalMinor <= 0n || commissionTotalMinor < 0n || commissionTotalMinor > grossTotalMinor || paidBeforeMinor < 0n || currentPaymentMinor <= 0n) throw new Error("Invalid instalment allocation");
  if (paidBeforeMinor + currentPaymentMinor > grossTotalMinor) throw new Error("Instalment exceeds outstanding obligation");
  const allocatedBefore = commissionTotalMinor * paidBeforeMinor / grossTotalMinor;
  const paidAfter = paidBeforeMinor + currentPaymentMinor;
  const allocatedAfter = paidAfter === grossTotalMinor ? commissionTotalMinor : commissionTotalMinor * paidAfter / grossTotalMinor;
  return allocatedAfter - allocatedBefore;
}

export function sellerAllocation(grossMinor: bigint, commissionMinor: bigint): bigint {
  if (grossMinor < 0n || commissionMinor < 0n || commissionMinor > grossMinor) throw new Error("Invalid seller allocation");
  return grossMinor - commissionMinor;
}
