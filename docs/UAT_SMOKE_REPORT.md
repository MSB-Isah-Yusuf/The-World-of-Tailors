# Payment implementation validation and UAT status

**Snapshot:** 2026-10-19 (Africa/Lagos)
**Status:** Build/typecheck pass; not approved for production Paystack traffic.

This replaces an older UAT note whose date, route count, test count, preview, and deployment assertions were not verified against this payment implementation. It is not evidence of a production database migration, a Paystack test transaction, or live user acceptance.

## Automated checks completed

- `npm run typecheck` — passed.
- `npx prisma validate` — passed.
- `npm audit` — zero vulnerabilities after dependency updates and targeted Prisma/Next transitive overrides; a clean `npm ci --legacy-peer-deps` also completed with zero findings.
- `npm test -- --run` — 7 test files, 45 tests passed. Coverage includes Paystack signature/replay checks, mocked test-key initialization and same-reference verification contracts, production test/live fail-closed gates, production demo-access denial, payment API role and client-amount guards, unsupported-currency checkout rejection, uncertain-attempt locking, amount-mismatch review, duplicate-capture idempotency, integer money/commission/ledger invariants, ledger database idempotency, and booking/order state transitions.
- `npm run build` — passed; Next.js production build generated 137 routes.
- Local database safety guard — exercised without making a DB request: remote host and production mode rejected; explicitly confirmed loopback PostgreSQL accepted.
- Migration rehearsal — executed the generated pre-payment baseline plus `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql` in an in-memory PGlite 0.5.17 runtime (PostgreSQL 18.7 on WASM). A read-only Prisma diff cross-check found all 128 generated current-schema DDL statements represented in the migration (with the safe `Payment.updatedAt` backfill adjustment). Synthetic legacy rows verified NGN case/space canonicalization, amount backfills, unsupported-currency/out-of-range values left NULL, `Payment.updatedAt`, and legacy webhook states. Attempt uniqueness, balanced-journal commit, single-sided amounts, append-only updates, and truncate rejection passed. The first rehearsal caught an index created before `PaymentAttempt`; it was moved after the table/index creation and the migration then passed.

The PGlite rehearsal is useful SQL execution evidence, but it does not replace a rehearsal on the actual PostgreSQL major version, an inspected production schema, or representative target data. Mocked Paystack HTTP contract tests verify request/response handling and environment gates, but do not replace a real Paystack test-mode transaction. One guarded test-mode initialization smoke was rejected by Paystack with HTTP 401; it created no transaction, so no verification request was made. A valid test key is still required.

## Not performed

- No production/staging database mutation or migration was run; PGlite was an ephemeral in-memory database with synthetic rows.
- One Paystack test-mode initialization request was attempted with a test-prefixed workspace key; the API returned HTTP 401, no transaction was created, and no verification, webhook, transfer, split, or refund request followed. No live Paystack request was made.
- No seller bank details or provider destinations were created.
- No real or test financial transaction has been reconciled.

## Deployment and UAT gates

1. Inspect the target database schema and agree on a baseline/deployment procedure. Back up the database and rehearse `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql` against a staging copy. This SQL is a delta from the pre-payment schema, not a fresh-database bootstrap.
2. Apply the approved schema change before deploying code that expects the new columns. `vercel-build` intentionally no longer runs `prisma db push --accept-data-loss` or auto-seeds production identities.
3. Configure separate, approved tailoring and fabric commission rules; no rate is selected. Keep settlement routes and seller eligibility disabled until Paystack/business approval and provider destination verification are complete.
4. Set `PAYMENT_FABRIC_DELIVERY_FEE_MINOR` explicitly. Keep processor-fee policy separate from commission; no default delivery fee or customer surcharge is chosen.
5. In Paystack test mode, test initialization timeouts and same-reference verification, duplicate/replayed webhooks, amount/currency/customer mismatches, seller settlement, payout approval/unknown states, refund approval/unknown states, and reconciliation. Verify that no uncertain transfer or payment attempt can be retried with a new reference before its status is established.
6. Conduct role-based customer/tailor/seller/admin UAT, accessibility review, and independent legal, accounting, tax, and operational review before production launch.

The demo seed is for local non-production development only: it requires explicit confirmation, loopback PostgreSQL, and an empty database; it refuses production and never clears existing data. Production identity provisioning must be performed through an approved, audited process.

See [`PAYSTACK_MARKETPLACE_IMPLEMENTATION.md`](PAYSTACK_MARKETPLACE_IMPLEMENTATION.md) for the implementation details, schema/backfill limits, controls, and production gates.
