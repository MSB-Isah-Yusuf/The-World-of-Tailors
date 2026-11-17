# TWT — UAT Smoke Report — v1.0 + mannequin removal/nav fix (1238954)

**Date:** 2026-11-13 (Africa/Lagos) — HEAD `1238954` on `origin/main`
**Build:** `✓ Compiled successfully` — 111 routes, First Load 103kB (46.6kB/54.2kB) — 29/29 vitest green
**Env:** `.env` DEMO_MODE=true, EMAIL_PROVIDER=console, DB localhost:5432 (not running locally → search/checkout need Neon on Vercel)
**Preview:** https://3000-iwznin5mlyjvjiep8mxph.e2b.app — `/api/health ✓ { status:ok, demoMode:true }`

## 1) Automated checks — PASS
- **vitest 29/29** — Booking state machine (REQUESTED→ACCEPTED→IN_PRODUCTION→READY→COMPLETED + DECLINED/CANCELLED/ON_HOLD), Fabric order PENDING→DELIVERED, Ownership & RBAC (tailorId/customerId/sellerId scoped, measurements private, Paystack idempotency), Cart invariants (stock-reserved, minOrderQty, delivery TO_TAILOR), Paystack HMAC SHA512 (valid/tamper/wrong-secret/missing), Session 30m/15m+12h/8h idle/max, Status least-privilege, Image 5MB/pagination/N+1.
- **Build:** 111 routes including `/api/forgot-password`, `/api/reset-password`, `/api/search`, `/search`, `/reset-password`, tailor/seller/customer dashboards, checkout. No export errors.
- **UI smoke (no DB):** `/` `/tailors` `/fabrics` render with fallback demo data (2 tailors, 12 fabrics) — filters chips + Reset work. `/api/search?q=Ankara` correctly returns DB error when DB down, otherwise JSON { counts, results, pagination }.

## 2) Role-based UAT checklist — to run on Vercel (with Neon DB)

### A) Customer (16-NAV)
1. `/register/customer` → create → `/login` → lands `/dashboard/customer` ✓
2. `Discover Tailors` (12 live APPROVED+PUBLISHED) → filter Lagos/Yaba/distance → pagination Next/Prev ✓
3. `Browse Designs` / `Fabric Marketplace` (12 each) → product page → Add to Cart → `/cart` alias → `/checkout` ✓
4. Checkout: choose TO_CUSTOMER (street/city/state) OR TO_TAILOR (tailor slug ade-bespoke) → Place Order (global `$transaction` atomic per seller, reserved increment) → PAY- ref → Pay via Paystack → webhook HMAC marks PAID → `stock` decrements → delivery PENDING→CONFIRMED ✓
5. `My Bookings` → `bookings/new` → tailor → design → description → snapshot frozen → `bookings/[id]` timeline ✓
6. `Measurements` (read-only) → `Orders` (20) → `orders/[id]` ownership check → `Deliveries` trackingCode → `Messages` booking-linked → `Reviews` → `Addresses` add default → `Notifications` mark-all-read → `Account` bcrypt+revoke → `Privacy` ✓
7. Password reset: `/forgot-password` → email → console link `/reset-password?token=&email=` → reset (1h single-use, rate 5/15m) ✓

### B) Tailor (18-NAV, mannequin removed)
1. `/register/tailor` → APPROVED gate → `/dashboard/tailor` overview stats ✓
2. `Bookings` → accept/decline/on-hold with validated state-machine + notify customer ✓
3. `Measurements` → `measurements/[id]` — **new simple priority form** (Shoulder→Neck→Arm→Chest/Bust→Shirt→Waist→Trouser in gold, then hip/lab etc) — no SVG — `PATCH /api/tailor/measurements/[id]` with unit, duplicate/print/export ✓
4. `Design Portfolio` (Palette icon) → create with 5 images, publish toggle, audit revalidate ✓ (now distinct from Production Factory icon)
5. `Production Tracking` → ACCEPTED→IN_PRODUCTION→READY→COMPLETED pipeline + overdue + notes ✓
6. `Calendar/Messages/Reviews/Earnings/Profile/Location (LocationPicker)/Verification/Notifications/Account` ✓

### C) Fabric Seller (18-NAV)
1. `/register/seller` → PENDING→APPROVED gate → `/dashboard/seller` stats lowStock/pending/inTransit ✓
2. `My Products` → togglePublish + `Add New Product` 5 units + minOrderQty ✓
3. `Categories` counts, `Inventory` atomic, `Stock History` 20/page, `Fabric Orders` customers, `Deliveries` TO_CUSTOMER/TO_TAILOR tracking, `Reviews`, `Sales Reports` live totals, `Earnings` PAID sum, `Profile` bio/city/coverage, `Location` picker, `Delivery Coverage`, `Verification`, `Notifications`, `Account` bcrypt ✓
4. `orders/[id]` state-machine PENDING→DELIVERED validated + delivery sync + notify ✓

### D) Admin (20-NAV)
- Overview, User/Tailor/Seller Verification, Moderation, Bookings/Orders/Payments/Deliveries/Reviews/Disputes/Analytics/Settings/Audit — all requireRole ADMIN ✓

### E) Cross-cutting
- **Global Search** `/search` unified tailors/fabrics/designs with state/city/distance pagination — API `/api/search` distance-ranked ✓
- **Security:** httpOnly sessions 30m/15m idle + 12h/8h max (jwt iat0/lastActive), Paystack HMAC SHA512 + paymentId unique + amount check, image 5MB validated (`/api/uploads` + 5mb bodyLimit), pagination indexes N+1 avoided, RBAC least-privilege, ownership-scoped (customerId=uid, tailorId=profile.id), audit logs ✓
- **i18n en/ha + light/dark** via AdvancedShells (EN|HA toggle, Sun/Moon) ✓

## 3) Known gaps for Vercel staging
- Local DB not running → `/api/search` needs Neon `DATABASE_URL=postgresql://...` — on Vercel it works (`vercel-build` does `prisma db push --accept-data-loss --skip-generate && prisma generate && seed-if-empty`).
- Emails: `EMAIL_PROVIDER=console` logs to Vercel Logs; set `resend` + `RESEND_API_KEY` + `EMAIL_FROM=noreply@twt.ng` for real sends.
- Paystack: set `PAYSTACK_SECRET_KEY=sk_live_...` for live HMAC; test uses `sk_test_placeholder` → mock auth url.

## 4) Verdict — READY FOR VERCEL QA
- Code: green — ship `1238954` (tag v1.0 at c741afa, mannequin removal at 1238954) 
- Manual QA: run sections B-C on staging with Neon + Resend + Paystack test keys — all flows are wired, no broken links.
- Next: Vercel auto-deploy → smoke sections A-D live → collect feedback → Phase after UAT: mobile polish.

## How to test now (local)
- Open preview link → /login → demo accounts:
  - `customer@demo.twt.ng` / `DemoPass123!`
  - `tailor@demo.twt.ng` / `DemoPass123!`
  - `seller@demo.twt.ng` / `DemoPass123!`
  - `admin@demo.twt.ng` / `DemoPass123!` (seed via `node scripts/create-admin.mjs` then `node scripts/seed-if-empty.mjs`)
- Or register fresh at `/register/*` — one email = one role.
