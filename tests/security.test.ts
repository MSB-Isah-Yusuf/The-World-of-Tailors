import { afterEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { verifyPaystackSignature, verifyPaystackWebhookSignature } from "@/lib/paystack";
import { POST as demoLogin } from "@/app/api/demo-login/route";

const originalApiSecret = process.env.PAYSTACK_SECRET_KEY;
const originalDemoMode = process.env.DEMO_MODE;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalApiSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = originalApiSecret;
  if (originalDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = originalDemoMode;
  if (originalNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
  else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
});

describe("Production demo-access guard", () => {
  it("rejects demo login even if DEMO_MODE is accidentally enabled in production", async () => {
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.DEMO_MODE = "true";
    const response = await demoLogin(new NextRequest("http://localhost/api/demo-login", { method: "POST" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "Demo disabled" });
  });
});

describe("Paystack webhook signature verification", () => {
  const rawBody = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "twt_order_123", amount: 12500 } }));
  const signingSecret = "whsec_test_signing_secret";
  const apiSecret = "sk_test_api_secret";
  const timestamp = 1_800_000_000;

  function currentSignature(secret = signingSecret, ts = timestamp, body = rawBody) {
    const hex = crypto.createHmac("sha512", secret).update(String(ts)).update(".").update(body).digest("hex");
    return `t=${ts},v1=key-a:${hex}`;
  }

  it("accepts a valid timestamped signature over the exact raw bytes", () => {
    const result = verifyPaystackWebhookSignature({ rawBody, currentSignature: currentSignature(), legacySignature: null, signingSecret, apiSecret, nowSeconds: timestamp });
    expect(result).toMatchObject({ valid: true, mode: "signing-secret", keyId: "key-a" });
  });

  it("accepts any valid v1 signature in a rotation header", () => {
    const valid = currentSignature().split("v1=key-a:")[1];
    const header = `t=${timestamp},v1=old-key:${"0".repeat(128)},v1=new-key:${valid}`;
    const result = verifyPaystackWebhookSignature({ rawBody, currentSignature: header, legacySignature: null, signingSecret, nowSeconds: timestamp });
    expect(result).toMatchObject({ valid: true, mode: "signing-secret", keyId: "new-key" });
  });

  it("rejects tampered raw bytes and malformed signatures", () => {
    const tampered = Buffer.from(rawBody.toString().replace("12500", "1"));
    expect(verifyPaystackWebhookSignature({ rawBody: tampered, currentSignature: currentSignature(), legacySignature: null, signingSecret, nowSeconds: timestamp }).valid).toBe(false);
    expect(verifyPaystackWebhookSignature({ rawBody, currentSignature: `t=${timestamp},v1=key-a:xyz`, legacySignature: null, signingSecret, nowSeconds: timestamp }).valid).toBe(false);
  });

  it("rejects replayed signatures outside the configured time window", () => {
    const oldTimestamp = timestamp - 301;
    const result = verifyPaystackWebhookSignature({ rawBody, currentSignature: currentSignature(signingSecret, oldTimestamp), legacySignature: null, signingSecret, nowSeconds: timestamp, toleranceSeconds: 300 });
    expect(result).toMatchObject({ valid: false, mode: "invalid", reason: "timestamp outside replay window" });
  });

  it("does not fall back to a legacy API-key signature when a current header is present", () => {
    const legacy = crypto.createHmac("sha512", apiSecret).update(rawBody).digest("hex");
    const result = verifyPaystackWebhookSignature({ rawBody, currentSignature: `t=${timestamp},v1=key-a:${"0".repeat(128)}`, legacySignature: legacy, signingSecret, apiSecret, nowSeconds: timestamp });
    expect(result.valid).toBe(false);
  });

  it("supports a valid legacy API-key signature during signing-secret migration", () => {
    const legacy = crypto.createHmac("sha512", apiSecret).update(rawBody).digest("hex");
    const result = verifyPaystackWebhookSignature({ rawBody, currentSignature: null, legacySignature: legacy, apiSecret });
    expect(result).toMatchObject({ valid: true, mode: "legacy-api-key" });
  });

  it("fails closed when a signature or verification key is missing", () => {
    expect(verifyPaystackWebhookSignature({ rawBody, currentSignature: null, legacySignature: null }).valid).toBe(false);
    expect(verifyPaystackWebhookSignature({ rawBody, currentSignature: currentSignature(), legacySignature: null, nowSeconds: timestamp }).valid).toBe(false);
  });
});

describe("Legacy Paystack signature compatibility", () => {
  const rawBody = "{\"event\":\"charge.success\"}";
  it("accepts only a matching SHA-512 HMAC", () => {
    const secret = "sk_test_legacy_secret";
    process.env.PAYSTACK_SECRET_KEY = secret;
    const signature = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    expect(verifyPaystackSignature(rawBody, signature)).toBe(true);
    expect(verifyPaystackSignature(`${rawBody} `, signature)).toBe(false);
    expect(verifyPaystackSignature(rawBody, null)).toBe(false);
  });
});
