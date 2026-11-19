import "server-only";
import crypto from "node:crypto";
import { assertCustomerPaymentsEnabled, assertProviderMutationsEnabled, getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";
import { toPaystackAmount } from "@/lib/payments/money";

export { PaymentConfigurationError };
export type PaystackTransaction = {
  id?: number | string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  customer?: { email?: string };
  fees?: number | null;
  paid_at?: string | null;
  metadata?: unknown;
  subaccount?: unknown;
  split?: unknown;
};

export class PaystackApiError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode = 502) { super(message); this.name = "PaystackApiError"; this.statusCode = statusCode; }
}

function safeEqualHex(expected: Buffer, candidateHex: string): boolean {
  if (!/^[0-9a-f]{128}$/i.test(candidateHex)) return false;
  const candidate = Buffer.from(candidateHex, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(expected, candidate);
}

export type WebhookSignatureResult = { valid: boolean; mode: "signing-secret" | "legacy-api-key" | "invalid"; keyId?: string; reason?: string };

/** Verify current Paystack webhooks (Paystack-Signature + whsec_ + timestamp) and the legacy
 * x-paystack-signature API-secret scheme during a dashboard signing-secret transition.
 * `rawBody` must be the exact byte sequence received from the request.
 */
export function verifyPaystackWebhookSignature({
  rawBody,
  currentSignature,
  legacySignature,
  signingSecret,
  apiSecret,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
}: {
  rawBody: Buffer;
  currentSignature: string | null;
  legacySignature: string | null;
  signingSecret?: string;
  apiSecret?: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): WebhookSignatureResult {
  if (currentSignature) {
    if (!signingSecret) return { valid: false, mode: "invalid", reason: "signing secret is not configured" };
    let timestamp: number | null = null;
    const signatures: Array<{ keyId: string; hex: string }> = [];
    for (const part of currentSignature.split(",")) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      const key = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (key === "t") {
        if (timestamp !== null || !/^\d+$/.test(value)) return { valid: false, mode: "invalid", reason: "invalid timestamp field" };
        timestamp = Number(value);
      } else if (key === "v1") {
        const colon = value.indexOf(":");
        if (colon > 0) signatures.push({ keyId: value.slice(0, colon), hex: value.slice(colon + 1) });
      }
    }
    if (timestamp === null || signatures.length === 0) return { valid: false, mode: "invalid", reason: "missing timestamp or v1 signature" };
    if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) return { valid: false, mode: "invalid", reason: "timestamp outside replay window" };
    const expected = crypto.createHmac("sha512", signingSecret).update(String(timestamp)).update(".").update(rawBody).digest();
    for (const signature of signatures) {
      if (safeEqualHex(expected, signature.hex)) return { valid: true, mode: "signing-secret", keyId: signature.keyId };
    }
    return { valid: false, mode: "invalid", reason: "signature mismatch" };
  }

  if (legacySignature) {
    if (!apiSecret) return { valid: false, mode: "invalid", reason: "legacy API key signature cannot be checked" };
    if (!/^[0-9a-f]{128}$/i.test(legacySignature)) return { valid: false, mode: "invalid", reason: "malformed legacy signature" };
    const expected = crypto.createHmac("sha512", apiSecret).update(rawBody).digest();
    return safeEqualHex(expected, legacySignature) ? { valid: true, mode: "legacy-api-key" } : { valid: false, mode: "invalid", reason: "signature mismatch" };
  }
  return { valid: false, mode: "invalid", reason: "missing signature" };
}

/** Backwards-compatible helper for legacy x-paystack-signature tests/integrations. */
export function verifyPaystackSignature(rawBody: string | Buffer, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest();
  return safeEqualHex(expected, signature);
}

async function paystackRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getPaymentRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: init.signal || AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...init.headers,
      },
    });
  } catch (error) {
    throw new PaystackApiError(error instanceof Error && error.name === "TimeoutError" ? "Paystack request timed out" : "Unable to reach Paystack", 502);
  }
  const body: any = await response.json().catch(() => null);
  if (!response.ok || !body?.status) {
    const message = typeof body?.message === "string" ? body.message.slice(0, 240) : "Paystack request failed";
    throw new PaystackApiError(message, response.status || 502);
  }
  return body.data as T;
}

export type InitializePaystackInput = {
  email: string;
  amountKobo: number;
  reference: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
  subaccount?: string;
  transactionChargeKobo?: number;
  bearer?: "account" | "subaccount";
};

export async function initializePaystackTransaction(input: InitializePaystackInput) {
  const config = getPaymentRuntimeConfig();
  assertCustomerPaymentsEnabled(config);
  if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo <= 0) throw new Error("Amount must be a positive integer in kobo");
  if (!/^[A-Za-z0-9_-]{8,50}$/.test(input.reference)) throw new Error("Invalid Paystack reference");
  const currency = (input.currency || config.defaultCurrency).toUpperCase();
  if (currency !== config.defaultCurrency) throw new Error("Unsupported payment currency");
  if (input.subaccount && !config.immediateSplitEnabled) throw new Error("Immediate split settlement is disabled by payment configuration");
  if (input.transactionChargeKobo != null && (!Number.isSafeInteger(input.transactionChargeKobo) || input.transactionChargeKobo < 0 || input.transactionChargeKobo > input.amountKobo)) throw new Error("Invalid split transaction charge");
  const result = await paystackRequest<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency,
      reference: input.reference,
      callback_url: input.callbackUrl || config.callbackUrl,
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.subaccount ? { subaccount: input.subaccount } : {}),
      ...(input.transactionChargeKobo != null ? { transaction_charge: input.transactionChargeKobo } : {}),
      ...(input.bearer ? { bearer: input.bearer } : {}),
    }),
  });
  if (result.reference !== input.reference || !result.authorization_url || !result.access_code) throw new PaystackApiError("Paystack returned an incomplete initialization response", 502);
  return result;
}

