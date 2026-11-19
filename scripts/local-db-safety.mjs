// Guard destructive/development-only commands against remote or production databases.
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());

export function requireLocalPostgres({ confirmationKey, confirmationValue }) {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing local development data/schema operations with NODE_ENV=production.");
  const value = String(process.env.DATABASE_URL || "");
  if (!value) throw new Error("DATABASE_URL is required.");
  let url;
  try { url = new URL(value); } catch { throw new Error("DATABASE_URL is invalid; no database operation was run."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Only PostgreSQL is supported by the current schema.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) throw new Error("Refusing a development data/schema operation unless DATABASE_URL uses a loopback host.");
  if (process.env[confirmationKey] !== confirmationValue) throw new Error(`Set ${confirmationKey}=${confirmationValue} to explicitly confirm this local-only operation.`);
}
