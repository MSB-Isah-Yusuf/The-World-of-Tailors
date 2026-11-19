# Historical Vercel database troubleshooting note — superseded

**Do not follow the old `prisma db push`, `--accept-data-loss`, database seeding, or Vercel build-command instructions recorded in this file's prior version.** They are unsafe for the current financial-core rollout and were not verified against the current target database.

## Current status

- No Vercel/staging/production database was inspected or modified during this work.
- The current Prisma schema requires PostgreSQL. The financial migration `prisma/migrations/20261019000000_marketplace_financial_core/migration.sql` is a delta from the repository's pre-payment schema, not a fresh-database bootstrap.
- The repository has no verified prior Prisma migration baseline. The exact target schema, applied migrations, data constraints, and deployment history must be confirmed before choosing `migrate deploy` or a baseline procedure.
- Vercel builds run `prisma generate && next build`. They must not mutate schema or seed production identities.

## Approved troubleshooting sequence

1. Inspect the selected database and migration history read-only; confirm the database/account/environment and exact schema before any write.
2. Take a verified, restorable backup. Establish the migration baseline and deployment procedure with the database owner.
3. Rehearse the reviewed SQL on a disposable copy of the target database with representative data, validate row counts and financial invariants, and obtain approval.
4. Apply only the approved plan through the documented deployment process, then deploy application code that expects the new schema.

Do not paste database credentials into commits, tickets, or chat. Do not run `prisma db push --accept-data-loss` for the financial rollout. Do not seed demo users or create an administrator from a build. See `docs/PAYSTACK_MARKETPLACE_IMPLEMENTATION.md` and `docs/UAT_SMOKE_REPORT.md` for current gates.
