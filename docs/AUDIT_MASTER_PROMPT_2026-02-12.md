# THE WORLD OF TAILORS — MASTER UPGRADE AUDIT
**Date:** 2026-02-12  •  **Audit scope:** Master Prompt v1 (Admin→Tailor→Seller→Customer)  •  **Codebase tag:** `1a2032d` (69 routes, 39 Prisma models, Next 15.5)  •  **Auditor:** Senior full-stack (architecture/DB/security/perf)

> This is the gate before Phase 1. Every `Placeholder`/`Broken`/`Missing` below becomes a ticket in strict order. No skipping.

### 1. Stack & architecture (verified)

| Layer | Verdict | Detail |
|---|---|---|
| Framework | ✅ | Next.js 15.5.28 App Router, React 19, TypeScript strict, Tailwind+shadcn, Framer Motion |
| ORM/DB | ✅ | Prisma 6.4.1, 39 models, SQLite dev / `postgresql` prod via `prisma db push` on Vercel `vercel-build` |
| Auth | ✅+gap | NextAuth v5 beta25 `Credentials` + PrismaAdapter, JWT httpOnly Secure SameSite, `requireAuth/requireRole` server RBAC; **missing:** inactivity-timeout server invalidation (only middleware 429), MFA, concurrent-session UI |
| Sessions | ⚠️ | JWT maxAge 7d, no per-role inactivity timeouts (15m admin/30m others) — prompt §10.3 not implemented |
| RBAC | ✅ | `CUSTOMER/TAILOR/FABRIC_SELLER/ADMIN`, least-privilege, ownership `where tailorId=profile.id` on every dashboard query, `BookingStatusHistory/AuditLog` |
| Layout | ✅ fixed | `AdvancedShell` (Tailor 15), `AdvancedSellerShell` (11), `AdvancedCustomerShell` (7), `DashboardShell` legacy — sidebar defined centrally, persistent, active highlight, mobile drawer+bottom-nav, no disappearing on refresh/back |
| Payments | ✅ core | `PAYSTACK_SECRET_KEY` HMAC SHA512 verify, webhook idempotent `PaymentWebhookEvent.eventId unique`, `reserved` atomic, `PAY-FO-…` per seller order |
| Maps | ✅ | NG 37 states + lat/lng + Nominatim reverse + OSM iframe, `LocationPicker`, `HomepageLocationSelector`, `distanceKm` ranking exact→state→others |
| Media | ✅ | `src/lib/storage.ts` MIME+5MB validate, `MAX_IMAGES_PER_DESIGN=5`, cover+sort, local→S3 ready |
| Notifications | ✅ core | `Notification` + `createNotification()` on booking transitions/checkout/PAID, `/notifications` page, header bell unread |
| Cart/Checkout | ✅ | `/api/cart` ownership + `available=stock-reserved`, `/api/checkout` seller-grouped atomic `reserved+=qty`, `/checkout/CheckoutClient` + `AddToCart` |
| Tests | ✅ | `vitest 3.2` + `16` authz tests (booking/fabric order machines, RBAC contracts, inventory invariants) |
| Docs | ✅ | `README/ERD/ARCHITECTURE/DEPLOYMENT/SECURITY`, `sitemap/robots/manifest`, CSP/HSTS middleware |

---

### 2. Functionality inventory — by role

Legend: **FF** Fully Functional, **PF** Partially, **PH** Placeholder, **BR** Broken, **MS** Missing. Every PH/BR/MS blocks Definition of Done §20.

#### ADMIN (prompt requires 20; repo has 5)

