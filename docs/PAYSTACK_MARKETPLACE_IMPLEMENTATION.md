# World of Tailors Paystack marketplace implementation

Implementation snapshot: 2026-10-19. This is an engineering status note, not a legal-compliance certification or a production-readiness sign-off.

## Scope and design decisions

- NGN only for this rollout; all transaction arithmetic uses integer kobo and server-calculated amounts.
- Tailoring bookings, fabric seller orders, and marketplace commission are separate workflows. A fabric order is linked to another workflow only by an explicit relation/reference.
- Tailoring supports an accepted full-payment quote or an agreed deposit followed by a distinct final-balance payment, all against one immutable obligation.
- Tailoring and fabric commission rules are independent, configurable, and snapshotted on an obligation. No commission rate, processing-fee surcharge, or settlement eligibility is invented here.
- Seller settlement is hybrid: Paystack split/subaccount settlement or controlled payout, subject to configuration, verified provider destinations, admin controls, and provider evidence. Split settlement is not escrow. The app does not represent an unsupported wallet, escrow, or available balance.

## Implemented paths

### Checkout, payment, and fulfilment

- `src/app/api/checkout/route.ts` creates one customer order group and distinct per-seller fabric orders/payments, reserves stock transactionally, rechecks server-side prices, and snapshots amounts in minor units. The fabric delivery amount is required configuration: `PAYMENT_FABRIC_DELIVERY_FEE_MINOR`; there is no hard-coded fee.
- `src/app/api/paystack/initialize/route.ts` uses server-owned obligations and attempts, does not accept client amounts, and reuses/blocks in-flight attempts rather than issuing a second live charge. A timeout after the provider request is marked `INITIALIZATION_UNKNOWN`; it stays locked and must be verified against the same reference. `src/app/api/paystack/verify/route.ts` and `/payments/return` independently verify with Paystack; the browser return is not payment proof.
- `src/app/api/webhooks/paystack/route.ts` validates the raw-body signature, persists an idempotency fingerprint and a sanitized payload, and calls Paystack verification before applying a charge. Settlement checks the local attempt, obligation, amount, NGN currency, customer email, reference, metadata, and current order/booking state. Mismatches and uncertain state changes go to review; they do not fulfil.
- `src/lib/payments/verify-and-settle.ts` posts successful captures and balanced ledger journals transactionally, allocates the obligation-level commission proportionally over instalments, tracks actual Paystack processing fees separately, and only commits fabric stock after verified payment. Multi-seller checkout completion requires every sibling payment to be `PAID`.
- Tailor quotation APIs/components provide server-priced, expiring quotes, customer acceptance, initial payment, and a distinct final-balance payment. Seller delivery/fulfilment confirmation is distinct from customer confirmation.
- To tolerate the explicitly un-migrated pre-financial database during rollout, customer measurement booking writes return only the legacy booking ID, customer lists select legacy columns, and tailor booking lists fall back on Prisma missing-column errors. Quote controls remain disabled in that fallback. This compatibility path does not replace the reviewed financial migration or enable payments; the query/response fallback is regression-tested in `tests/booking-schema-compat.test.ts`.

### Seller finance and controls

- Seller bank-account resolve/registration and Paystack recipient/subaccount provisioning are authenticated. Provider identity/name mismatches are rejected; uncertain creation results lock the profile for reconciliation instead of retrying with a new destination.
- Admin finance APIs/pages cover explicit commission rules, seller payment destinations, controlled payout requests/dual approval/provider verification, refund approvals/provider verification, customer disputes, and reconciliation imports/details/review.
- Customer and seller pages provide payment/refund/dispute history, payout requests, earnings/ledger snapshots, and fulfilment confirmation. Admin review decisions are audited and do not silently mutate ledger entries.
- The ledger uses immutable, idempotent, balanced double-entry journals. Payout, refund, and transfer states remain pending/unknown until verified from the provider; uncertain transfers are checked against the same reference before any further action.

### Commission and configuration

- Commission requires an explicit base: tailoring `SERVICE_TOTAL`; fabric `MERCHANDISE_SUBTOTAL` or `ORDER_TOTAL`. The obligation snapshots base type/amount, rule ID/version values, rate, fixed/minimum/maximum fees, total commission, processing-fee policy, and settlement policy. Later instalments allocate only the remaining snapshot, not the full commission again.
- Commission rules are not seeded with rates. New obligations/payments are blocked until an authorised admin configures an applicable rule. Settlement setup and payout eligibility are also not automatically enabled.
- `PAYMENT_FABRIC_DELIVERY_FEE_MINOR` must be set as a non-negative integer kobo value for fabric checkout. There is no implied/default customer surcharge. Processor fees remain separate from commission.
- The runtime defaults to `PAYMENT_ENVIRONMENT=test` in every Node environment. Production test-mode provider mutations require `PAYMENT_TEST_MODE_ENABLED=true`; live mutations require production mode, matching live keys, and all three explicit gates: `PAYMENT_FINANCIAL_FOUNDATION_APPROVED`, `PAYMENT_LIVE_ENABLED`, and `PAYMENT_LIVE_APPROVED`. Live customer payments are disabled by default.
- Automated tests exercise the test-key HTTP contract, exact NGN kobo amount/reference, verification by the same reference, provider errors, and fail-closed production gates using mocked Paystack responses. A guarded real test-mode initialization smoke was attempted once using the workspace test key; Paystack returned HTTP 401, so no transaction was created and no verification request followed. No live request, charge, split, payout, or refund was made; no credential value was logged.

