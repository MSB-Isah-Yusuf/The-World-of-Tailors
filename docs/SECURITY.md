# Security Notes

## Auth
- Central login `/login` only. Public registration never creates ADMIN.
- Passwords bcrypt hashed. Email verification + reset tokens (single-use, expiry) planned.
- Sessions httpOnly Secure SameSite, revocation on suspend/logout. Rate limiting recommended (Upstash).
- No client role selector; server derives dashboard from DB.

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
- Browser redirect not trusted. Verify via Paystack API/webhook idempotency. `payment_webhook_events` table ensures replay safety.

## Env
- Separate dev/prod, managed secrets, `.env.example` only placeholders. No private env exposed to browser.

Run `tests/authz.test.ts` for authorization test suite.