| # | Prompt item | Route | Status | Finding |
|---|---|---|---|---|
|1|Overview|`/admin`|PF| Live stats (pending verifs, users, orders, audit 5) but no charts (registration/booking/revenue trends), no empty-state for zero data beyond fallback|
|2|User Management|`/admin/users`|FF| Live search/role/status, suspend→revoke sessions+ `ADMIN_SUSPENDED_USER` audit, pagination — **done**|
|3|Customer Management|—|MS| No `/admin/customers` — customers only via users filter|
|4|Tailor Management|—|MS| No `/admin/tailors` table separate from verification|
|5|Fabric Seller Management|—|MS| No `/admin/sellers` table|
|6|Tailor Verification|`/admin/verification`|FF| PENDING tailors+sellers, approve→`APPROVED+isPublished`+`APPROVE_TAILOR` audit+notify, reject+reason — **done** (needs UNDER_REVIEW/RESUBMISSION_REQUIRED extra statuses)|
|7|Seller Verification|merged in 6|PF| Same page serves both; prompt wants separate 7 but single queue is acceptable — mark PF until statuses expanded|
|8|Design Moderation|—|MS| No `/admin/designs` approve/reject/unpublish with history preservation|
|9|Fabric Product Moderation|—|MS| No `/admin/fabrics` moderation|
|10|Tailoring Bookings|`/admin/orders` (fabric only)|PF| Fabric orders oversight exists, but no dedicated tailoring bookings oversight|
|11|Fabric Orders|`/admin/orders`|FF| Live seller-grouped overview, status filters|
|12|Payments & Transactions|—|MS| Fabric `Payment` visible via orders but no `/admin/payments` with refunds/commissions/payouts ledger|
|13|Deliveries|—|MS| No `/admin/deliveries` tracking |
|14|Reviews & Reports|—|MS| No `/admin/reviews` moderation queue |
|15|Disputes & Complaints|—|MS| No `/admin/disputes` |
|16|Notifications|—|MS| No `/admin/notifications` broadcast |
|17|Analytics & Reports|—|MS| No charts; prompt charts (registration, tailor/seller growth, booking, marketplace, revenue, verification) must be real DB aggregates |
|18|Platform Settings|—|MS| No `/admin/settings` (identity, countries/regions/cities, verification requirements, categories, languages, currency, session timeouts, upload limits, policies) |
|19|Security & Audit Logs|`/admin/audit`|FF| Paginated audit with action filter, metadata |
|20|Admin Profile|—|MS| No `/admin/profile` (self profile, password, sessions) |

**Admin gaps:** 11 MS, 3 PF → not done. Must create 11 pages + charts + expand verification statuses + split tailors/sellers management + payments/disputes/notifications/settings/profile.

#### TAILOR (prompt 19; repo 15)

| Prompt | Route | Status | Gap |
|---|---|---|---|
|Overview|`/dashboard/tailor`|FF| live scoped stats|
|Booking Requests|`/dashboard/tailor/bookings`|FF| unified; prompt wants split Accepted vs Requested but query param filter covers it — PF until split|
|Accepted Bookings| (filter `?status=ACCEPTED`) |PF| same page, needs dedicated tab + actions|
|My Customers|`/dashboard/tailor/customers`|FF| registered+walk-in via TailorCustomer|
|Customer Measurements|`/dashboard/tailor/measurements`|FF| MannequinClient 21 hotspots, save/PATCH, gender/garment templates|
|Measurement History|`/dashboard/tailor/measurements/records`|PH| stub — needs per-customer history timeline + snapshots|
|My Designs/Portfolio|`/dashboard/tailor/designs`|FF| multi-upload cover/reorder, publish gate APPROVED, delete archive|
|Active Production|`/dashboard/tailor/production`|PF| scoped in-production list but prompt wants progress updates+ notes+ history notify — partial|
|Ready for Collection|—|MS| no `/dashboard/tailor/ready`|
|Completed Orders|`/dashboard/tailor/completed`|PF| exists but thin — needs archive + earnings link|
|Calendar & Availability|`/dashboard/tailor/calendar`|PH| deadlines from estimatedCompletion only; no appointments, blocked dates, working hours, overlap guard|
|Messages|`/dashboard/tailor/messages`|PH| placeholder shell|
|Reviews|`/dashboard/tailor/reviews`|PF| ratingAvg/count from DB but no review response/reports|
|Earnings & Payments|`/dashboard/tailor/earnings`|PF| totals from PAID, but no commission/payout tracking, refunds|
|Business Profile|`/dashboard/tailor/profile`|FF| name/bio/city/deliveryCoverage + publish gate|
|Location Settings|`/dashboard/tailor/location`|FF| LocationPicker PATCH /api/tailor/location|
|Verification Status|—|MS| no `/dashboard/tailor/verification` (PENDING→APPROVED flow visible to tailor)|
|Notifications| `/notifications` global|PF| global page exists but no tailor-scoped bell/filter|
|Settings|`/dashboard/tailor/account`|PH| account page is placeholder — needs sessions/password/prefs/MFA|