## Migration and deployment safety

`prisma/migrations/20261019000000_marketplace_financial_core/migration.sql` now reflects the current payment schema (including refund/dispute/reconciliation additions), adds safe NGN legacy minor-unit snapshots, fills the new `Payment.updatedAt` from legacy `createdAt` before enforcing `NOT NULL`, includes a PostgreSQL partial unique index to serialize active attempts, and adds append-only/balanced-journal triggers and ledger amount/currency constraints. Rows outside the supported NGN/safe-integer conversion range remain `NULL` for review.

Important backfill limits:

- Legacy Float amounts are copied with `round(amount * 100)` only for NGN and a bounded non-negative range. Case and ordinary space-padded variants of NGN are canonicalized to `NGN` on existing product, booking, order, and payment rows; other currencies and malformed values are not altered. The old Float columns remain for compatibility.
- A backfilled `Payment.amountMinor` is only a historical amount snapshot. It is **not** evidence that Paystack captured the payment. The migration does not fabricate provider transaction IDs, payment attempts, obligations, commission allocations, seller balances, or ledger entries.
- Old webhook rows are marked `LEGACY_PROCESSED` or `LEGACY_RECEIVED`; legacy `processed=true` and raw event contents are not treated as modern signature verification or capture evidence.
- There is no prior Prisma migration baseline in this repository. The SQL is a delta from the pre-payment schema, so it is not a fresh-database bootstrap and must not be run with `prisma migrate deploy` until an explicit baseline/deployment procedure is agreed. The current production schema state is not available here for comparison.
- Vercel builds no longer run `prisma db push --accept-data-loss` or auto-seed an admin account. Apply a reviewed migration to a backed-up staging database first, reconcile schema/data state, then apply the approved production migration before deploying code that expects the new columns. Do not use `prisma db push --accept-data-loss` for this financial rollout.

No production/staging migration or other target-database mutation was run. The migration file is not an assertion that production has been upgraded.

## Validation status

- Latest `npx prisma validate`, `npm run typecheck`, `npm test -- --run`, `npm run build`, and `git diff --check` all passed. Tests: 7 files, 45 tests; the production build generated 137 routes. Coverage includes commission bounds/instalment rounding, double-entry balances and persistence idempotency/content checks, Paystack test-key initialize/verify HTTP contracts, and production-mode payment gates.
- The migration was executed in an ephemeral in-memory PGlite 0.5.17 environment (PostgreSQL 18.7 on WASM) against SQL generated from the repository's pre-payment `HEAD` schema plus synthetic legacy rows. NGN case/space canonicalization and backfill outcomes, unsupported-currency/out-of-range handling, `Payment.updatedAt`, legacy webhook states, and ledger/attempt constraints/triggers passed. A Prisma diff cross-check found all 128 generated current-schema DDL statements represented in the migration. The rehearsal initially caught an active-attempt index placed before `PaymentAttempt` creation; it was moved after the table and its standard indexes, then the migration passed.
- This is not validation against the actual target PostgreSQL version, production schema, or production data. A staging-copy rehearsal with verified baselines and representative target data remains required. The mocked Paystack HTTP contract passes, but real test-mode provider integration remains blocked until a valid test secret key is configured; the one guarded initialization attempt was rejected with HTTP 401 and created no transaction.
- Dependency audit remediation: `npm audit` reports zero vulnerabilities after compatible updates and targeted transitive overrides for Prisma's `deepmerge-ts` and Next's PostCSS. Clean `npm ci --legacy-peer-deps`, Prisma validation, typecheck, all 45 tests, and the production build passed. Review/remove the overrides when upstream parent packages bundle patched versions.

## Production gates

1. Create and approve an actual migration/baseline plan from the production database's inspected schema; take a restorable backup and rehearse on staging.
2. Configure valid NGN commission rules separately for tailoring and fabric, with approved explicit bases. Rates remain unset until approved.
3. Complete seller identity/bank verification and Paystack subaccount/transfer-recipient verification. Keep settlement routes and payout eligibility disabled until account/business approval and documented admin approval.
4. Set and review the required fabric delivery fee; review processor-fee policy separately. Do not silently pass fees to customers.
5. Configure test/live Paystack keys, callback URL, webhook signing secret, cron secret, and environment-specific flags. Test signed webhooks, duplicate/replayed events, amount/currency/customer mismatch, timeouts, and same-reference transfer/refund verification in Paystack test mode.
6. Run authorization/security, idempotency, concurrency, migration, integration, reconciliation, and fulfillment tests before production launch. Conduct legal, tax, accounting, and operational review independently; no compliance guarantee is made here.

## Paystack references reviewed

- [Transaction API](https://paystack.com/docs/api/transaction/) and [Accept payments](https://paystack.com/docs/payments/accept-payments/)
- [Verify payments](https://paystack.com/docs/payments/verify-payments/) and [Webhooks](https://paystack.com/docs/payments/webhooks/)
- [Split payments](https://paystack.com/docs/payments/split-payments/) and [Subaccounts](https://paystack.com/docs/api/subaccount/)
- [Transfers](https://paystack.com/docs/api/transfer/) and [Refunds](https://paystack.com/docs/payments/refunds/)
