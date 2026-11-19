export type PaymentEnvironment = "test" | "live";
export type ProcessingFeePolicy = "PLATFORM" | "SELLER" | "SHARED";
export type PayoutApprovalMode = "MANUAL" | "AUTOMATIC";

export type PaymentRuntimeConfig = {
  environment: PaymentEnvironment;
  defaultCurrency: "NGN";
  baseUrl: string;
  callbackUrl: string;
  processingFeePolicy: ProcessingFeePolicy;
  payoutApprovalMode: PayoutApprovalMode;
  providerMutationsEnabled: boolean;
  customerPaymentsEnabled: boolean;
  financialFoundationApproved: boolean;
  liveOperationsEnabled: boolean;
  immediateSplitEnabled: boolean;
  controlledPayoutsEnabled: boolean;
  sharedFeePlatformBps?: number;
  secretKey: string;
  publicKey?: string;
  webhookSigningSecret?: string;
};

export class PaymentConfigurationError extends Error {
  readonly code = "PAYMENT_CONFIGURATION_ERROR";
  constructor(message: string) { super(message); this.name = "PaymentConfigurationError"; }
}

function isTrue(value: string | undefined): boolean { return value === "true" || value === "1"; }

export function getFabricDeliveryFeeMinor(): bigint {
  const value = (process.env.PAYMENT_FABRIC_DELIVERY_FEE_MINOR || "").trim();
  if (!/^\d{1,15}$/.test(value)) throw new PaymentConfigurationError("PAYMENT_FABRIC_DELIVERY_FEE_MINOR must be explicitly configured in integer kobo before fabric checkout");
  const amount = BigInt(value);
  if (amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new PaymentConfigurationError("Fabric delivery fee exceeds the supported safe amount range");
  return amount;
}

export function getProcessingFeePolicy(): ProcessingFeePolicy {
  const value = (process.env.PAYMENT_PROCESSING_FEE_POLICY || "PLATFORM").toUpperCase() as ProcessingFeePolicy;
  if (!["PLATFORM", "SELLER", "SHARED"].includes(value)) throw new PaymentConfigurationError("Invalid PAYMENT_PROCESSING_FEE_POLICY");
  return value;
}

export function getSharedFeePlatformBps(): number | null {
  if (getProcessingFeePolicy() !== "SHARED") return null;
  const bps = Number(process.env.PAYMENT_SHARED_FEE_PLATFORM_BPS);
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new PaymentConfigurationError("SHARED fee allocation requires PAYMENT_SHARED_FEE_PLATFORM_BPS between 0 and 10000");
  return bps;
}

export function getPaymentRuntimeConfig(): PaymentRuntimeConfig {
  const nodeEnv = process.env.NODE_ENV;
  // Fail closed into test configuration everywhere; live mode must be explicitly selected.
  const environment = (process.env.PAYMENT_ENVIRONMENT || "test").toLowerCase();
  if (environment !== "test" && environment !== "live") throw new PaymentConfigurationError("PAYMENT_ENVIRONMENT must be test or live");

  const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
  const publicKey = (process.env.PAYSTACK_PUBLIC_KEY || "").trim() || undefined;
  const expectedPrefix = environment === "live" ? "sk_live_" : "sk_test_";
  if (!secretKey || !secretKey.startsWith(expectedPrefix)) {
    throw new PaymentConfigurationError(`A ${expectedPrefix} Paystack secret key is required; payment operations are disabled`);
  }
  if (publicKey && !publicKey.startsWith(environment === "live" ? "pk_live_" : "pk_test_")) {
    throw new PaymentConfigurationError("PAYSTACK_PUBLIC_KEY does not match PAYMENT_ENVIRONMENT");
  }

  const baseUrl = (process.env.PAYSTACK_BASE_URL || "https://api.paystack.co").replace(/\/$/, "");
  if (baseUrl !== "https://api.paystack.co") throw new PaymentConfigurationError("PAYSTACK_BASE_URL must be the official HTTPS API host https://api.paystack.co");
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || "";
  if (!callbackUrl) throw new PaymentConfigurationError("PAYSTACK_CALLBACK_URL is required before initializing payments");
  let callback: URL;
  try { callback = new URL(callbackUrl); } catch { throw new PaymentConfigurationError("PAYSTACK_CALLBACK_URL must be an absolute URL"); }
  const localTestCallback = nodeEnv !== "production" && environment === "test" && ["localhost", "127.0.0.1"].includes(callback.hostname);
  if (callback.protocol !== "https:" && !localTestCallback) {
    throw new PaymentConfigurationError("PAYSTACK_CALLBACK_URL must use HTTPS outside local test development");
  }

  const currency = (process.env.PAYMENT_DEFAULT_CURRENCY || "NGN").toUpperCase();
  if (currency !== "NGN") throw new PaymentConfigurationError("Only NGN is enabled for the current marketplace payment implementation");
  const processingFeePolicy = getProcessingFeePolicy();
  const payoutApprovalMode = (process.env.PAYOUT_APPROVAL_MODE || "MANUAL").toUpperCase() as PayoutApprovalMode;
  if (!["MANUAL", "AUTOMATIC"].includes(payoutApprovalMode)) throw new PaymentConfigurationError("Invalid PAYOUT_APPROVAL_MODE");
  const testOperationsEnabled = environment === "test" && (nodeEnv !== "production" || isTrue(process.env.PAYMENT_TEST_MODE_ENABLED));
  const financialFoundationApproved = isTrue(process.env.PAYMENT_FINANCIAL_FOUNDATION_APPROVED);
  const liveOperationsEnabled = environment === "live" && nodeEnv === "production"
    && financialFoundationApproved
    && isTrue(process.env.PAYMENT_LIVE_ENABLED)
    && isTrue(process.env.PAYMENT_LIVE_APPROVED);
  const providerMutationsEnabled = testOperationsEnabled || liveOperationsEnabled;
  const customerPaymentsEnabled = providerMutationsEnabled;
  const controlledPayoutsEnabled = providerMutationsEnabled
    && isTrue(process.env.PAYMENT_CONTROLLED_PAYOUTS_APPROVED)
    && isTrue(process.env.PAYMENT_CONTROLLED_PAYOUTS_ENABLED);
  const immediateSplitEnabled = providerMutationsEnabled && isTrue(process.env.PAYMENT_IMMEDIATE_SPLIT_ENABLED);
  const sharedFeePlatformBps = getSharedFeePlatformBps() ?? undefined;

  // When the modern signing secret is configured, use it. Legacy API-key signatures remain
  // supported only for Paystack integrations that have not yet enabled signing secrets.
  const webhookSigningSecret = (process.env.PAYSTACK_WEBHOOK_SIGNING_SECRET || "").trim() || undefined;
  if (webhookSigningSecret && !webhookSigningSecret.startsWith("whsec_")) {
    throw new PaymentConfigurationError("PAYSTACK_WEBHOOK_SIGNING_SECRET must be the dashboard whsec_ signing secret");
  }

  return {
    environment,
    defaultCurrency: "NGN",
    baseUrl,
    callbackUrl,
    processingFeePolicy,
    payoutApprovalMode,
    providerMutationsEnabled,
    customerPaymentsEnabled,
    financialFoundationApproved,
    liveOperationsEnabled,
    immediateSplitEnabled,
    controlledPayoutsEnabled,
    sharedFeePlatformBps,
    secretKey,
    publicKey,
    webhookSigningSecret,
  };
}

export function assertProviderMutationsEnabled(config: PaymentRuntimeConfig, operation = "Paystack provider mutation"): void {
  if (config.providerMutationsEnabled) return;
  if (config.environment === "live") {
    throw new PaymentConfigurationError(`${operation} is disabled: live Paystack operations require production mode, PAYMENT_FINANCIAL_FOUNDATION_APPROVED=true, PAYMENT_LIVE_ENABLED=true, and PAYMENT_LIVE_APPROVED=true`);
  }
  throw new PaymentConfigurationError(`${operation} is disabled in production test mode; set PAYMENT_TEST_MODE_ENABLED=true only for an approved test environment`);
}

export function assertCustomerPaymentsEnabled(config: PaymentRuntimeConfig): void {
  if (config.customerPaymentsEnabled) return;
  if (config.environment === "live") {
    throw new PaymentConfigurationError("Live customer payments are disabled until the financial foundation and business approvals are complete");
  }
  throw new PaymentConfigurationError("Paystack test-mode customer payments are disabled in production; enable only for an approved test environment");
}

/** A non-secret readiness summary suitable for health/admin interfaces. */
export function paymentReadinessSummary() {
  try {
    const config = getPaymentRuntimeConfig();
    return {
      configured: true,
      environment: config.environment,
      currency: config.defaultCurrency,
      providerMutationsEnabled: config.providerMutationsEnabled,
      customerPaymentsEnabled: config.customerPaymentsEnabled,
      financialFoundationApproved: config.financialFoundationApproved,
      liveOperationsEnabled: config.liveOperationsEnabled,
      immediateSplitEnabled: config.immediateSplitEnabled,
      controlledPayoutsEnabled: config.controlledPayoutsEnabled,
      payoutApprovalMode: config.payoutApprovalMode,
      webhookSigningMode: config.webhookSigningSecret ? "PAYSTACK_SIGNING_SECRET" : "LEGACY_API_KEY_SIGNATURE",
      message: config.environment === "live" && !config.liveOperationsEnabled
        ? "Live provider operations are disabled until foundation and business approvals are explicitly confirmed"
        : config.controlledPayoutsEnabled ? "Controlled payouts explicitly approved and enabled" : "Controlled payout route disabled until account/business approval and configuration are confirmed",
    };
  } catch (error) {
    return { configured: false, environment: process.env.PAYMENT_ENVIRONMENT || "unset", message: error instanceof Error ? error.message : "Payment configuration is incomplete" };
  }
}
