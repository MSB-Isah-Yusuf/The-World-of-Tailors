# The World of Tailors — tailoring and fabric marketplace

Next.js marketplace with customer, tailor, fabric-seller, and administrator workflows. Payment flows use server-owned obligations, Paystack verification, and an internal append-only ledger. **The payment-core work is not approved for production Paystack traffic until the deployment gates below are completed.**

## Local development

1. Install dependencies: `npm ci --legacy-peer-deps`.
2. Configure `.env` with an isolated local PostgreSQL `DATABASE_URL` and the required local auth values. The Prisma datasource is PostgreSQL; SQLite is not supported by the current schema.
3. For a disposable loopback PostgreSQL database only, sync the development schema with `LOCAL_DB_PUSH_CONFIRM=SYNC_LOCAL_DATABASE npm run db:push`. The wrapper refuses non-loopback hosts and production mode.
4. To load demo data into an empty local database, set `DEMO_MODE=true` and run `LOCAL_DEMO_SEED_CONFIRM=SEED_LOCAL_DEMO_DATA npm run db:seed`. The seed requires a loopback PostgreSQL URL, refuses non-empty databases, and never clears existing data. Demo credentials are local-only; both login surfaces are disabled in production regardless of `DEMO_MODE`.
5. Run `npm run dev`.

For an intentional local-only reset, the guarded command is `LOCAL_DB_RESET_CONFIRM=RESET_LOCAL_DATABASE npm run db:reset`; it force-resets a loopback database and reseeds it. The seeded local demo accounts are `customer@demo.twt.ng`, `tailor@demo.twt.ng`, `seller@demo.twt.ng`, and `admin@demo.twt.ng`, all with password `DemoPass123!`. Never deploy these identities or credentials to any shared or production environment.

## Stack and security

- Next.js 15 App Router, React 19, TypeScript, Prisma, PostgreSQL, NextAuth, and server-side RBAC/ownership checks.
- Payment initialization derives amounts from persisted obligations; client-provided amounts are rejected. Callback and webhook paths verify transactions with Paystack before settlement; browser redirects alone are not proof of payment.
- Seller bank/provider destinations, commissions, settlement policies, payouts, refunds, disputes, and reconciliation have explicit controls. Commission rates and some business policies remain unconfigured pending approval.
- The internal ledger is not proof of segregated or settled provider funds. See [`docs/SECURITY.md`](docs/SECURITY.md) and [`docs/PAYSTACK_MARKETPLACE_IMPLEMENTATION.md`](docs/PAYSTACK_MARKETPLACE_IMPLEMENTATION.md).

## Validation

Run `npm run typecheck`, `npx prisma validate`, `npm test -- --run`, and `npm run build` for code checks. These do not replace the target-database migration rehearsal or Paystack test-mode integration. The current migration has only been exercised on a synthetic in-memory PGlite baseline; no production/staging database has been inspected or modified.

## Deployment caution

- Vercel builds run `prisma generate && next build`; they do not run `prisma db push` or seed administrator identities.
- `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql` is a delta from the repository's pre-payment schema, not a fresh-database bootstrap. This repository has no verified Prisma migration baseline and the production schema/data state has not been inspected. Do not run `prisma migrate deploy` on production until the schema baseline, backup, migration plan, and rehearsal against a staging copy are approved.
- Never use `prisma db push --accept-data-loss` for this financial rollout. Do not enable live Paystack, seller eligibility, immediate splits, or controlled payouts before provider/business approval and documented operational sign-off.
- Production admin provisioning must use an explicitly approved and audited process. `scripts/create-admin.mjs` requires `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, and `ADMIN_BOOTSTRAP_CONFIRM=CREATE_NEW_ADMIN`; it cannot promote an existing user or reset an existing admin password.

See [`docs/UAT_SMOKE_REPORT.md`](docs/UAT_SMOKE_REPORT.md) for the latest validation record and outstanding rollout gates.
