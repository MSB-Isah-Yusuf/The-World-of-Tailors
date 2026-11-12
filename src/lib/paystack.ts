import crypto from "crypto";

// Paystack helpers — server-side only, never expose secret to client
// Env: PAYSTACK_SECRET_KEY (sk_test_ / sk_live_), PAYSTACK_PUBLIC_KEY optional

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY missing");
  if (!signature) return false;
  const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  // constant time compare
  try { return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature)); } catch { return hash === signature; }
}

export async function initializePaystackTransaction({ email, amountKobo, reference, metadata }: { email: string; amountKobo: number; reference: string; metadata?: Record<string, any> }) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    // Sandbox fallback — no keys set, return mock authorization URL
    return { status: "mock", authorization_url: `/checkout?mock_pay=1&ref=${reference}`, reference, access_code: "mock_" + reference };
  }
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, amount: amountKobo, reference, metadata }),
  });
  const json: any = await res.json();
  if (!res.ok || !json.status) throw new Error(json.message || "Paystack initialize failed");
  return json.data; // { authorization_url, access_code, reference }
}

export async function verifyPaystackTransaction(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return { status: "mock_verified", reference, amount: 0 } as any;
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const json: any = await res.json();
  if (!res.ok) throw new Error(json.message || "Paystack verify failed");
  return json.data;
}
