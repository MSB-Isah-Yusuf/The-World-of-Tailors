import { describe, expect, it } from "vitest";
import { toMinorUnits, minorToMajorString, quantityToTenThousandths, multiplyMinorByQuantity, toPaystackAmount } from "@/lib/payments/money";
import { allocateCommissionForInstalment, computeTotalCommission, sellerAllocation } from "@/lib/payments/commission";
import { assertBalancedJournal, paymentJournalLines } from "@/lib/payments/ledger";

describe("NGN minor-unit arithmetic", () => {
  it("converts decimal inputs without binary floating-point accumulation", () => {
    expect(toMinorUnits("125.50")).toBe(12_550n);
    expect(toMinorUnits("1.005")).toBe(101n);
    expect(minorToMajorString(12_550n)).toBe("125.50");
  });

  it("rejects invalid monetary values and unsafe Paystack amounts", () => {
    expect(() => toMinorUnits(Number.NaN)).toThrow();
    expect(() => toMinorUnits("1,000.00")).toThrow();
    expect(() => toPaystackAmount(0n)).toThrow();
    expect(() => toPaystackAmount(BigInt(Number.MAX_SAFE_INTEGER) + 1n)).toThrow();
    expect(toPaystackAmount(10_001n)).toBe(10_001);
  });

  it("uses fixed-point fabric quantities and rounds each line to a kobo", () => {
    const quantity = quantityToTenThousandths("2.3456");
    expect(quantity).toBe(23_456n);
    expect(multiplyMinorByQuantity(1_250n, quantity)).toBe(2_932n);
    expect(() => quantityToTenThousandths("0")).toThrow();
  });
});

describe("Immutable commission snapshots", () => {
  it("computes a bounded rate-plus-fixed commission in integer kobo", () => {
    expect(computeTotalCommission(100_000n, { rateBps: 750, fixedFeeMinor: 250n })).toBe(7_750n);
    expect(computeTotalCommission(100_000n, { rateBps: 1_000, fixedFeeMinor: 0n, minimumCommissionMinor: 15_000n })).toBe(15_000n);
    expect(computeTotalCommission(100_000n, { rateBps: 2_000, fixedFeeMinor: 0n, maximumCommissionMinor: 12_000n })).toBe(12_000n);
    expect(() => computeTotalCommission(100n, { rateBps: 10_001, fixedFeeMinor: 0n })).toThrow();
    expect(() => computeTotalCommission(100n, { rateBps: 10_000, fixedFeeMinor: 1n })).toThrow();
    expect(() => computeTotalCommission(100n, { rateBps: 0, fixedFeeMinor: 0n, maximumCommissionMinor: -1n })).toThrow(/Maximum commission/);
    expect(() => computeTotalCommission(100n, { rateBps: 0, fixedFeeMinor: 0n, minimumCommissionMinor: 20n, maximumCommissionMinor: 10n })).toThrow(/cannot exceed maximum/);
  });

  it("allocates a fixed commission once across instalments and reconciles the final remainder", () => {
    const parts = [3_333n, 3_333n, 3_334n];
    let paid = 0n;
    const commissions = parts.map((current) => {
      const commission = allocateCommissionForInstalment({ grossTotalMinor: 10_000n, commissionTotalMinor: 1_001n, paidBeforeMinor: paid, currentPaymentMinor: current });
      paid += current;
      return commission;
    });
    expect(commissions.reduce((sum, value) => sum + value, 0n)).toBe(1_001n);
    expect(sellerAllocation(10_000n, 1_001n)).toBe(8_999n);
    expect(() => allocateCommissionForInstalment({ grossTotalMinor: 10_000n, commissionTotalMinor: 1_000n, paidBeforeMinor: 9_000n, currentPaymentMinor: 1_001n })).toThrow();
  });
});

describe("Double-entry journal invariants", () => {
  it("balances a verified payment between clearing, seller allocation, and commission", () => {
    const lines = paymentJournalLines({ grossMinor: 10_000n, commissionMinor: 1_000n, sellerMinor: 9_000n, sellerAccountCode: "SELLER_EARNINGS_PENDING", sellerPaymentProfileId: "profile-1" });
    expect(() => assertBalancedJournal(lines, "NGN")).not.toThrow();
  });

  it("rejects unbalanced, empty, negative, and non-NGN-code journals", () => {
    expect(() => assertBalancedJournal([
      { accountCode: "A", debitMinor: 100n },
      { accountCode: "B", creditMinor: 99n },
    ], "NGN")).toThrow(/Unbalanced/);
    expect(() => assertBalancedJournal([{ accountCode: "A", debitMinor: 0n }], "NGN")).toThrow();
    expect(() => assertBalancedJournal([
      { accountCode: "A", debitMinor: -1n },
      { accountCode: "B", creditMinor: 1n },
    ], "NGN")).toThrow();
    expect(() => assertBalancedJournal([
      { accountCode: "A", debitMinor: 1n },
      { accountCode: "B", creditMinor: 1n },
    ], "N1G")).toThrow();
  });
});
