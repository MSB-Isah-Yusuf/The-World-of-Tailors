# The World of Tailors architecture

Snapshot: 2026-10-19. This describes the current implementation at a high level; it is not a security audit or launch approval.

## Overview

Modular monolith: Next.js App Router provides the UI and API route handlers; business logic and database access run server-side through Prisma.

## Layers

- **UI:** Tailwind, shared components, public marketplace pages, and role-specific dashboards. Checkout calls server-owned payment routes; UI state is never payment proof.
- **Auth:** NextAuth credentials sessions and server-side `requireRole`/ownership checks. Demo login is denied in production even if `DEMO_MODE=true`.
- **Data:** Current Prisma datasource is PostgreSQL. Models include users, marketplace/catalogue, bookings, orders, inventory history, payments, obligations, attempts, commission snapshots, seller payment profiles, payouts, refunds, disputes, reconciliation, and the financial journal/ledger.
- **Marketplace:** Inventory reservation occurs in database transactions. Payment obligations and amount snapshots are server-owned. Captures are checked against Paystack and local references, amounts, currency, customer, and obligation before settlement/fulfillment.
- **Financial controls:** Paystack initialization is idempotent by reference; uncertain calls remain locked to the original reference. The ledger uses idempotency keys and balanced journals; migration SQL adds append-only and balance constraints. Seller provisioning resolves and compares account names before provider destination creation.

## Deployment and migration status

- Vercel builds run `prisma generate && next build`; they do not run schema push or demo/admin seeding.
- `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql` is a financial delta from the repository's pre-payment schema. This repository does not contain a verified migration baseline, and the target production schema/data have not been inspected. The migration has been executed on a synthetic in-memory PGlite baseline, not on production or a staging copy.
- Do not run `prisma migrate deploy` or `prisma db push` against a shared/production database until the actual target schema is inspected, a baseline/deployment plan is approved, and a restorable staging-copy rehearsal passes.

See [`PAYSTACK_MARKETPLACE_IMPLEMENTATION.md`](PAYSTACK_MARKETPLACE_IMPLEMENTATION.md), [`SECURITY.md`](SECURITY.md), and [`UAT_SMOKE_REPORT.md`](UAT_SMOKE_REPORT.md) for controls and rollout gates.