export async function initializePaystackAmount({ email, amountMinor, reference, currency, metadata, subaccount, transactionChargeMinor, bearer }: {
  email: string; amountMinor: bigint; reference: string; currency?: string; metadata?: Record<string, unknown>;
  subaccount?: string; transactionChargeMinor?: bigint; bearer?: "account" | "subaccount";
}) {
  return initializePaystackTransaction({
    email, amountKobo: toPaystackAmount(amountMinor), reference, currency, metadata, subaccount, bearer,
    transactionChargeKobo: transactionChargeMinor == null ? undefined : transactionChargeMinor === 0n ? 0 : toPaystackAmount(transactionChargeMinor),
  });
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction> {
  if (!reference || reference.length > 64) throw new Error("Invalid Paystack reference");
  return paystackRequest<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
}

export async function listPaystackBanks(country = "nigeria") {
  const query = new URLSearchParams({ country, perPage: "200" });
  return paystackRequest<any[]>(`/bank?${query}`, { method: "GET" });
}

export async function resolvePaystackAccountNumber(accountNumber: string, bankCode: string) {
  if (!/^\d{6,20}$/.test(accountNumber) || !/^[A-Za-z0-9_-]{2,20}$/.test(bankCode)) throw new Error("Invalid bank account details");
  const query = new URLSearchParams({ account_number: accountNumber, bank_code: bankCode });
  return paystackRequest<{ account_number: string; account_name: string }>(`/bank/resolve?${query}`, { method: "GET" });
}

export async function createPaystackSubaccount(input: { businessName: string; bankCode: string; accountNumber: string; percentageCharge: number; email?: string; phone?: string }) {
  const config = getPaymentRuntimeConfig();
  assertProviderMutationsEnabled(config, "Paystack subaccount creation");
  if (!Number.isFinite(input.percentageCharge) || input.percentageCharge < 0 || input.percentageCharge > 100) throw new Error("Invalid Paystack subaccount percentage");
  return paystackRequest<{ subaccount_code: string; is_verified?: boolean; active?: boolean; currency?: string; account_name?: string; settlement_bank?: string }>("/subaccount", {
    method: "POST",
    body: JSON.stringify({ business_name: input.businessName, bank_code: input.bankCode, account_number: input.accountNumber, percentage_charge: input.percentageCharge, primary_contact_email: input.email, primary_contact_phone: input.phone }),
  });
}

export async function fetchPaystackSubaccount(code: string) {
  return paystackRequest<any>(`/subaccount/${encodeURIComponent(code)}`, { method: "GET" });
}

export async function createPaystackTransferRecipient(input: { name: string; accountNumber: string; bankCode: string; email?: string; currency?: string }) {
  const config = getPaymentRuntimeConfig();
  assertProviderMutationsEnabled(config, "Paystack transfer-recipient creation");
  if (!/^\d{6,20}$/.test(input.accountNumber) || !/^[A-Za-z0-9_-]{2,20}$/.test(input.bankCode)) throw new Error("Invalid bank account details");
  return paystackRequest<{ recipient_code: string; name?: string; details?: { account_number?: string; bank_code?: string } }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({ type: "nuban", name: input.name, account_number: input.accountNumber, bank_code: input.bankCode, currency: input.currency || "NGN", email: input.email }),
  });
}

export async function initiatePaystackTransfer(input: { amountMinor: bigint; recipientCode: string; reference: string; reason: string }) {
  const config = getPaymentRuntimeConfig();
  assertProviderMutationsEnabled(config, "Paystack transfer initiation");
  if (!config.controlledPayoutsEnabled) throw new Error("Controlled payouts are disabled until Paystack and business approval is explicitly configured");
  if (!/^[a-z0-9_-]{16,50}$/.test(input.reference)) throw new Error("Invalid Paystack transfer reference");
  return paystackRequest<any>("/transfer", {
    method: "POST",
    body: JSON.stringify({ source: "balance", amount: toPaystackAmount(input.amountMinor), recipient: input.recipientCode, reference: input.reference, reason: input.reason.slice(0, 120), currency: config.defaultCurrency }),
  });
}

export async function verifyPaystackTransfer(reference: string) {
  return paystackRequest<any>(`/transfer/verify/${encodeURIComponent(reference)}`, { method: "GET" });
}

export async function createPaystackRefund(input: { transaction: string; amountMinor?: bigint; reference: string; customerNote?: string; merchantNote?: string }) {
  const config = getPaymentRuntimeConfig();
  assertProviderMutationsEnabled(config, "Paystack refund creation");
  return paystackRequest<any>("/refund", {
    method: "POST",
    body: JSON.stringify({ transaction: input.transaction, ...(input.amountMinor == null ? {} : { amount: toPaystackAmount(input.amountMinor) }), reference: input.reference, customer_note: input.customerNote, merchant_note: input.merchantNote }),
  });
}

export async function getPaystackRefundByReference(reference: string) {
  const query = new URLSearchParams({ reference });
  return paystackRequest<any[]>(`/refund?${query}`, { method: "GET" });
}
