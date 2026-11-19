import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertCustomerPaymentsEnabled, getPaymentRuntimeConfig } from "@/lib/payments/config";
import { initializePaystackTransaction, PaystackApiError, verifyPaystackTransaction } from "@/lib/paystack";

const ENV_KEYS = [
  "NODE_ENV", "PAYMENT_ENVIRONMENT", "PAYMENT_TEST_MODE_ENABLED", "PAYMENT_LIVE_ENABLED", "PAYMENT_LIVE_APPROVED", "PAYMENT_FINANCIAL_FOUNDATION_APPROVED",
  "PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY", "PAYSTACK_BASE_URL", "PAYSTACK_CALLBACK_URL",
  "PAYMENT_DEFAULT_CURRENCY", "PAYMENT_PROCESSING_FEE_POLICY", "PAYMENT_SHARED_FEE_PLATFORM_BPS",
  "PAYMENT_IMMEDIATE_SPLIT_ENABLED", "PAYMENT_CONTROLLED_PAYOUTS_APPROVED", "PAYMENT_CONTROLLED_PAYOUTS_ENABLED",
  "PAYOUT_APPROVAL_MODE", "PAYSTACK_WEBHOOK_SIGNING_SECRET",
] as const;
const originalEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

function set(key: string, value: string) { Reflect.set(process.env, key, value); }

beforeEach(() => {
  vi.unstubAllGlobals();
  set("NODE_ENV", "test");
  set("PAYMENT_ENVIRONMENT", "test");
  set("PAYSTACK_SECRET_KEY", "sk_test_unit_secret");
  set("PAYSTACK_PUBLIC_KEY", "pk_test_unit_public");
  set("PAYSTACK_BASE_URL", "https://api.paystack.co");
  set("PAYSTACK_CALLBACK_URL", "http://localhost:3000/payments/return");
  set("PAYMENT_DEFAULT_CURRENCY", "NGN");
  for (const key of ENV_KEYS) {
    if (["NODE_ENV", "PAYMENT_ENVIRONMENT", "PAYSTACK_SECRET_KEY", "PAYSTACK_PUBLIC_KEY", "PAYSTACK_BASE_URL", "PAYSTACK_CALLBACK_URL", "PAYMENT_DEFAULT_CURRENCY"].includes(key)) continue;
    Reflect.deleteProperty(process.env, key);
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const [key, value] of originalEnv) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else Reflect.set(process.env, key, value);
  }
});

describe("Paystack environment gates", () => {
  it("enables test-mode requests in a non-production test environment only with test keys", () => {
    const config = getPaymentRuntimeConfig();
    expect(config).toMatchObject({
      environment: "test",
      providerMutationsEnabled: true,
      customerPaymentsEnabled: true,
      liveOperationsEnabled: false,
      controlledPayoutsEnabled: false,
      immediateSplitEnabled: false,
    });
    expect(() => assertCustomerPaymentsEnabled(config)).not.toThrow();
  });

  it("defaults production to disabled test mode, never to live", () => {
    set("NODE_ENV", "production");
    Reflect.deleteProperty(process.env, "PAYMENT_ENVIRONMENT");
    set("PAYSTACK_CALLBACK_URL", "https://staging.example.test/payments/return");
    const config = getPaymentRuntimeConfig();
    expect(config).toMatchObject({ environment: "test", providerMutationsEnabled: false, customerPaymentsEnabled: false, liveOperationsEnabled: false });
  });

  it("keeps production customer payments disabled when live approvals are absent", () => {
    set("NODE_ENV", "production");
    set("PAYMENT_ENVIRONMENT", "live");
    set("PAYSTACK_SECRET_KEY", "sk_live_unit_secret");
    set("PAYSTACK_PUBLIC_KEY", "pk_live_unit_public");
    set("PAYSTACK_CALLBACK_URL", "https://marketplace.example.test/payments/return");
    const config = getPaymentRuntimeConfig();
    expect(config).toMatchObject({ providerMutationsEnabled: false, customerPaymentsEnabled: false, liveOperationsEnabled: false });
    expect(() => assertCustomerPaymentsEnabled(config)).toThrow(/Live customer payments are disabled/);
  });

  it("requires accepted foundations, two live approvals, and production mode before live customer payments can initialize", () => {
    set("NODE_ENV", "production");
    set("PAYMENT_ENVIRONMENT", "live");
    set("PAYSTACK_SECRET_KEY", "sk_live_unit_secret");
    set("PAYSTACK_PUBLIC_KEY", "pk_live_unit_public");
    set("PAYSTACK_CALLBACK_URL", "https://marketplace.example.test/payments/return");
    set("PAYMENT_LIVE_ENABLED", "true");
    expect(getPaymentRuntimeConfig().customerPaymentsEnabled).toBe(false);
    set("PAYMENT_LIVE_APPROVED", "true");
    expect(getPaymentRuntimeConfig()).toMatchObject({ providerMutationsEnabled: false, customerPaymentsEnabled: false, liveOperationsEnabled: false, financialFoundationApproved: false });
    set("PAYMENT_FINANCIAL_FOUNDATION_APPROVED", "true");
    expect(getPaymentRuntimeConfig()).toMatchObject({ providerMutationsEnabled: true, customerPaymentsEnabled: true, liveOperationsEnabled: true, financialFoundationApproved: true });
  });

  it("rejects local HTTP callbacks in production, even when using test keys", () => {
    set("NODE_ENV", "production");
    set("PAYMENT_ENVIRONMENT", "test");
    expect(() => getPaymentRuntimeConfig()).toThrow(/must use HTTPS/);
  });

  it("requires a separate explicit flag for test-mode provider mutations in production", () => {
    set("NODE_ENV", "production");
    set("PAYMENT_ENVIRONMENT", "test");
    set("PAYSTACK_CALLBACK_URL", "https://staging.example.test/payments/return");
    const config = getPaymentRuntimeConfig();
    expect(config.customerPaymentsEnabled).toBe(false);
    expect(() => assertCustomerPaymentsEnabled(config)).toThrow(/test-mode customer payments are disabled/);
    set("PAYMENT_TEST_MODE_ENABLED", "true");
    expect(getPaymentRuntimeConfig().customerPaymentsEnabled).toBe(true);
  });

  it("never enables live provider mutations outside production, even if flags are set", () => {
    set("PAYMENT_ENVIRONMENT", "live");
    set("PAYSTACK_SECRET_KEY", "sk_live_unit_secret");
    set("PAYSTACK_PUBLIC_KEY", "pk_live_unit_public");
    set("PAYSTACK_CALLBACK_URL", "https://marketplace.example.test/payments/return");
    set("PAYMENT_LIVE_ENABLED", "true");
    set("PAYMENT_LIVE_APPROVED", "true");
    set("PAYMENT_FINANCIAL_FOUNDATION_APPROVED", "true");
    expect(getPaymentRuntimeConfig()).toMatchObject({ providerMutationsEnabled: false, customerPaymentsEnabled: false, liveOperationsEnabled: false });
  });
});

