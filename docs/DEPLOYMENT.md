# Deployment — The World of Tailors (TWT)

## Vercel Environment Variables (Required)
Add in **Vercel → Project → Settings → Environment Variables** (Production + Preview + Development):

```
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
AUTH_SECRET="openssl rand -base64 32  (32+ chars, e.g. k9vM3pLx...)"
AUTH_URL="https://your-domain.vercel.app"
APP_ENV="production"
DEMO_MODE="false"
STORAGE_PROVIDER="local" or "s3"
NEXT_PUBLIC_MAPBOX_TOKEN=""
PAYSTACK_SECRET_KEY=""
PAYSTACK_PUBLIC_KEY=""
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=""
RESEND_API_KEY=""
EMAIL_FROM="noreply@twt.ng"
```

**Fix for `MissingSecret` error:**
```
[auth][error] MissingSecret: Please define a `secret`
```
→ Cause: `AUTH_SECRET` not set on Vercel (local .env has it, but Vercel env is separate).
→ Fix: Add `AUTH_SECRET` as above, then **Redeploy**.

Generate:
```bash
openssl rand -base64 32
# or
npx auth secret  # prints AUTH_SECRET line
```

## Build
Vercel runs:
```
npm install
npx prisma generate   # via postinstall
npm run build         # next build (prerenders 40 routes)
```

Ensure `prisma/schema.prisma` provider is `postgresql` for production (dev uses `sqlite` file:./dev.db).

## Database
```
npx prisma migrate deploy
npm run db:seed   # creates demo accounts: admin@demo.twt.ng etc.
```

## Auth
- One central login `/login` with Demo Access (gated by DEMO_MODE)
- JWT + httpOnly Secure SameSite cookies, suspension revocation
- Secret logged clearly if missing in production (see src/lib/auth.ts)

## Post-Deploy Check
- `GET /api/health` → {status:"ok", service:"twt"}
- `GET /api/auth/session` → should not 500 with MissingSecret
- Login with demo accounts → correct dashboard per role
