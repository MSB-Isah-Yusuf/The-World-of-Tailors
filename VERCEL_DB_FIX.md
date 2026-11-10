# Fix P2021: table public.User does not exist

## Cause
Switched Prisma provider `sqlite → postgresql` (89bbfb4). Your Vercel DATABASE_URL (`postgres://...@db.prisma.io:5432/postgres`) now connects correctly, but it's a fresh Postgres DB with no tables. SQLite dev.db does not migrate automatically.

## Fix - One-time (do this now)

### Option A: From your local machine (fastest)
```bash
# 1. Set production DATABASE_URL locally (copy from Vercel → Settings → Environment Variables)
export DATABASE_URL="postgres://...@db.prisma.io:5432/postgres?sslmode=require"

# 2. Push schema to production Postgres
npx prisma db push

# 3. Seed demo users (customer/tailor/seller/admin @demo.twt.ng)
npx prisma db seed
# or npm run db:seed
```

### Option B: Via Vercel Dashboard (no local setup)
1. Vercel → Your Project → Settings → Build & Development Settings
2. Change Build Command to:
```
npx prisma db push --accept-data-loss && npx prisma generate && next build
```
3. Deployments → Redeploy latest (89bbfb4) with cache disabled
4. Or add Environment Variable: `PRISMA_SKIP_POSTINSTALL=0`

### Verify
After push:
```
npx prisma studio --url="your production DATABASE_URL"
# should show User, Order, etc. tables
```
Then test:
- https://your-domain.vercel.app/register/customer → should create user
- https://your-domain.vercel.app/login → demo login should work
