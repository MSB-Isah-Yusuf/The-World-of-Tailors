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

  // Ensure MSB admin always exists (idempotent, does not overwrite if present unless password needs reset)
  try {
    const bcrypt = await import("bcryptjs");
    const msbEmail = "msb_025@outlook.com".toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: msbEmail } });
    if (!existing) {
      const hash = await bcrypt.default.hash("_MSB_AdmiNTWT@026", 10);
      const u = await prisma.user.create({ data: { name: "Muhammad Sani Baffa", email: msbEmail, passwordHash: hash, role: "ADMIN", status: "ACTIVE" } });
      console.log(`[seed-if-empty] ✓ Created MSB admin ${msbEmail} (id=${u.id})`);
      await prisma.auditLog.create({ data: { userId: u.id, action: "CREATE_MSB_ADMIN_VIA_BUILD", entity: "User", entityId: u.id } }).catch(()=>{});
    } else if (existing.role !== "ADMIN") {
      await prisma.user.update({ where: { email: msbEmail }, data: { role: "ADMIN", status: "ACTIVE" } });
      console.log(`[seed-if-empty] ✓ Upgraded ${msbEmail} to ADMIN`);
    } else {
      console.log(`[seed-if-empty] MSB admin ${msbEmail} already exists — skipping`);
    }
  } catch (e2) {
    console.log("[seed-if-empty] MSB admin ensure skipped:", (e2 as Error).message?.slice(0,120));
  }
} catch (e) {
  console.error("[seed-if-empty] error:", e);
  // Don't fail build on seed check error — tables just pushed, let build continue
  // Vercel will still have working DB; user can manually npm run db:seed with DATABASE_URL
} finally {
  await prisma.$disconnect();
}
