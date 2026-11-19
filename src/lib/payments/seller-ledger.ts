import { postJournalTx } from "@/lib/payments/ledger-db";

export type SellerLedgerSnapshot = {
  currency: string;
  fulfilmentPendingMinor: bigint;
  payableMinor: bigint;
  processingMinor: bigint;
  providerSplitAllocatedUnreconciledMinor: bigint;
  paidOutMinor: bigint;
};

const TRACKED_ACCOUNTS = [
  "SELLER_EARNINGS_PENDING",
  "SELLER_PAYABLE",
  "SELLER_PAYOUTS_PROCESSING",
  "SELLER_SPLIT_SETTLEMENT_PENDING",
] as const;

function balanceOf(entries: Array<{ accountCode: string; debitMinor: bigint; creditMinor: bigint }>, code: string): bigint {
  return entries.reduce((balance, entry) => entry.accountCode === code ? balance + BigInt(entry.creditMinor) - BigInt(entry.debitMinor) : balance, 0n);
}

/** Balances here are ledger balances only; they are not claims that provider-held cash is segregated or escrowed. */
export async function getSellerLedgerSnapshot(db: any, sellerPaymentProfileId: string, currency = "NGN"): Promise<SellerLedgerSnapshot> {
  const [entries, successfulPayouts] = await Promise.all([
    db.financialLedgerEntry.findMany({
      where: { sellerPaymentProfileId, currency, accountCode: { in: [...TRACKED_ACCOUNTS] } },
      select: { accountCode: true, debitMinor: true, creditMinor: true },
    }),
    db.payout.findMany({ where: { sellerPaymentProfileId, currency, status: "SUCCESS" }, select: { amountMinor: true } }),
  ]);
  return {
    currency,
    fulfilmentPendingMinor: balanceOf(entries, "SELLER_EARNINGS_PENDING"),
    payableMinor: balanceOf(entries, "SELLER_PAYABLE"),
    processingMinor: balanceOf(entries, "SELLER_PAYOUTS_PROCESSING"),
    providerSplitAllocatedUnreconciledMinor: balanceOf(entries, "SELLER_SPLIT_SETTLEMENT_PENDING"),
    paidOutMinor: successfulPayouts.reduce((total: bigint, payout: any) => total + BigInt(payout.amountMinor), 0n),
  };
}

export async function releaseSellerEarningsAfterCustomerConfirmation(tx: any, input: {
  sellerPaymentProfileId: string;
  paymentIds: string[];
  currency: string;
  sourceType: "FABRIC_ORDER" | "TAILORING_BOOKING";
  sourceId: string;
  createdById: string;
}) {
  if (!input.paymentIds.length) throw new Error("FULFILMENT_HAS_NO_PAID_TRANSACTIONS");
  const idempotencyKey = `fulfilment-release:${input.sourceType}:${input.sourceId}`;
  const existing = await tx.financialJournal.findUnique({ where: { idempotencyKey } });
  if (existing) return { releasedMinor: 0n, alreadyReleased: true };
  const entries = await tx.financialLedgerEntry.findMany({
    where: { sellerPaymentProfileId: input.sellerPaymentProfileId, paymentId: { in: input.paymentIds }, accountCode: "SELLER_EARNINGS_PENDING", currency: input.currency },
    select: { debitMinor: true, creditMinor: true },
  });
  const amountMinor = entries.reduce((amount: bigint, entry: any) => amount + BigInt(entry.creditMinor) - BigInt(entry.debitMinor), 0n);
  if (amountMinor < 0n) throw new Error("SELLER_EARNINGS_LEDGER_NEGATIVE");
  if (amountMinor === 0n) return { releasedMinor: 0n, alreadyReleased: false };
  await postJournalTx(tx, {
    idempotencyKey, sourceType: "FULFILMENT_RELEASE", sourceId: input.sourceId, currency: input.currency,
    description: `Release seller earnings after customer-confirmed ${input.sourceType.toLowerCase().replace("_", " ")}`,
    entryType: "FULFILMENT_RELEASE", createdById: input.createdById,
    lines: [
      { accountCode: "SELLER_EARNINGS_PENDING", debitMinor: amountMinor, description: "Release confirmed seller earnings from fulfilment pending", sellerPaymentProfileId: input.sellerPaymentProfileId },
      { accountCode: "SELLER_PAYABLE", creditMinor: amountMinor, description: "Customer-confirmed seller earnings; payout remains subject to separate approval", sellerPaymentProfileId: input.sellerPaymentProfileId },
    ],
  });
  return { releasedMinor: amountMinor, alreadyReleased: false };
}

export async function getSellerLedgerBalanceInTransaction(tx: any, sellerPaymentProfileId: string, accountCode: "SELLER_EARNINGS_PENDING" | "SELLER_PAYABLE" | "SELLER_PAYOUTS_PROCESSING", currency = "NGN") {
  const entries = await tx.financialLedgerEntry.findMany({ where: { sellerPaymentProfileId, accountCode, currency }, select: { debitMinor: true, creditMinor: true } });
  return entries.reduce((balance: bigint, entry: any) => balance + BigInt(entry.creditMinor) - BigInt(entry.debitMinor), 0n);
}
