import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, prismaMock, configMock, paystackInitMock, releaseReservationsMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    payment: { findUnique: vi.fn(), findFirst: vi.fn() },
    fabricOrder: { findUnique: vi.fn() },
    fabricProduct: { findMany: vi.fn() },
    sellerPaymentProfile: { findUnique: vi.fn() },
    paymentAttempt: { create: vi.fn() },
  },
  configMock: vi.fn(),
  paystackInitMock: vi.fn(),
  releaseReservationsMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/paystack", () => ({ initializePaystackAmount: paystackInitMock }));
vi.mock("@/lib/payments/inventory", () => ({ releaseExpiredCheckoutReservations: releaseReservationsMock }));
vi.mock("@/lib/payments/config", () => ({
  assertCustomerPaymentsEnabled: vi.fn(),
  getPaymentRuntimeConfig: configMock,
  getFabricDeliveryFeeMinor: vi.fn(() => 250n),
  getProcessingFeePolicy: vi.fn(() => "PLATFORM"),
  getSharedFeePlatformBps: vi.fn(() => null),
  PaymentConfigurationError: class PaymentConfigurationError extends Error {},
}));

import { POST as initializePayment } from "@/app/api/paystack/initialize/route";
import { POST as createFabricCheckout } from "@/app/api/checkout/route";
import { GET as listAdminPayouts } from "@/app/api/admin/finance/payouts/route";

function initializeRequest(body: unknown = {}) {
  return new NextRequest("http://localhost/api/paystack/initialize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function checkoutRequest(body: unknown) {
  return new NextRequest("http://localhost/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  configMock.mockReturnValue({ defaultCurrency: "NGN" });
  releaseReservationsMock.mockResolvedValue(undefined);
});

describe("payment finance API authorization", () => {
  it("rejects unauthenticated checkout initialization", async () => {
    authMock.mockResolvedValue(null);
    const response = await initializePayment(initializeRequest());
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "UNAUTHORIZED" });
  });

  it("rejects non-customer payment initialization before reading payment data", async () => {
    authMock.mockResolvedValue({ user: { id: "tailor-1", role: "TAILOR" } });
    const response = await initializePayment(initializeRequest());
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "CUSTOMER_ONLY" });
    expect(configMock).not.toHaveBeenCalled();
  });

  it("rejects client-supplied amounts even for an authenticated customer", async () => {
    authMock.mockResolvedValue({ user: { id: "customer-1", role: "CUSTOMER" } });
    const response = await initializePayment(initializeRequest({ paymentId: "pay-1", amountMinor: "1" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("AMOUNT_NOT_ACCEPTED") });
  });

  it("rejects a non-NGN product before reserving inventory or constructing checkout payments", async () => {
    authMock.mockResolvedValue({ user: { id: "customer-1", role: "CUSTOMER" } });
    prismaMock.fabricProduct.findMany.mockResolvedValue([{
      id: "product-usd", name: "USD product", currency: "USD", isPublished: true,
      minOrderQty: 1, stock: 10, reserved: 0, price: 10, priceMinor: null,
      sellerId: "seller-1", seller: { businessStatus: "APPROVED" },
    }]);
    const response = await createFabricCheckout(checkoutRequest({
      items: [{ productId: "product-usd", quantity: 1 }],
      deliveryAddress: { street: "1 Sample Road", city: "Lagos", state: "Lagos" },
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "UNSUPPORTED_PRODUCT_CURRENCY" });
    expect(configMock).not.toHaveBeenCalled();
    expect(prismaMock.sellerPaymentProfile.findUnique).not.toHaveBeenCalled();
  });

  it("keeps an uncertain Paystack initialization locked to its original reference", async () => {
    authMock.mockResolvedValue({ user: { id: "customer-1", role: "CUSTOMER" } });
    configMock.mockReturnValue({ defaultCurrency: "NGN", immediateSplitEnabled: false, controlledPayoutsEnabled: true });
    const attempt = { id: "attempt-1", providerReference: "twt_uncertain_123", attemptNumber: 1, status: "INITIALIZATION_UNKNOWN", authorizationUrl: null };
    prismaMock.payment.findUnique.mockResolvedValue({
      id: "pay-1", status: "PENDING", amount: 10, amountMinor: 1_000n, currency: "NGN", obligationId: "obl-1",
      obligation: { id: "obl-1", customerId: "customer-1", status: "UNPAID", outstandingMinor: 1_000n, currency: "NGN", expiresAt: null, settlementPolicySnapshot: "CONTROLLED_PAYOUT", commissionTotalMinor: 0n, paidMinor: 0n, feePolicySnapshot: "PLATFORM" },
      booking: null, fabricOrder: { sellerId: "seller-1", seller: {} }, attempts: [attempt],
    });
    prismaMock.sellerPaymentProfile.findUnique.mockResolvedValue({
      settlementPolicy: "CONTROLLED_PAYOUT", verificationStatus: "VERIFIED", payoutEligible: true, suspendedAt: null,
      paystackTransferRecipientCode: "RCP_verified",
    });

    const response = await initializePayment(initializeRequest({ paymentId: "pay-1" }));
    const result = await response.json();
    expect(response.status).toBe(409);
    expect(result).toMatchObject({ error: "PAYMENT_INITIALIZATION_UNKNOWN", reference: attempt.providerReference });
    expect(result.message).toContain("do not start another payment");
    expect(prismaMock.paymentAttempt.create).not.toHaveBeenCalled();
    expect(paystackInitMock).not.toHaveBeenCalled();
  });

  it("keeps payout queue access administrator-only", async () => {
    authMock.mockResolvedValue({ user: { id: "seller-1", role: "FABRIC_SELLER" } });
    const response = await listAdminPayouts();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "FORBIDDEN" });
  });
});