#### FABRIC SELLER (prompt 18; repo 11)

| Prompt | Route | Status | Gap |
|---|---|---|---|
|Overview|`/dashboard/seller`|FF| live counts|
|My Products|`/dashboard/seller/products`|FF| create draft + togglePublish audit|
|Add New Product| (inside products)|PF| prompt wants dedicated `/add` route + dedicated form UX — currently inline|
|Product Categories|—|MS| no `/dashboard/seller/categories`|
|Inventory Management|`/dashboard/seller/inventory`|FF| stock vs reserved vs available + movement history|
|Stock Movement History|merged in inventory|PF| prompt wants separate history page|
|Incoming Orders|`/dashboard/seller/orders`|FF| state-machine PENDING→DELIVERED + delivery sync|
|Order Details| (in orders)|PF| list only — needs `/orders/[id]` detail + timeline|
|Customers|`/dashboard/seller/customers`|PF| derived via FabricOrder sellerId but no addresses/notes|
|Deliveries|`/dashboard/seller/delivery`|PF| shows coverage but not active deliveries tracking|
|Reviews|`/dashboard/seller/reviews`|PF| aggregate only|
|Sales Reports|—|MS| no `/dashboard/seller/reports`|
|Earnings & Payments|`/dashboard/seller/earnings`|PF| totals only|
|Business Profile|`/dashboard/seller/profile`|FF|
|Location Settings|`/dashboard/seller/location`|FF|
|Verification Status|—|MS| no `/dashboard/seller/verification`|
|Notifications|global|PF| same as tailor|
|Settings|`/dashboard/seller/account`|PH| placeholder|

#### CUSTOMER (prompt 17; repo 7 shell)

| Prompt | Route | Status | Gap |
|---|---|---|---|
|Overview|`/dashboard/customer`|FF| real counts|
|Discover Tailors|`/tailors` public|FF| but prompt wants it **inside customer dashboard** as `/dashboard/customer/discover` nav too — MS for nav|
|Browse Designs|`/designs` public| same |MS nav|
|Fabric Marketplace|`/fabrics` public|same|MS nav|
|My Tailoring Bookings|`/dashboard/customer/bookings`|PF| exists but Booking Details page missing|
|Booking Details|`/dashboard/customer/bookings/[id]`|MS| no detail timeline|
|My Measurements|`/dashboard/customer/measurements`|PF| read-only consent + snapshot note but no edit/create profiles|
|Fabric Orders|`/dashboard/customer/orders`|PH| legacy DashboardShell placeholder|
|Shopping Cart|`/checkout`|PF| CheckoutClient fully functional but prompt wants `/dashboard/customer/cart` alias too|
|Favorites|`/dashboard/customer/favorites`|PH| DashboardShell placeholder|
|Messages|—|MS| no `/dashboard/customer/messages`|
|Delivery Tracking|—|MS| no `/dashboard/customer/deliveries`|
|Reviews|`/dashboard/customer/reviews` shell|PH| placeholder|
|Addresses|`/dashboard/customer/addresses`|PH| placeholder|
|Notifications|`/notifications`|PF| global page not customer-scoped nav|
|Account Settings|—|MS| no `/dashboard/customer/account` (sessions/password/prefs)|
|Privacy & Security|—|MS| no `/dashboard/customer/privacy`|

---

### 3. Cross-cutting audit