describe("Paystack test-mode HTTP contract", () => {
  it("initializes an exact server-supplied kobo amount with the test key and immutable reference", async () => {
    const reference = "twt_test_ref_12345";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      status: true,
      data: { authorization_url: "https://checkout.paystack.com/test", access_code: "test-access", reference },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await initializePaystackTransaction({
      email: "buyer@example.test", amountKobo: 12_345, reference, currency: "NGN", metadata: { paymentId: "pay-test-1" },
    });

    expect(result).toMatchObject({ reference, access_code: "test-access" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_unit_secret");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      email: "buyer@example.test", amount: 12_345, currency: "NGN", reference,
      callback_url: "http://localhost:3000/payments/return", metadata: { paymentId: "pay-test-1" },
    });
  });

  it("verifies a test transaction by the same provider reference", async () => {
    const transaction = { id: 123, reference: "twt_test_ref_verify", status: "success", amount: 12_345, currency: "NGN" };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: true, data: transaction }), {
      status: 200, headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(verifyPaystackTransaction(transaction.reference)).resolves.toMatchObject(transaction);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://api.paystack.co/transaction/verify/${transaction.reference}`);
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_unit_secret");
  });

  it("refuses a production test-mode charge before fetch unless the test-only flag is set", async () => {
    set("NODE_ENV", "production");
    set("PAYMENT_ENVIRONMENT", "test");
    set("PAYSTACK_CALLBACK_URL", "https://staging.example.test/payments/return");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(initializePaystackTransaction({ email: "buyer@example.test", amountKobo: 12_345, reference: "twt_test_prod_1234" }))
      .rejects.toThrow(/test-mode customer payments are disabled/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a live charge before fetch when explicit production approvals are missing", async () => {
    set("NODE_ENV", "production");
    set("PAYMENT_ENVIRONMENT", "live");
    set("PAYSTACK_SECRET_KEY", "sk_live_unit_secret");
    set("PAYSTACK_PUBLIC_KEY", "pk_live_unit_public");
    set("PAYSTACK_CALLBACK_URL", "https://marketplace.example.test/payments/return");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(initializePaystackTransaction({ email: "buyer@example.test", amountKobo: 12_345, reference: "twt_live_ref_1234" }))
      .rejects.toThrow(/Live customer payments are disabled/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces provider HTTP errors without retrying the create request", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: false, message: "Invalid test account" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(initializePaystackTransaction({ email: "buyer@example.test", amountKobo: 12_345, reference: "twt_test_ref_error" }))
      .rejects.toBeInstanceOf(PaystackApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
