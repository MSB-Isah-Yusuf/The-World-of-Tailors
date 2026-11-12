# Security Notes

## Auth
- Central login `/login` only. Public registration never creates ADMIN — `/register/*` only allows CUSTOMER/TAILOR/FABRIC_SELLER; ADMIN via `scripts/create-admin.mjs` or `prisma/seed.ts` only. Enforced server-side in Prisma `role` default + RLS checks.
- Passwords bcrypt10 hashed. MSB admin `msb_025@outlook.com` created idempotently via `scripts/seed-if-enable.mjs` on Vercel build.
- NextAuth v5 JWT, `AUTH_SECRET` required on Vercel (see DEPLOYMENT.md), httpOnly Secure SameSite, trustHost true, session revocation on `SUSPENDED` + `Session.deleteMany` on admin suspend.
- No client role selector; server derives dashboard from DB via `requireRole` + `auth()` in every server page/API.
- Rate limiting: `middleware.ts` + `src/lib/rate-limit.ts` 30/min per IP on `/api/auth`, `/api/demo-login`, `/api/webhooks` → 429; extend to Upstash Redis for multi-replica prod if needed.

## RBAC (tested)
- Customers cannot access other customers' measurements.
- Tailors cannot access other tailors' bookings — ownership-scoped queries.
- Sellers cannot access measurements; cannot edit other sellers' products.
- Sellers cannot change tailoring status; tailors cannot change inventory.
- Non-admins cannot assign admin roles; unapproved businesses restricted.

## Data protection
- Measurements/addresses private, never in public API/URLs/emails. Redacted from logs. HTTPS + encryption at rest.
- Image uploads: signature, size, dimension limits, randomized storage keys, thumbnails, orphan cleanup.

## Payments
- Browser redirect not trusted. Paystack `x-paystack-signature` HMAC SHA512 verified (`src/lib/paystack.ts:verifyPaystackSignature`) — 401 on bad signature. Amount re-checked against Payment.amount. Only webhook can mark `PAID` → commits inventory (`stock-=qty reserved-=qty`).
- Webhook idempotency: `PaymentWebhookEvent.eventId unique + processed` — duplicate event ACK immediately, `Unique constraint` race handled.

## Headers & web
- `middleware.ts` sets `X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` on prod, minimal `CSP` (self + Paystack/Mapbox/Unsplash).
- `sitemap.xml`, `robots.txt`, `manifest.webmanifest` present; public pages SSR + pagination; images validated (MIME/size 5MB) via `src/lib/storage.ts`.

## Data protection additions
- Checkout `TO_TAILOR` requires validated `tailorDestinationId` (APPROVED tailor) — server-checked in `/api/checkout`.
- Cart `available = stock - reserved` enforced on every add/update; overselling impossible via `$transaction` reserve.

## Env
- Separate dev/prod, managed secrets, `.env.example` only placeholders. No private env exposed to browser.

Run `tests/authz.test.ts` for authorization test suite.
