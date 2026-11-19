#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { requireLocalPostgres } from "./local-db-safety.mjs";

try {
  requireLocalPostgres({ confirmationKey: "LOCAL_DB_PUSH_CONFIRM", confirmationValue: "SYNC_LOCAL_DATABASE" });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local database guard failed.");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "db", "push"], { stdio: "inherit", env: process.env });
if (result.error) {
  console.error("Local Prisma db push could not start:", result.error.message);
  process.exitCode = 1;
} else process.exitCode = result.status ?? 1;
