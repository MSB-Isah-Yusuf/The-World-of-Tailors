# Migration & Baseline Plan — `marketplace_financial_core`

**Target migration:** `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql`
**Schema:** `prisma/schema.prisma` (provider `postgresql`)
**Deployed app commit:** `675d53ffc1e6d59d91fce25e33945148f0a1f463` (booking-schema compatibility already live)

---

## 1. Objective

Apply the financial-core schema migration to the production PostgreSQL database so the deployed application (commit `675d53f`) can run against the full financial schema (`quoteStatus`, minor-unit money fields, obligations, ledger, payouts, etc.) instead of the pre-migration compatibility fallback.

This plan establishes a **Prisma migration baseline** against the current production schema, rehearses on a staging copy, and applies the migration only after approval and backup. It intentionally does **not** run `prisma migrate deploy` or `prisma db push --accept-data-loss` against production without inspection, consistent with `VERCEL_DB_FIX.md` and `README.md`.

---

## 2. Gates & preconditions (all required before any production write)

| # | Gate | Evidence needed |
|---|------|-----------------|
| G1 | Production schema inspected read-only | `prisma migrate diff --from-migrations prisma/migrations/... --to-schema-datamodel prisma/schema.prisma` (or introspection) against production, plus a column/table inventory showing which financial-core objects already exist or are missing |
| G2 | Restorable backup taken | Verified `pg_dump` / provider snapshot of production, with a documented restore test |
| G3 | Baseline agreed with database owner | Written confirmation of which migration (if any) production is considered to be at, and that `20261019000000_marketplace_financial_core` is the next delta |
| G4 | Staging-copy rehearsal passed | Migration applied to a disposable copy of production with representative data; row counts and financial invariants validated |
| G5 | App deploy confirmed | Production serving commit `675d53f` (already deployed per user) before users are pointed at the new schema |
| G6 | Production migration approved | Explicit approval to apply the SQL to production |

**Hard constraints (never):**
- Do NOT run `prisma migrate deploy` on production until G1–G3 are complete.
- Do NOT run `prisma db push --accept-data-loss` for this rollout.
- Do NOT seed demo users or create an administrator from a build.
- Do NOT paste database credentials into commits, tickets, or chat.

---

## 3. What the migration touches (blast radius)

Derived from `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql` (880 lines).

