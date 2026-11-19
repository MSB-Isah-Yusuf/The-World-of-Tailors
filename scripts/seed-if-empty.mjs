#!/usr/bin/env node
// Local demo helper only. Production identity/data provisioning must be an explicit,
// audited operation and is intentionally not performed by a build or this script.
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { requireLocalPostgres } from "./local-db-safety.mjs";

try {
  requireLocalPostgres({ confirmationKey: "LOCAL_DEMO_SEED_CONFIRM", confirmationValue: "SEED_LOCAL_DEMO_DATA" });
} catch (error) {
  console.error("[seed-if-empty]", error instanceof Error ? error.message : "Local database guard failed.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`[seed-if-empty] Database already has ${count} users; leaving it unchanged.`);
  } else {
    console.log("[seed-if-empty] Empty non-production database; running the local demo seed.");
    const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit", env: process.env });
    if (result.status !== 0) process.exitCode = result.status || 1;
  }
} catch (error) {
  console.error("[seed-if-empty] Seed check failed; no production fallback or admin account was created.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
