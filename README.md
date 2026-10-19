# The World of Tailors — Tailoring, Fashion Design & Fabric Marketplace

Premium glassmorphism storefront + professional dashboards for customers, tailors, fabric sellers, admins.

> Lagos-first, production-oriented. One central login, strict RBAC, atomic inventory, Paystack/Mapbox-ready.

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
Public: /, /tailors, /tailors/[slug], /designs, /designs/[slug], /fabrics, /fabrics/[slug], /sellers/[slug], /checkout
Auth: /login (Demo Access), /register/*, /forgot-password
Dashboards: /dashboard/customer/*, /dashboard/tailor/*, /dashboard/seller/*, /admin/*

## DB
prisma/schema.prisma — 25+ models, cuid, FK, indexes, history tables. Seed creates 1 admin, 8 tailors, 6 sellers, 20 customers, 60 designs, 50 fabrics, 40 bookings, 35 orders, 30 reviews.

## Env
See .env.example. DEMO_MODE controls demo buttons; Paystack/Mapbox/Email providers via env.

## Deploy
Set DATABASE_URL (Postgres), AUTH_SECRET, AUTH_URL, DEMO_MODE=false, APP_ENV=production, run npx prisma migrate deploy.

