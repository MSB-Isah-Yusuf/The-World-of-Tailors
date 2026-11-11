#!/usr/bin/env node
// Creates/updates admin user MSB (msb_025@outlook.com) — safe to re-run (upsert)
// Usage (local with prod DB):
//   DATABASE_URL="postgresql://..." node scripts/create-admin.mjs
// Or on Vercel (one-off):
//   vercel env pull .env.local && DATABASE_URL=$(grep DATABASE_URL .env.local | cut -d= ./node_modules/.bin/tsx scripts/create-admin.mjs
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "msb_025@outlook.com";
const ADMIN_NAME = "Muhammad Sani Baffa";
const ADMIN_PASSWORD = "_MSB_AdmiNTWT@026"; // MSB — change after first login via /admin or profile

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing. Get it from Vercel Dashboard → Project → Settings → Environment Variables → DATABASE_URL, then run:");
    console.error('  DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require" node scripts/create-admin.mjs');
    process.exit(1);
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const email = ADMIN_EMAIL.toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    user = await prisma.user.update({
      where: { email },
      data: { name: ADMIN_NAME, passwordHash: hash, role: "ADMIN", status: "ACTIVE" },
    });
    console.log(`✓ Updated existing user ${email} → ADMIN (id=${user.id})`);
  } else {
    user = await prisma.user.create({
      data: { name: ADMIN_NAME, email, passwordHash: hash, role: "ADMIN", status: "ACTIVE" },
    });
    console.log(`✓ Created admin ${email} → ADMIN (id=${user.id})`);
  }

  // Ensure admin can access /admin verification (no extra profile needed)
  await prisma.auditLog.create({
    data: { userId: user.id, action: "UPSERT_ADMIN", entity: "User", entityId: user.id, metadata: { email, name: ADMIN_NAME, by: "scripts/create-admin.mjs" } },
  }).catch(()=>{});

  console.log(`Login at /login with ${email} / (your password) → redirects to /admin`);
  console.log("SECURITY: Change password after first login, and rotate AUTH_SECRET if you committed it.");
}

main().catch(e=>{ console.error("Admin creation failed:", e.code||"", e.message); if(String(e.message||"").includes("Can't reach database")) console.error("→ DATABASE_URL unreachable — use production DATABASE_URL from Vercel, not localhost"); process.exit(1); }).finally(()=> prisma.$disconnect());
