#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { requireLocalPostgres } from "./local-db-safety.mjs";

try {
  requireLocalPostgres({ confirmationKey: "LOCAL_DB_RESET_CONFIRM", confirmationValue: "RESET_LOCAL_DATABASE" });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local database guard failed.");
  process.exit(1);
}

console.warn("Resetting the explicitly confirmed loopback PostgreSQL database; all local data will be deleted.");
const reset = spawnSync("npx", ["prisma", "db", "push", "--force-reset", "--accept-data-loss"], { stdio: "inherit", env: process.env });
if (reset.error || reset.status !== 0) {
  console.error("Local schema reset failed; demo seed was not run.", reset.error?.message || "");
  process.exitCode = reset.status ?? 1;
} else {
  const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
    stdio: "inherit",
    env: { ...process.env, LOCAL_DEMO_SEED_CONFIRM: "SEED_LOCAL_DEMO_DATA" },
  });
  if (seed.error || seed.status !== 0) {
    console.error("Local demo seed failed.", seed.error?.message || "");
    process.exitCode = seed.status ?? 1;
  }
}