| Area | Status | Findings |
|---|---|---|
| Sidebar consistency | FF | Central `NAV` in each shell, active highlight, `pathname===href`, mobile drawer+bottom-nav, no disappear on refresh/back — **fixed in 1a2032d** |
| Forms validation | PF→FF | Zod+ RHF on register, LocationPicker lat/lng -90..90 + serviceRadius validation, cart minOrderQty, checkout address required, Paystack HMAC — **good**, but tailor calendar/messages, seller categories, admin settings still missing forms |
| DB schema | 39 models PF | Missing: `BusinessVerification`, `VerificationDocument`, `ServiceArea`, `Appointment`, `ProductionUpdate`, `Payout/Commission/Refund`, `Complaint/Dispute`, `Conversation/Message`, `UserSession` exact (we use `Session`), `SecurityEvent` — need to add without breaking 39 |
| Ownership | FF | Every dashboard query scoped (`tailorId/customerId/sellerId`), `assertOwnership` in transitions, measurements never in public APIs |
| Buttons | 90% FF | Cart/AddToCart, Checkout place→pay, booking transitions, verification approve, user suspend — all server actions/audit. Remaining dead buttons: tailor messages/calendar, seller categories/reports, customer favorites/addresses/reviews, admin moderation — to be wired |
| Maps | FF | No fabrication — `distanceKm` Haversine, exact→state→others ranking |
| File upload | FF | 5MB/MIME, cover/sort, `storeImage` local→S3 ready, `POST /api/uploads` auth |
| Payments | FF core | Atomic reserve, per-seller orders, webhook HMAC+idempotent+stock commit — **done**; needs refunds/commissions/payouts UI |
| Notifications | PF | In-app + unread polling; email via `console`/`resend` — needs per-role prefs + SMS templates |
| I18n/Theme | FF | `EN|HA` DICT + `light/dark/system` persisted `PATCH /api/preferences`, shell toggles |
| Perf | PF | No N+1 (aggregate `count/groupBy`), pagination 12/20/30, `First Load 103kB`, Next image not yet `<Image optimized>` — to fix |
| A11y | PF | Semantic headings, labels, aria-label on cart/bell/search, contrast ivory/midnight ok — needs axe audit on each new page |
| Security | PF→FF | CSP/HSTS/X-Frame middleware, rate-limit 30/min, bcrypt10, `paymentWebhook` verify, audit logs — **needs** per-role inactivity timeouts §10.3 (15m admin/30m others), concurrent-session UI §10.4, MFA optional |

---

### 4. Required migrations & integrations (no destructive)

1. Extend `User`? Not needed — roles already `ADMIN` (prompt SUPER_ADMIN→ADMIN alias). Add `BusinessVerification` (polymorphic tailor/seller), `VerificationDocument`, `Appointment`, `ProductionUpdate`, `Commission/Payout/Refund`, `Complaint`, `Dispute`, `PlatformSettings` singleton.
2. Add `inactivityTimeoutMinutes` to `UserPreference` or new `PlatformSettings` row.
3. Keep `TailorProfile.businessStatus PENDING/APPROVED/REJECTED/SUSPENDED + UNDER_REVIEW/RESUBMISSION_REQUIRED`; add columns `verifiedAt/verifiedById/rejectionReason/resubmissionNote`.
4. S3/Resend/Mapbox/Paystack already env-gated — no new deps unless `@aws-sdk/client-s3` needed for prod.

### 5. Test gaps
- 16 vitest pass on state-machines/RBAC/inventory, but no E2E for full journeys (customer→tailor→seller→admin). Need Playwright/cypress for §18 journeys.

### 6. Broken routes/buttons — consolidated
- Admin: 11 missing routes → 404 until created.
- Tailor: `records` stub, `messages` placeholder, `ready` missing, `verification` 404, `account` inert.
- Seller: `categories/reports/verification/account` 404/placeholder.
- Customer: `bookings/[id]`, `messages`, `deliveries`, `account/privacy`, `favorites/addresses/reviews/orders` placeholders all show `This module is implemented…` generic.

### 7. Go-forward plan (strict order, no skip)

**PHASE 1 ADMIN** (this audit → 11 pages):
1) Tailor Management + Seller Management tables (search/filter/suspend).
2) Design Moderation + Fabric Moderation (preview approve/reject/request-edits/unpublish, preserve history).
3) Tailoring Bookings oversight + Deliveries.
4) Payments/Transactions ledger + Analytics charts (real aggregates).
5) Reviews/Disputes + Notifications broadcast + Platform Settings (countries/regions/cities, categories, languages, currency, session timeouts, upload limits) + Admin Profile + missing verification statuses. **Verify:** every nav works, sidebar persists, DB updates, audit log.

Then Phase 2 Tailor → 3 Seller → 4 Customer → 5 Global Integration → 6 Security/Perf/Tests (per prompt §4 order).

> Gate: we do not touch Phase 2 pages until Admin nav 20/20 green.

---

End of audit. Next action: implement Phase 1 Admin item by item, commit per item, `next build` + `npm test` each.
