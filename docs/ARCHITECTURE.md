# The World of Tailors Architecture

## Overview
Modular monolith — Next.js App Router hosts frontend + API Route Handlers. Business logic executes server-side only. DB via Prisma.

## Layers
- **UI**: Tailwind + shadcn/ui + Framer Motion. Public glassmorphism (homepage location-aware ranking + distanceKm) + solid dashboards (Tailor 15-item midnight, Seller 11-item mirror, Customer 7-item, Admin live). `CartBadge`/`NotificationBell` live polling, `CheckoutClient` multi-seller cart, `AddToCart` per fabric, `MannequinClient` 21 hotspots.
- **Auth**: NextAuth v5 credentials + PrismaAdapter, JWT sessions, httpOnly cookies, `AUTH_SECRET` required on Vercel. `src/lib/rbac.ts` centralizes `requireAuth/requireRole/assertOwnership/roleHome`.
- **Data**: Prisma + SQLite (dev) / PostgreSQL (prod) — `prisma db push` on Vercel build + `seed-if-empty.mjs` idempotent (MSB admin). 30+ models, cuid, FK, indexes, history (BookingStatusHistory, InventoryMovement, AuditLog, PaymentWebhookEvent).
- **Marketplace core**: `Cart` per-user → `CartItem` (productId, qty) → `POST /api/checkout` groups by `sellerId`, atomic `$transaction` (`reserved+=qty`, `InventoryMovement RESERVE`), separate `FabricOrder` per seller, `Delivery` + `Payment PENDING`, `Paystack` webhook `charge.success` HMAC verifies → `Payment PAID`, commits `stock-=qty reserved-=qty`.
- **Services**: Storage (`src/lib/storage.ts` 5MB/MIME validated), Email (`src/lib/email.ts` console/Resend), Notifications (`src/lib/notifications.ts` + `/api/notifications`), Maps (LocationPicker NG 37 states + Nominatim reverse + OSM), Payments (Paystack `src/lib/paystack.ts`), all env-gated never exposed to browser.

## Security
- Least-privilege RBAC, ownership-scoped queries, state-transition validation, transactions for inventory/orders, idempotent webhooks.
- See SECURITY.md.

## Performance
- Server rendering for public pages, revalidation, optimized images, pagination, indexes, connection pooling.
- Background jobs planned via queue (email, thumbnails).

## Deployment
Vercel/Fly with Postgres, managed secrets, `prisma migrate deploy`, monitoring + backups.