### Enums
- `PaymentStatus`: adds `ABANDONED`, `REVERSED`, `DEPOSIT_PENDING`, `PARTIALLY_PAID`, `FULLY_PAID`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REVIEW_REQUIRED` (8 `ALTER TYPE ... ADD VALUE`). **Enum additions are not reversible by a plain rollback.**

### Column additions (existing tables)
- `FabricProduct`: `priceMinor` BIGINT
- `TailoringBooking`: `agreedAmountMinor`, `depositAmountMinor`, `fulfillmentConfirmedAt`, `fulfillmentConfirmedByUserId`, `quoteAcceptedAt`, `quoteDetails` (JSONB), `quoteExpiresAt`, `quoteStatus` TEXT NOT NULL DEFAULT `'NOT_QUOTED'`
- `FabricOrder`: `deliveryFeeMinor`, `fulfillmentConfirmedAt`, `fulfillmentConfirmedByUserId`, `orderGroupId`, `subtotalMinor`, `totalMinor`
- `FabricOrderItem`: `lineTotalMinor`, `priceSnapshotMinor`
- `Payment`: `amountMinor`, `category`, `metadata`, `obligationId`, `paidAt`, `providerFeeMinor`, `providerTransactionId`, `updatedAt` (backfilled from `createdAt`, then NOT NULL), `verifiedAt`
- `PaymentWebhookEvent`: `errorSummary`, `eventType`, `payloadHash`, `processedAt`, `processingStatus` NOT NULL DEFAULT `'RECEIVED'`, `signatureVerified` NOT NULL DEFAULT false, `transactionReference`

### Data backfills (idempotent WHERE clauses)
- Currency canonicalization: case/outer-whitespace `NGN` → `'NGN'` on `FabricProduct`, `TailoringBooking`, `FabricOrder`, `Payment`; other currencies untouched.
- Minor-unit snapshots: `round(<legacy Float> * 100)::bigint` for NGN rows in range `[0, 90071992547409]`; out-of-range/other-currency rows stay `NULL` for review. These are historical snapshots only — **not** Paystack capture evidence.
- `PaymentWebhookEvent.processingStatus` legacy markers: `LEGACY_PROCESSED` / `LEGACY_RECEIVED` where `processingStatus='RECEIVED'` and `signatureVerified=false`.

### New tables
`FabricOrderGroup`, `PaymentObligation`, `PaymentAttempt`, `CommissionRule`, `CommissionAllocation`, `SellerPaymentProfile`, `SettlementPolicy`, `SellerBalanceSummary`, `Payout`, `FinancialJournal`, `FinancialLedgerEntry`, `Refund`, `PaymentDispute`, `PaymentReconciliationItem`, `PaymentReconciliation` — each with PKs and indexes.

### Indexes, FKs, triggers
- ~40 indexes (unique and non-unique), ~25 foreign keys with `RESTRICT`/`SET NULL`/`CASCADE`.
- Append-only triggers rejecting UPDATE/DELETE/TRUNCATE on `FinancialJournal` and `FinancialLedgerEntry`.
- Deferred constraint triggers `FinancialJournal_balanced_at_commit` / `FinancialLedgerEntry_balanced_at_commit` requiring ≥2 entries, matching currency, and equal aggregate debits/credits per journal at commit.

---

## 4. Procedure

### Phase A — Inspect (read-only, production)

1. Connect to production PostgreSQL (read-only role if possible). Do not write.
2. Introspect current schema: tables, columns, enums, indexes, FKs, and whether any `marketplace_financial_core` objects already partially exist.
3. Run `prisma migrate diff` from the repo's migration folder against the production schema/datamodel to enumerate expected vs. actual drift.
4. Record: production PostgreSQL version, applied migration history (if any), row counts for the largest tables being altered (`TailoringBooking`, `Payment`, `FabricOrder`, `FabricOrderItem`, `PaymentWebhookEvent`).
5. Output: a pre-migration schema inventory to attach to the baseline approval.

### Phase B — Backup

1. Take a `pg_dump` (schema + data) or provider snapshot of production.
2. Verify the backup restores to a disposable instance and record row counts for a sample of core tables.
3. Document the restore point identifier and the person who verified it.

### Phase C — Establish baseline

1. With the database owner, agree the production baseline: either "no prior Prisma migrations applied" (baseline = current schema state) or the last applied migration name.
2. If no baseline exists, record that explicitly — this repo has no verified prior Prisma migration baseline.
3. Confirm `20261019000000_marketplace_financial_core` is the next delta to apply, and that applying it will not skip any intermediate migration.

### Phase D — Rehearse (staging copy, no production impact)

1. Restore the verified backup to a staging copy of production (same PostgreSQL major version if possible).
2. Apply `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql` to the staging copy.
3. Validate against the rehearsal checks in Section 5.
4. Fix any failure in the SQL/rehearsal, re-run, and document the final successful application time.
5. Obtain database-owner sign-off on the rehearsed plan.

### Phase E — Apply to production

1. Schedule a maintenance window (low traffic). Notify stakeholders.
2. Re-confirm production serving commit `675d53f` (already deployed).
3. Apply the approved, rehearsed migration SQL to production through the documented deployment process.
4. Immediately run the post-apply verification (Section 5) against production.
5. Only after verification passes, consider the migration applied. The financial code path then expects the new columns; the compatibility fallback in `src/lib/bookings/schema-compat.ts` remains as a safety net but the financial schema is now present.

### Phase F — Closeout

1. Record applied migration, timestamp, actor, and backup restore point.
2. Update `docs/PAYSTACK_MARKETPLACE_IMPLEMENTATION.md` "Migration and deployment safety" to reflect that production has been upgraded (only after production apply).
3. File the baseline approval and rehearsal evidence with the change record.

---

## 5. Rehearsal & post-apply verification checks

- [ ] Migration SQL completes without error.
- [ ] `quoteStatus` column exists on `TailoringBooking` with DEFAULT `'NOT_QUOTED'`.
- [ ] All 8 new `PaymentStatus` enum values present.
- [ ] New financial tables exist with PKs (`FabricOrderGroup`, `PaymentObligation`, `PaymentAttempt`, `CommissionRule`, `CommissionAllocation`, `SellerPaymentProfile`, `SettlementPolicy`, `SellerBalanceSummary`, `Payout`, `FinancialJournal`, `FinancialLedgerEntry`, `Refund`, `PaymentDispute`, `PaymentReconciliation`, `PaymentReconciliationItem`).
- [ ] Indexes and foreign keys created; `PaymentAttempt_one_active_per_payment_idx` partial unique index present.
- [ ] Append-only triggers exist on `FinancialJournal` and `FinancialLedgerEntry`; balanced-at-commit constraint triggers present.
- [ ] `Payment.updatedAt` backfilled from `createdAt` and NOT NULL.
- [ ] Legacy webhook rows marked `LEGACY_PROCESSED` / `LEGACY_RECEIVED`.
- [ ] Row counts match pre-migration counts (no data loss from ALTERs).
- [ ] NGN canonicalization applied only to case/space variants; other currencies untouched.
- [ ] Out-of-range / non-NGN minor-unit backfills remain `NULL` for review (expected).
- [ ] Prisma client regenerates against new schema (`prisma generate`) and `prisma validate` passes.
- [ ] `npm run typecheck`, `npm test -- --run`, `npm run build`, `git diff --check` pass against the migrated schema (rehearsed locally against PGlite already passed; re-confirm against staging).
- [ ] Fresh booking smoke test: customer creates a booking → no `P2022` → booking appears in customer list and tailor list.

---

## 6. Rollback plan

- Data-definition changes (ADD COLUMN, CREATE TABLE, indexes) are **not** cleanly reversible if data has been written to the new columns/tables.
- The supported rollback is **restore from the Phase B backup** to the pre-migration point, then re-establish the baseline.
- Do not attempt a "down" migration — none is authored in this repository.
- Because the deployed app (`675d53f`) uses the compatibility ID-only create path and legacy projections, application traffic remains functional during the window before migration; after migration, rollback to pre-migration schema would require re-deploying pre-`675d53f` code or accepting that financial writes fail. Plan the cutover accordingly.

---

## 7. Sign-off

| Role | Name | Decision | Date |
|------|------|----------|------|
| Database owner | | Baseline + migration approved | |
| Engineering | | Rehearsal passed | |
| Product/ops | | Maintenance window confirmed | |

---

**Related files:** `prisma/schema.prisma`, `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql`, `docs/PAYSTACK_MARKETPLACE_IMPLEMENTATION.md`, `VERCEL_DB_FIX.md`, `README.md` (Deployment caution), `src/lib/bookings/schema-compat.ts`.
