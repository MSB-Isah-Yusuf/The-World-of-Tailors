# The World of Tailors — Tailoring, Fashion Design & Fabric Marketplace

Premium glassmorphism storefront + professional dashboards for customers, tailors, fabric sellers, admins. Live marketplace: cart per-user, seller-grouped checkout atomic, Paystack HMAC webhook, real-time notifications, admin oversight.

> Lagos-first, production-oriented. One central login, strict RBAC, atomic inventory, Paystack/Mapbox-ready. 68 routes, 16 authz tests ✓.

## Quick start

npm install
npx prisma db push
npm run db:seed
npm run dev

Demo: customer@demo.twt.ng / tailor@demo.twt.ng / seller@demo.twt.ng / admin@demo.twt.ng — password DemoPass123!

## Stack
Next.js 15 App Router, React 19, TypeScript strict, Tailwind + shadcn/ui + Framer Motion, Prisma ORM (SQLite dev / Postgres prod), NextAuth v5, Zod + RHF.

## Security
Central login role derived server-side. RBAC + ownership-scoped queries. Booking transitions validated + history. Inventory transactions. No public admin creation. Payments verified via provider webhook, not redirect. Measurements private, never in URLs/logs.

## Routes
Public: /, /tailors, /tailors/[slug], /designs, /designs/[slug], /fabrics, /fabrics/[slug], /sellers/[slug], /checkout, /notifications, /sitemap.xml, /robots.txt
Auth: /login (Demo Access demo.twt.ng / DemoPass123!), /register/*, /forgot-password
Dashboards: /dashboard/customer/* (7 items), /dashboard/tailor/* (15 items + mannequin), /dashboard/seller/* (11 items mirror), /admin/* (users/verification/orders/audit live)
API: `/api/cart` (GET/POST/PATCH/DELETE), `/api/checkout` (atomic seller-grouped), `/api/webhooks/paystack` (HMAC + idempotent), `/api/paystack/initialize`, `/api/notifications`, `/api/uploads` (5MB validated), `/api/v1/*` (tailors/bookings/orders)

## DB
prisma/schema.prisma — 30+ models, cuid, FK, indexes, history tables. Seed creates 1 admin + MSB (msb_025@outlook.com), 8 tailors (APPROVED/PUBLISHED), 6 sellers, 20 customers, 60 designs, 50 fabrics, 40 bookings (with statusHistory), 35 orders (per-seller), 30 reviews, carts/notifications. Cart `reserved` field prevents overselling: `available=stock-reserved`, `$transaction` on checkout, `InventoryMovement` audit.

## Env
See .env.example. DEMO_MODE controls demo buttons; Paystack/Mapbox/Email providers via env.

## Deploy
Set DATABASE_URL (Postgres), AUTH_SECRET, AUTH_URL, DEMO_MODE=false, APP_ENV=production, run npx prisma migrate deploy.

