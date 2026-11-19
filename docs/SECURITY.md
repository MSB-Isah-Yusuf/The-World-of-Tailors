# Security notes

Snapshot: 2026-10-19. This is an implementation note, not a full security audit or a compliance claim.

## Identity and authorization

- Public registration creates CUSTOMER, TAILOR, or FABRIC_SELLER accounts only. Financial APIs enforce role checks and ownership checks server-side; client-supplied role/amount data is not authorization.
- `scripts/create-admin.mjs` now requires explicit environment-provided identity/password plus a confirmation flag. It creates a new admin only; it never promotes an existing account or resets an existing password. `prisma/seed.ts` and `scripts/seed-if-empty.mjs` are local demo helpers: they require explicit confirmation, loopback PostgreSQL, an empty database, and refuse production execution. They never clear existing data. Demo login endpoints also hard-disable in production, and the demo seed marks all sample payments PENDING rather than fabricating captures.
- Vercel builds no longer auto-sync schema with `prisma db push --accept-data-loss` and do not create production identities. Apply the reviewed database migration separately, after backup and staging rehearsal.
- Do not treat this note as evidence that every legacy application route has been re-audited. Production deployment still needs independent RBAC, session, infrastructure, and operational review.

## Paystack safeguards

- Amounts and obligations are server-owned, integer kobo. Payment initialization rejects client-provided amounts. Checkout does not mark an order paid from a browser redirect.
- Webhooks validate the exact raw request body using the timestamped Paystack signing-secret signature (and the legacy API-key signature only during migration), then independently verify transactions with Paystack before settlement.
- Captures are matched to the local attempt, amount, currency, customer, reference, metadata, and obligation. Mismatches/uncertain state changes go to review and do not fulfil inventory or bookings.
- An uncertain initialization stays locked to its original reference. Admin verification queries that same reference; the application does not automatically issue a replacement attempt.
- Payouts/refunds require controlled approval and provider verification; uncertain transfers/refunds are checked with the original reference, never resent using a new reference.
- Seller bank/provider profiles are role-protected and payout/settlement eligibility remains disabled until verified and explicitly approved.

## Financial ledger

- Application code posts idempotent balanced double-entry journals; it contains no journal/entry update or delete path.
- The PostgreSQL migration adds amount/currency constraints and append-only/balance triggers. These database guarantees are **not active** until the reviewed migration has actually been applied to the target database.
- Ledger balances are internal accounting records, not claims that provider funds are segregated, escrowed, available, or settled. Provider reconciliation remains necessary, especially for Paystack split allocations.

## Outstanding checks

- PostgreSQL migration rehearsal and production schema-baseline review have not been run.
- No Paystack test/live transaction, transfer, webhook, or refund was run.
- The current automated tests are unit/API-guard tests, not a substitute for DB concurrency, integration, penetration, privacy, or external compliance review.
- Dependency vulnerability review: `npm audit` reports zero findings after dependency updates and targeted transitive overrides (`deepmerge-ts` under Prisma config and PostCSS under Next). The clean install, Prisma validation, typecheck, automated tests, and production build all pass. Recheck these overrides on each upstream Prisma/Next upgrade and remove once their bundled dependency versions are patched.
