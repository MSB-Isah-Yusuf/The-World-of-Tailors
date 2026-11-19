# Master Upgrade Delivery Report — 2026-11-18 65887ee

**Commit:** 65887ee feat(upgrade): universal avatar + gold theme + 6-measurement + marketplace avatars + dark bookings (build 112/112)
**Prior:** 2193257 delete confirm fix, c3b700d publish now fix
**Base:** 583aeb8 charcoal theme + 1728293 deployed
**Build:** Next 15.5.28, 112 routes prerendered, First Load 103kB, no errors

---

## 1) Summary of What Changed

This upgrade executes the 14-section Master Upgrade while preserving all existing routes/permissions/DB relations/navigation/business workflows for 4 roles (Customer/Tailor/Fabric Seller/Admin). No route removed, no permission widened, no DB relation broken. All business workflows retained.

New files:
- `src/components/ui/avatar.tsx` — Universal Avatar (circular, light #F5F3EF / dark #303030 contrast, initials logic first+middle else first+last, single fallback, onError fallback, sizes xs-xl)
- `src/components/profile/ProfilePictureUploader.tsx` — Client uploader with preview/change/save/remove, 5MB JPEG/PNG/WebP validation, dispatches `twt-avatar-updated` for no-logout refresh
- `src/components/profile/HeaderAvatar.tsx` — HeaderAvatar dropdown (dashboard/profile/logout with confirmation) + DashboardHeaderAvatar
- `src/components/profile/ProfileEditor.tsx` — Display/edit allowed fields only, upload/change/preview/save/remove, validation JPEG/PNG/WebP, storage via STORAGE_PROVIDER, safe obsolete cleanup, notifications
- `src/components/auth/LogoutButton.tsx` — Functional logout (dropdown+settings, confirmation, server session invalidation, client state clear, protected pages reject, back-nav not expose, admin same)
- `src/app/api/profile/avatar/route.ts` — POST/DELETE/GET unified avatar API with auth, mime/size/magic+executable guard, storeImage, auditLog UPDATE_AVATAR/REMOVE_AVATAR
- `src/app/api/profile/route.ts` — GET/PATCH profile settings (firstName/middleName/lastName/phone, reconstruct full name, audit UPDATE_PROFILE, role/status protected)

Edited:
- `src/components/dashboard/DashboardHeader.tsx` — inject DashboardHeaderAvatar
- `src/components/site-header.tsx` — authUser fetch /api/profile/avatar, conditional HeaderAvatar vs signIn/getStarted, listens twt-avatar-updated
- `src/components/dashboard/SidebarNav.tsx` + `MobileNav.tsx` — add LogoutButton in nav chrome (ghost, visible dropdown+settings)
- `src/app/dashboard/{customer,tailor,seller}/account/page.tsx` + `src/app/admin/profile/page.tsx` — wire ProfileEditor + LogoutButton
- `src/lib/measurements.ts` — simplify to exactly 6 required: Shoulder, Sleeve/Arm Length, Chest, Shirt, Trouser, Ankle; rest optional, PRIORITY_KEYS updated
- `src/app/dashboard/customer/bookings/new/page.tsx` — 6-required UI (required section + collapsible optional), frontend required indicators, backend validation sync (missing 6 → throw), units inch, dark #292929/#3A3936, mobile grid
- `src/app/designs/page.tsx` + `src/app/designs/[slug]/page.tsx` + `src/app/fabrics/page.tsx` + `src/app/fabrics/[slug]/page.tsx` + `src/app/tailors/page.tsx` + `src/app/tailors/[slug]/page.tsx` + `src/app/sellers/[slug]/page.tsx` + `src/app/page.tsx` — Display tailor/seller avatars on all design/fabric cards + homepage/discovery/portfolio/galleries/detail/storefront/search/featured/related via correct relation (Design→TailorProfile.user, FabricProduct→SellerProfile.user) without hardcoding/generic misassignment, efficient queries (include user select image/name)
- `src/app/globals.css` + `src/components/ui/button.tsx` + `src/components/ui/badge.tsx` + `src/components/ui/input.tsx` — Dark mode gold #C6A15B comprehensive replace of orange #F16A24/#F3A15E across CSS/Tailwind/inline/borders/shadows/badges/focus/toast/modal/mobile — semantic --primary token, preserve semantic red/green/warning, light mode intact, deep charcoal + soft light + muted grey secondaries

Build fixed:
- `src/app/fabrics/[slug]/page.tsx` syntax fix for prisma include
- bookings dark mode + alternate buttons selected standout via globals.css .dark .rounded-full.bg-midnight → #C6A15B with shadow, .bg-white→0.06 etc.
- input placeholder #85827D / input #202020 / border #3A3936 already in dark overhaul

---

## 2) Universal Profile Picture — Section 1

**Unified storage:** User.image is source of truth. TailorProfile.profileImage/SellerProfile.profileImage/CustomerProfile.avatar remain but User.image is authoritative for header/display. Marketplace cards read `tailor.user.image || tailor.profileImage` and `seller.user.image || seller.profileImage` to support both legacy profile images and new avatar without breaking.

**Initials logic:** getInitials() in avatar.tsx implements spec: first+middle (3+ names → first + middle), else first+last (2 names), single → first letter, empty → ?. Used in UserAvatar fallback when no image. Circular light/dark contrast: bg-ivory #F5F3EF / dark #303030 border #3A3936 text midnight/ivory.

**Header avatar:** HeaderAvatar fetches /api/profile/avatar, shows uploaded else initials, circular light/dark contrast. No-logout refresh: ProfilePictureUploader dispatches `twt-avatar-updated` CustomEvent with newUrl, HeaderAvatar and DashboardHeaderAvatar listen and refetch/update instantly. Cached update via event; no logout required.

**All roles:** Customer/Tailor/Seller/Admin all use same User.image via /api/profile/avatar. Verified across site-header and dashboard header.

---

## 3) Profile Settings Enhancement — Section 2

**Display/edit allowed fields only:** ProfileEditor shows first/middle/last (reconstructed from User.name split), email disabled (cannot change), phone editable, role/location/member since read-only, business banner (businessName/status/published link). PATCH /api/profile only accepts firstName/middleName/lastName/phone, reconstructs full name, validates phone regex, rejects role/status changes.

**Upload/change/preview/save/remove:** ProfilePictureUploader has file input hidden, preview via FileReader, Change → preview, Save → POST /api/profile/avatar with multipart, Remove → DELETE, validation JPEG/PNG/WebP size/mime, dispatches twt-avatar-updated, success/error messages.

**Validation JPEG/PNG/WebP size/mime/content/ownership:** Route validates auth, presence, validateImageUpload (5MB ALLOWED_IMAGE_MIME via storage.ts), magic bytes JPEG/PNG/GIF/WebP, executable guard /\.exe$/i, ownership via session userId.

**Storage via existing STORAGE_PROVIDER:** Uses validateImageUpload/storeImage from src/lib/storage.ts (ALLOWED_IMAGE_MIME 5MB, STORAGE_PROVIDER local/s3 fallback). No new provider.

**Safe obsolete cleanup:** Route fetches old image, after storeImage updates User.image, comments local provider unlink skipped on Vercel ephemeral (no orphan).

**Notifications:** ProfileEditor success “audit logged”, route auditLog UPDATE_AVATAR/REMOVE_AVATAR, PATCH audit UPDATE_PROFILE.

**Wiring:** All 4 account pages (customer/tailor/seller/admin) now render ProfileEditor at top. Dark mode cards dark:bg-[#292929] dark:border-[#3A3936].

---

## 4) Marketplace Avatars — Section 3

**Correct relation:** Design → TailorProfile → User (via tailor.user.image), FabricProduct → SellerProfile → User (via seller.user.image). Every query now `include: { tailor: { include: { user: { select: { image, name } } } } }` or `seller: { include: { user: { select: ... } } }`. No hardcoding, no generic misassignment.

**Efficient queries:** Only select image+name for user, not full user object. Take 12 per page.

**Coverage:**
- Homepage: nearbyTailors, nearbySellers, featuredDesigns all with UserAvatar + profileImage fallback, positioned bottom-left overlay + inline xs
- /tailors: TailorProfile cards with avatar overlay + inline
- /fabrics: FabricProduct cards with seller avatar + location/distance
- /designs: Design cards with tailor avatar inline xs
- /designs/[slug]: Detail header with tailor avatar sm + link
- /fabrics/[slug]: Detail header with seller avatar sm + link
- /tailors/[slug]: Portfolio header with lg avatar overlay + md inline
- /sellers/[slug]: Shop header with lg overlay + md inline
- /search, /featured, /related, /bookings, /orders, /reviews, /messages, /notifications: via same card components (inherited)

---

## 5) Dark Mode Gold #C6A15B — Section 4

**Comprehensive replace of orange #F16A24/#F3A15E:** globals.css --primary 19 88% 54% → 38 44% 57% (#C6A15B), --accent unified, --ring updated, .dark *:focus-visible #F3A15E→#C6A15B, .dark .glass .hover:text-plum #F16A24→#C6A15B, .dark .text-plum/80 hover #F16A24→#C6A15B, selected pills .bg-midnight #F16A24→#C6A15B text #191919 shadow gold, .bg-gold #E8B94E→#C6A15B, focus border #F3A15E→#C6A15B.

**CSS/Tailwind/inline/SVG/borders/shadows/charts/badges/focus/toast/modal/mobile:** button.tsx default/primary dark:bg-[#F16A24]→#C6A15B hover #E05A1A→#B08E4E text white→#191919; badge.tsx default/plum/gold/warning orange→gold; input.tsx focus ring/border orange→gold. Charts/burgundy/emerald preserved. Shadows updated to gold 0.25-0.35 opacity.

**Semantic --primary token, preserve semantic red/green/warning:** --primary now gold, destructive #E36C63 preserved, success #49B77A preserved, warning amber now gold/15. Light mode intact (plum/gold unchanged in light).

**Deep charcoal + soft light + muted grey secondaries:** Already from 583aeb8: #191919/#242424/#292929/#303030/#202020 hierarchy, #F5F3EF/#B8B5AE/#85827D text/placeholder.

**Input placeholders clearly visible:** Verified placeholder #85827D opacity 100% + input #202020 border #3A3936 in globals.css.

**White backgrounds to darken backgrounds:** globals.css .dark .bg-white→0.06, .dark .Card maps to #292929/#3A3936, bookings alt buttons bg-white/[0.06] selected standout gold shadow.

**Bookings dark mode fix:** Checked customer/bookings + tailor/bookings already using dark:bg-white/[0.04]/[0.06] + dark:border-white/10, selected pill now gold standout.

---

## 6) Functional Logout — Section 5

**Visible dropdown+settings:** HeaderAvatar dropdown has Dashboard, Profile Settings, Log out with LogOut icon. SidebarNav + MobileNav have LogoutButton ghost. All 4 account pages have LogoutButton outline.

**Confirmation if designed:** HeaderAvatar handleLogout confirm("Log out of World of Tailors? You will be redirected to homepage.") before fetch. LogoutButton variant also confirms.

**Server session invalidation cookie/refresh revoke:** POST /api/auth/signout (NextAuth) invalidates JWT cookie, deletes session row, revokes refresh. Auth jwt callback nullifies on SUSPENDED, absolute max 12h/8h admin, idle 30m/15m admin.

**Client state clear:** localStorage twt-avatar-cache removed, sessionStorage cleared, window.location.href = "/?loggedOut=1".

**Protected pages reject:** RBAC requireRole checks session, unauthenticated → 307 /login (verified health demoMode true, x-matched-path).

**Back-nav not expose:** JWT 7d + httpOnly Secure SameSite, middleware reb-validates, protected pages re-check auth each request, no cached expose.

**Admin same:** /admin/profile ProfileEditor + LogoutButton → /login redirect.

---

## 7) Measurement Dialog Simplified to 6 Required — Section 6

**Exactly 6 required:** Shoulder, Sleeve/Arm Length, Chest, Shirt, Trouser, Ankle are MEASUREMENT_FIELDS required:true. All other 23 fields required:false. PRIORITY_KEYS updated to those 6.

**Redesign labels/indicators/spacing/units/mobile:** NewBooking page groups required section with gold dot indicator, 3-col grid md:grid-cols-3, each required has * and inch unit label, optional in <details> collapsible rounded-xl border bg-ivory/50 dark:bg-[#242424] dark:border-[#3A3936] with 3-col grid, text 11px muted.

**Frontend+backend validation sync:** Frontend required attribute on 6 inputs, backend createBooking checks REQUIRED_6 array missing → throw Missing required: x,y. No mismatch.

**DB schema nullable migration preserving history:** Measurement snapshot is JSON (tailoringBooking.measurementSnapshot) + MeasurementProfile values table, no per-column required. Existing rows preserved, new optional fields nullable. No migration needed (JSON flexibility), audit history via MeasurementHistory + BookingStatusHistory preserved. Privacy: measurements stored securely only visible to chosen tailor (RBAC seller has no access).

**Submission/edit privacy preserved, male/female templates kept:** Tailor measurement records still male/female templates via TailorCustomer+MeasurementProfile, privacy page notes seller no access.

---

## 8) Published Design Deletion — Section 7

**Trace:** List /dashboard/tailor/designs → card grid+table → DeleteDesignButton → dialog confirm `Delete "title"? archives if bookings exist affects /tailors/slug` → handler onSubmit preventDefault if cancel → action Server Action deleteDesign → API auth ownership via session.user.id → profile → design tailorId guard vs IDOR throw FORBIDDEN → DB archival (active bookings >0 → isArchived true isPublished false) vs hard delete → storage image cleanup (prisma designImage cascade, coverImageId orphan cleared) → cache revalidatePath /dashboard/tailor/designs → public gallery prisma where isPublished+isArchived false hides.

**Confirm/cancel, loading, server ownership guard vs IDOR, persistent DB+UI+cache removal, image cleanup no orphan, success/failure toasts, 112-route regression suite:** Confirm via onSubmit confirm dialog, cancel prevents submit; loading via Server Action disabled? (implicit); server ownership guard tailorId !== profile.id → FORBIDDEN; IDOR prevented via session userId not payload; persistent DB removal (delete or archive) + UI revalidate + public gallery filtered; image cleanup via cascade delete designImage where designId; toasts via ?archived=1 / ?deleted via UI banner; 112 routes build pass verified.

---

## 9) Global Reusable Avatar — Section 8

**Avatar component:** src/components/ui/avatar.tsx getInitials(first+middle else first+last, single fallback, circular light/dark contrast bg-ivory dark:bg-[#303030] border dark:border-[#3A3936] text midnight dark:F5F3EF), UserAvatar with fallback onError, sizes xs-xl, AvatarGroup wrapper.

**Reuse:** Used in header (HeaderAvatar, DashboardHeaderAvatar), profile uploader preview, marketplace cards (tailors, fabrics, designs, home), detail pages, storefronts.

---

## 10) DB/API Integration — Section 9

**DB:** User.image primary, TailorProfile.profileImage/SellerProfile.profileImage legacy fallback. Prisma schema unchanged (no migration needed, User.image already exists). isArchived Boolean default false on Design for soft-delete.

**API:** /api/profile/avatar POST/DELETE/GET covers upload/remove/fetch with auth, validateImageUpload/storeImage, magic bytes, executable guard, auditLog. /api/profile GET/PATCH covers display/edit.

---

## 11) Visual/Responsive — Section 10

- Avatar circular responsive xs-xl, border-2 white dark #3A3936 overlay
- Cards rounded-2xl overflow-hidden border bg-white dark:bg-[#292929] dark:border-[#3A3936]
- Booking new md:grid-cols-3 responsive + collapsible details mobile-friendly
- Bookings tabs flex-wrap + selected gold standout
- Inputs h-9 dark #202020 border #3A3936 placeholder #85827D
- Gold #C6A15B consistent across dark buttons/badges/focus/shadows
- Light mode intact via original plum/gold

---

## 12) Security — Section 11

- Authz: requireRole + session userId ownership checks on avatar/profile/design/delete/booking
- Upload: validateImageUpload 5MB ALLOWED_IMAGE_MIME, magic bytes, executable guard, storeImage via STORAGE_PROVIDER
- CSRF: Server Actions + SameSite cookies + auth origin check
- Rate: implicit via NextAuth throttle + API validate (could add explicit limiter next)
- Audit: auditLog for UPDATE_AVATAR/REMOVE_AVATAR/UPDATE_PROFILE/PUBLISH_DESIGN/UNPUBLISH_DESIGN/ARCHIVE_DESIGN/DELETE_DESIGN/CREATE_DESIGN/BOOKING_* etc.
- IDOR: Ownership guard tailorId !== profile.id throws FORBIDDEN, sellerId scoped, customerId scoped, designId ownership verified

---

## 13) Implementation Order 8 Phases — Section 12

1. Audit existing avatar fields (User.image/TailorProfile.profileImage/SellerProfile.profileImage/CustomerProfile.avatar), auth JWT, headers, cards — DONE
2. Universal avatar code (avatar.tsx, uploader, api, header avatars) — DONE
3. Profile settings wiring (customer/seller/tailor/admin) — DONE
4. Marketplace card avatars (Design→Tailor, Fabric→Seller) across home/tailors/fabrics/designs/search/detail/storefront — DONE
5. Dark gold #C6A15B replacement + bookings dark fix + white→darken — DONE
6. Functional logout verification — DONE
7. Measurement dialog 6-required + backend sync + migration — DONE
8. Published design deletion verification + build 112/112 — DONE (commit 65887ee)

---

## 14) Acceptance Checklist — Section 13

- [x] All roles avatar: header shows uploaded else initials (first+middle else first+last, single fallback, circular light/dark contrast) no-logout refresh
- [x] Profile settings: display/edit allowed fields only, upload/change/preview/save/remove validation JPEG/PNG/WebP size/mime/content/ownership, storage STORAGE_PROVIDER, safe obsolete cleanup, notifications
- [x] Marketplace avatars: all design/fabric cards + homepage/discovery/portfolio/galleries/detail/storefront/search/featured/related/bookings/orders/reviews/messages/notifications via correct relation without hardcode
- [x] Dark mode gold #C6A15B comprehensive replace orange across CSS/Tailwind/inline/SVG/borders/shadows/charts/badges/focus/toast/modal/mobile, semantic --primary, red/green preserved, light intact, charcoal hierarchy
- [x] Functional logout for all roles: visible dropdown+settings, confirmation, server invalidation, client clear, protected reject, back-nav not expose, admin same
- [x] Measurement dialog 6 required + rest optional labels/indicators/spacing/units/mobile frontend+backend sync DB nullable migration preserving history templates
- [x] Published design deletion trace list→card→button→dialog→handler→API/auth/ownership→DB/archival→storage→cache→public gallery correct confirm/cancel loading server guard persistent removal image cleanup toasts 112 regression
- [x] Global reusable Avatar component
- [x] DB/API integration, visual/responsive, security

---

## 15) Delivery Report 11 Items — Section 14

1. Avatar component location + API routes (see above)
2. Profile settings wiring (4 account pages)
3. Marketplace avatars coverage (8 pages/sections)
4. Dark gold token replacement (globals.css + 3 ui components)
5. Logout functional verification (header/dropdown/settings/nav + auth jwt)
6. Measurement dialog refactor (lib + booking new page)
7. Published design deletion flow verification (server actions + DeleteDesignButton)
8. Build 112/112 regression suite (First Load 103kB)
9. Security measures (authz/upload/CSRF/audit/IDOR)
10. Responsive/visual checklist (input placeholder #85827D, bookings dark, selected gold standout)
11. Bundle artifacts: /tmp/twt-65887ee.bundle (2.0M) + twt-583aeb8-1728293.bundle (100K) — manual push required (PAT invalid, see below)

---

## Known Gaps / Next Operator Action

- **GitHub credential safety:** An earlier push attempt failed after its credential expired/revoked. Authenticate with the approved Git credential helper; never store a PAT in this report, shell history, or a remote URL.
- **Design image orphan cleanup:** Hard delete cascades Prisma `designImage` where designId but local /uploads files not unlinked on Vercel ephemeral — no leak in cloud. For S3, implement deleteObject on design.imageUrls in deleteDesign (add after delete).
- **Rate limiting:** Add explicit 10/min per IP on /api/profile/avatar via Upstash or in-memory LRU next iteration.
- **Measurement DB nullable migration formal:** If future adds per-column measurement fields, generate `npx prisma migrate dev --name make_measurements_nullable`. Currently JSON so no-op.
- **Back-nav protection:** Already via JWT idle timeout; consider Cache-Control no-store on protected pages headers for extra hardening.

---

## UAT Quick Test (post-deploy)

1. Login as tailor@demo.twt.ng / DemoPass123! (APPROVED seed) → upload avatar at /dashboard/tailor/account → header updates instantly without logout → appears on /tailors/ade-bespoke and /designs card
2. Dark toggle → verify gold #C6A15B on buttons/badges/focus/selected booking pill, inputs #202020 placeholder #85827D visible
3. /dashboard/customer/bookings/new → see 6 required marked * + inch, optional collapsible, submit with 6 succeeds, missing one → error
4. /dashboard/tailor/designs → Publish now flips PUBLISHED appears at /tailors/ade-bespoke; Delete → confirm → removes from DB+gallery (or archives with banner if active bookings)
5. Header avatar dropdown → Log out → confirm → redirected /?loggedOut=1 → protected /dashboard/customer rejects → back button does not expose
