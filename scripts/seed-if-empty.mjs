#!/usr/bin/env node
// Vercel one-time seed: only seeds if DB is empty (safe for repeated deploys)
// Run from vercel-build: prisma db push ... && prisma generate && node scripts/seed-if-empty.mjs && next build
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

try {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`[seed-if-empty] DB already has ${count} users — skipping seed (safe to redeploy).`);
  } else {
    console.log("[seed-if-empty] DB empty (0 users) — running prisma/seed.ts ...");
    // dynamic import to run the seed file directly (tsx handles TS)
    const { spawnSync } = await import("node:child_process");
    const res = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit", env: process.env });
    if (res.status !== 0) {
      console.error("[seed-if-empty] seed failed with code", res.status);
      process.exit(res.status || 1);
    }
    const after = await prisma.user.count();
    console.log(`[seed-if-empty] ✅ Seed complete — now ${after} users (admin/customer/tailor/seller@demo.twt.ng / DemoPass123!)`);
  }
} catch (e) {
  console.error("[seed-if-empty] error:", e);
  // Don't fail build on seed check error — tables just pushed, let build continue
  // Vercel will still have working DB; user can manually npm run db:seed with DATABASE_URL
} finally {
  await prisma.$disconnect();
}
