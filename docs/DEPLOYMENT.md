# Deployment controls — The World of Tailors

**Deployment is currently gated.** The financial-core schema delta has not been applied to a target database, the production database baseline is unverified, and Paystack test/live integration has not been exercised. Do not treat this file as approval to release.

## Environment configuration

Configure secrets in the hosting provider's secret manager; do not commit them or paste them into chat.

- PostgreSQL `DATABASE_URL` for the exact target environment.
- A newly generated, unique `AUTH_SECRET` and the correct `AUTH_URL`.
- `NODE_ENV=production` and `DEMO_MODE=false`; production demo access is disabled in code even if the flag is mis-set.
- Storage/email/maps settings as required by the deployment.
- Use Paystack **test** keys only for approved integration testing. `PAYMENT_TEST_MODE_ENABLED` must remain false in production unless this is an approved test-only staging deployment using `sk_test_`/`pk_test_` credentials. Configure the webhook signing secret separately.
- Keep `PAYMENT_FINANCIAL_FOUNDATION_APPROVED=false`, `PAYMENT_LIVE_ENABLED=false`, and `PAYMENT_LIVE_APPROVED=false`. Live provider mutations require all three flags, production mode, and matching live keys. The foundation flag must not be set until the financial database, ledger, commission engine, and Paystack test-mode integration have been accepted; the other flags require separate documented business approval. Do not enable live traffic until migration, provider verification, and operational controls are signed off.
- Leave `PAYMENT_IMMEDIATE_SPLIT_ENABLED=false`, `PAYMENT_CONTROLLED_PAYOUTS_APPROVED=false`, and `PAYMENT_CONTROLLED_PAYOUTS_ENABLED=false` until the applicable Paystack/business approvals are documented. Set fabric delivery fee and commission rules explicitly before offering checkout.

See `.env.example` for variable names and safe defaults. Generate a unique auth secret with `openssl rand -base64 32`; never copy a sample key.

## Build

Vercel runs `prisma generate && next build`. The build does not connect to the database to mutate schema and does not seed demo or administrator accounts.

## Database rollout gate

1. Inspect the actual target PostgreSQL version, schema, data constraints, and migration history read-only. This repository has no verified prior Prisma migration baseline; the financial migration is a delta from the pre-payment schema, not a fresh bootstrap.
2. Create an approved baseline/deployment plan, take and verify a restorable backup, and rehearse the exact SQL against a staging copy with representative data.
3. Review backfill counts and unresolved non-NGN/out-of-range values, validate ledger triggers and constraints, and obtain database/business-owner approval.
4. Only then apply the approved schema change through the agreed migration procedure, followed by application deployment. Do not run `prisma migrate deploy`, `prisma db push`, or `prisma db push --accept-data-loss` against a shared/production database before these gates.

The in-memory PGlite rehearsal is not a substitute for target-database inspection or a staging-copy rehearsal. See `docs/PAYSTACK_MARKETPLACE_IMPLEMENTATION.md` and `docs/UAT_SMOKE_REPORT.md`.

## Health and smoke checks

- `GET /api/health` only confirms that the web route responds; it is not a database, Paystack, or financial readiness check.
- Verify login/role/ownership boundaries on staging with provisioned test users.
- In Paystack test mode, verify same-reference handling for uncertain initialization, duplicate/replayed webhooks, mismatches, payouts/refunds, and reconciliation before any live deployment.
- Never seed demo users or use demo credentials in shared/staging/production environments.
