export type JournalLine = {
  accountCode: string;
  debitMinor?: bigint;
  creditMinor?: bigint;
  description?: string;
  sellerPaymentProfileId?: string | null;
};

export function assertBalancedJournal(lines: JournalLine[], currency: string): void {
  if (lines.length < 2) throw new Error("A journal requires at least two ledger lines");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid journal currency");
  let debit = 0n;
  let credit = 0n;
  for (const line of lines) {
    if (!line.accountCode.trim()) throw new Error("Ledger account code is required");
    const d = line.debitMinor ?? 0n;
    const c = line.creditMinor ?? 0n;
    if (d < 0n || c < 0n || (d > 0n && c > 0n)) throw new Error("Each ledger line must have one non-negative debit or credit");
    if (d === 0n && c === 0n) throw new Error("Empty ledger line");
    debit += d;
    credit += c;
  }
  if (debit !== credit) throw new Error(`Unbalanced journal: debits ${debit}, credits ${credit}`);
}

export function paymentJournalLines({ grossMinor, commissionMinor, sellerMinor, sellerAccountCode, sellerPaymentProfileId }: { grossMinor: bigint; commissionMinor: bigint; sellerMinor: bigint; sellerAccountCode: string; sellerPaymentProfileId: string }): JournalLine[] {
  if (grossMinor <= 0n || commissionMinor < 0n || sellerMinor < 0n || commissionMinor + sellerMinor !== grossMinor) throw new Error("Payment allocations must equal gross amount");
  if (!["SELLER_EARNINGS_PENDING", "SELLER_SPLIT_SETTLEMENT_PENDING"].includes(sellerAccountCode)) throw new Error("Invalid seller liability/settlement account");
  return [
    { accountCode: "PAYSTACK_CLEARING_RECEIVABLE", debitMinor: grossMinor, description: "Verified customer collection receivable" },
    ...(sellerMinor > 0n ? [{ accountCode: sellerAccountCode, creditMinor: sellerMinor, description: sellerAccountCode === "SELLER_EARNINGS_PENDING" ? "Seller earnings awaiting contracted fulfilment release" : "Seller allocation routed to Paystack subaccount; provider settlement reconciliation pending", sellerPaymentProfileId }] : []),
    ...(commissionMinor > 0n ? [{ accountCode: "PLATFORM_COMMISSION_RECEIVABLE", creditMinor: commissionMinor, description: "Commission allocation; distinct from cash settlement" }] : []),
  ];
}
