import { describe, expect, it, vi } from "vitest";
import { postJournalTx } from "@/lib/payments/ledger-db";

describe("database ledger posting", () => {
  it("returns the prior journal for a duplicate idempotency key", async () => {
    const existing = {
      id: "journal-1", idempotencyKey: "capture:pay-1", sourceType: "PAYMENT", sourceId: "pay-1",
      currency: "NGN", description: "Verified capture", createdById: null,
      entries: [
        { id: "entry-1", idempotencyKey: "capture:pay-1:1", accountCode: "PAYSTACK_CLEARING_RECEIVABLE", entryType: "PAYMENT_CAPTURE", debitMinor: 1_000n, creditMinor: 0n, currency: "NGN", description: "Verified capture", paymentId: "pay-1", payoutId: null, refundId: null, sellerPaymentProfileId: null },
        { id: "entry-2", idempotencyKey: "capture:pay-1:2", accountCode: "PLATFORM_COMMISSION_RECEIVABLE", entryType: "PAYMENT_CAPTURE", debitMinor: 0n, creditMinor: 1_000n, currency: "NGN", description: "Verified capture", paymentId: "pay-1", payoutId: null, refundId: null, sellerPaymentProfileId: null },
      ],
    };
    const tx = {
      financialJournal: {
        findUnique: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
    };
    const result = await postJournalTx(tx, {
      idempotencyKey: "capture:pay-1",
      sourceType: "PAYMENT",
      sourceId: "pay-1",
      currency: "NGN",
      description: "Verified capture",
      entryType: "PAYMENT_CAPTURE",
      lines: [
        { accountCode: "PAYSTACK_CLEARING_RECEIVABLE", debitMinor: 1_000n },
        { accountCode: "PLATFORM_COMMISSION_RECEIVABLE", creditMinor: 1_000n },
      ],
      paymentId: "pay-1",
    });
    expect(result).toBe(existing);
    expect(tx.financialJournal.create).not.toHaveBeenCalled();
  });

  it("fails closed when an idempotency key is reused for different entry amounts", async () => {
    const tx = {
      financialJournal: {
        findUnique: vi.fn().mockResolvedValue({
          sourceType: "PAYMENT", sourceId: "pay-1", currency: "NGN", description: "Verified capture", createdById: null,
          entries: [
            { idempotencyKey: "capture:pay-1:1", accountCode: "PAYSTACK_CLEARING_RECEIVABLE", entryType: "PAYMENT_CAPTURE", debitMinor: 1_000n, creditMinor: 0n, currency: "NGN", description: "Verified capture", paymentId: "pay-1", payoutId: null, refundId: null, sellerPaymentProfileId: null },
            { idempotencyKey: "capture:pay-1:2", accountCode: "PLATFORM_COMMISSION_RECEIVABLE", entryType: "PAYMENT_CAPTURE", debitMinor: 0n, creditMinor: 1_000n, currency: "NGN", description: "Verified capture", paymentId: "pay-1", payoutId: null, refundId: null, sellerPaymentProfileId: null },
          ],
        }),
        create: vi.fn(),
      },
    };
    await expect(postJournalTx(tx, {
      idempotencyKey: "capture:pay-1",
      sourceType: "PAYMENT",
      sourceId: "pay-1",
      currency: "NGN",
      description: "Verified capture",
      entryType: "PAYMENT_CAPTURE",
      lines: [
        { accountCode: "PAYSTACK_CLEARING_RECEIVABLE", debitMinor: 1_100n },
        { accountCode: "PLATFORM_COMMISSION_RECEIVABLE", creditMinor: 1_100n },
      ],
      paymentId: "pay-1",
    })).rejects.toThrow(/different journal entries/);
    expect(tx.financialJournal.create).not.toHaveBeenCalled();
  });

  it("persists a balanced journal and deterministic entry idempotency keys", async () => {
    const created = { id: "journal-2", entries: [] };
    const tx = {
      financialJournal: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const result = await postJournalTx(tx, {
      idempotencyKey: "capture:pay-2",
      sourceType: "PAYMENT",
      sourceId: "pay-2",
      currency: "NGN",
      description: "Verified capture",
      entryType: "PAYMENT_CAPTURE",
      lines: [
        { accountCode: "PAYSTACK_CLEARING_RECEIVABLE", debitMinor: 1_000n, description: "Collection" },
        { accountCode: "PLATFORM_COMMISSION_RECEIVABLE", creditMinor: 1_000n, description: "Commission" },
      ],
      paymentId: "pay-2",
    });
    expect(result).toBe(created);
    expect(tx.financialJournal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        idempotencyKey: "capture:pay-2",
        sourceType: "PAYMENT",
        sourceId: "pay-2",
        currency: "NGN",
        entries: {
          create: [
            expect.objectContaining({
              accountCode: "PAYSTACK_CLEARING_RECEIVABLE", entryType: "PAYMENT_CAPTURE",
              debitMinor: 1_000n, creditMinor: 0n, currency: "NGN",
              idempotencyKey: "capture:pay-2:1", paymentId: "pay-2",
            }),
            expect.objectContaining({
              accountCode: "PLATFORM_COMMISSION_RECEIVABLE", entryType: "PAYMENT_CAPTURE",
              debitMinor: 0n, creditMinor: 1_000n, currency: "NGN",
              idempotencyKey: "capture:pay-2:2", paymentId: "pay-2",
            }),
          ],
        },
      }),
      include: { entries: true },
    });
  });

  it("rejects invalid journals before touching the database", async () => {
    const tx = { financialJournal: { findUnique: vi.fn(), create: vi.fn() } };
    await expect(postJournalTx(tx, {
      idempotencyKey: "capture:bad",
      sourceType: "PAYMENT",
      sourceId: "pay-bad",
      currency: "NGN",
      description: "Invalid capture",
      entryType: "PAYMENT_CAPTURE",
      lines: [
        { accountCode: "PAYSTACK_CLEARING_RECEIVABLE", debitMinor: 1_000n },
        { accountCode: "PLATFORM_COMMISSION_RECEIVABLE", creditMinor: 999n },
      ],
    })).rejects.toThrow(/Unbalanced/);
    expect(tx.financialJournal.findUnique).not.toHaveBeenCalled();
    expect(tx.financialJournal.create).not.toHaveBeenCalled();
  });
});
