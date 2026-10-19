# The World of Tailors Architecture

## Overview
Modular monolith — Next.js App Router hosts frontend + API Route Handlers. Business logic executes server-side only. DB via Prisma.

## Layers
- **UI**: Tailwind + shadcn/ui. Public pages use glassmorphism; dashboards use solid, data-dense layout.
- **Auth**: NextAuth v5 credentials + PrismaAdapter, JWT sessions, httpOnly cookies. `src/lib/rbac.ts` centralizes requireAuth/requireRole.
- **Data**: Prisma + SQLite (dev) / PostgreSQL (prod). Migrations versioned, seed repeatable.
- **Services**: Object storage (S3/Cloudinary), Email (Resend/console), Maps (Mapbox), Payments (Paystack) — wired via env, never exposed to browser.

## Security
- Least-privilege RBAC, ownership-scoped queries, state-transition validation, transactions for inventory/orders, idempotent webhooks.
- See SECURITY.md.

## Performance
- Server rendering for public pages, revalidation, optimized images, pagination, indexes, connection pooling.
- Background jobs planned via queue (email, thumbnails).

## Deployment
Vercel/Fly with Postgres, managed secrets, `prisma migrate deploy`, monitoring + backups.
