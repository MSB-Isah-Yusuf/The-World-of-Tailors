import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, getPaymentRuntimeConfigMock } = vi.hoisted(() => ({
  prismaMock: {
    paymentAttempt: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  getPaymentRuntimeConfigMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/payments/config", () => ({ getPaymentRuntimeConfig: getPaymentRuntimeConfigMock }));

import { verifyAndSettlePayment } from "@/lib/payments/verify-and-settle";

function transactionMock() {
  const tx: any = {
    payment: { findUnique: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    paymentAttempt: { findUnique: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) => callback(tx));
  return tx;
}

beforeEach(() => vi.resetAllMocks());

describe("verified Paystack settlement guards", () => {
  it("locks a captured amount mismatch for review without posting payment or fulfilment", async () => {
    const payment: any = { id: "pay-1", status: "PENDING", amount: 10, amountMinor: 1_000n, currency: "NGN", obligationId: "obl-1" };
    const attempt: any = { id: "attempt-1", providerReference: "twt_ref_123", payment };
    prismaMock.paymentAttempt.findUnique.mockResolvedValue(attempt);
    const tx = transactionMock();
    tx.payment.findUnique.mockResolvedValue(payment);
    tx.paymentAttempt.findUnique.mockResolvedValue({ id: attempt.id, status: "AWAITING_CUSTOMER" });

    const result = await verifyAndSettlePayment({
      id: 77, reference: attempt.providerReference, status: "success", amount: 999, currency: "NGN",
    }, "webhook");

    expect(result).toMatchObject({ ok: false, code: "AMOUNT_MISMATCH", retryable: false });
    expect(tx.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "REVIEW_REQUIRED" } }));
    expect(tx.paymentAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REVIEW_REQUIRED", failureReason: "AMOUNT_MISMATCH" }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "PAYMENT_REQUIRES_FINANCIAL_REVIEW" }) }));
    expect(tx.paymentObligation).toBeUndefined();
    expect(tx.financialJournal).toBeUndefined();
  });

  it("treats the same provider capture on an already-paid payment as an idempotent duplicate", async () => {
    const payment: any = {
      id: "pay-2", status: "PAID", amount: 10, amountMinor: 1_000n, currency: "NGN",
      obligationId: "obl-2", providerRef: "98765", providerTransactionId: "98765",
      obligation: { customerId: "customer-2" },
    };
    const attempt: any = { id: "attempt-2", providerReference: "twt_ref_456", payment };
    prismaMock.paymentAttempt.findUnique.mockResolvedValue(attempt);
    prismaMock.user.findUnique.mockResolvedValue({ email: "buyer@example.com" });
    getPaymentRuntimeConfigMock.mockReturnValue({});
    const tx = transactionMock();
    tx.payment.findUnique.mockResolvedValue(payment);
    tx.paymentAttempt.findUnique.mockResolvedValue({ id: attempt.id, status: "SUCCESS", providerReference: attempt.providerReference });

    const result = await verifyAndSettlePayment({
      id: 98765, reference: attempt.providerReference, status: "success", amount: 1_000, currency: "NGN",
      customer: { email: "buyer@example.com" },
    }, "callback");

    expect(result).toMatchObject({ ok: true, duplicate: true, duplicateCapture: false, status: "PAID", paymentId: payment.id });
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
