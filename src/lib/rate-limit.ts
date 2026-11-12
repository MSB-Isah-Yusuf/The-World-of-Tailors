// In-memory token bucket — resets on server restart/replica; OK for Vercel single-concurrency MVP
// For scale, swap to Upstash Redis via same interface.

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

export function rateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const b = store.get(key);
  if (!b || now > b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, resetAt: b.resetAt };
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

export function getClientIp(req: Request | { headers: Map<string,string> }) {
  // NextRequest headers are available; fallback to x-forwarded-for
  const h = (req as any).headers;
  const fwd = (h.get ? h.get("x-forwarded-for") : null) || (h.get ? h.get("x-real-ip") : null);
  if (fwd) return String(fwd).split(",")[0].trim();
  return "unknown";
}
