import { assertBalancedJournal, type JournalLine } from "@/lib/payments/ledger";

type JournalInput = {
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  currency: string;
  description: string;
  entryType: string;
  lines: JournalLine[];
  paymentId?: string | null;
  payoutId?: string | null;
  refundId?: string | null;
  createdById?: string | null;
};

function assertExistingJournalMatches(existing: any, input: JournalInput): void {
  if (existing.sourceType !== input.sourceType || existing.sourceId !== input.sourceId
    || existing.currency !== input.currency || existing.description !== input.description
    || (existing.createdById ?? null) !== (input.createdById || null)) {
    throw new Error("Ledger idempotency key was reused with different journal metadata");
  }
  const entries = new Map<string, any>((existing.entries || []).map((entry: any) => [entry.idempotencyKey, entry]));
  if (entries.size !== input.lines.length) throw new Error("Ledger idempotency key was reused with a different number of entries");
  for (const [index, line] of input.lines.entries()) {
    const key = `${input.idempotencyKey}:${index + 1}`;
    const entry = entries.get(key);
    if (!entry || entry.accountCode !== line.accountCode || entry.entryType !== input.entryType
      || entry.debitMinor !== (line.debitMinor || 0n) || entry.creditMinor !== (line.creditMinor || 0n)
      || entry.currency !== input.currency || entry.description !== (line.description || input.description)
      || (entry.paymentId ?? null) !== (input.paymentId || null)
      || (entry.payoutId ?? null) !== (input.payoutId || null)
      || (entry.refundId ?? null) !== (input.refundId || null)
      || (entry.sellerPaymentProfileId ?? null) !== (line.sellerPaymentProfileId || null)) {
      throw new Error("Ledger idempotency key was reused with different journal entries");
    }
  }
}

export async function postJournalTx(tx: any, input: JournalInput) {
  assertBalancedJournal(input.lines, input.currency);
  const existing = await tx.financialJournal.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { entries: true } });
  if (existing) {
    assertExistingJournalMatches(existing, input);
    return existing;
  }
  return tx.financialJournal.create({
    data: {
      idempotencyKey: input.idempotencyKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      currency: input.currency,
      description: input.description,
      createdById: input.createdById || null,
      entries: {
        create: input.lines.map((line, index) => ({
          accountCode: line.accountCode,
          entryType: input.entryType,
          debitMinor: line.debitMinor || 0n,
          creditMinor: line.creditMinor || 0n,
          currency: input.currency,
          description: line.description || input.description,
          idempotencyKey: `${input.idempotencyKey}:${index + 1}`,
          paymentId: input.paymentId || null,
          payoutId: input.payoutId || null,
          refundId: input.refundId || null,
          sellerPaymentProfileId: line.sellerPaymentProfileId || null,
        })),
      },
    },
    include: { entries: true },
  });
}
