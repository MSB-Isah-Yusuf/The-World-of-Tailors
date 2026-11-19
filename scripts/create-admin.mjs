#!/usr/bin/env node
// One-time, explicitly confirmed administrator bootstrap. Never use default credentials,
// promote an existing account, or reset an existing administrator's password.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = String(process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_BOOTSTRAP_PASSWORD || "");
  const name = String(process.env.ADMIN_BOOTSTRAP_NAME || "Marketplace Administrator").trim().slice(0, 120);

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be configured for the approved bootstrap operation.");
  if (process.env.ADMIN_BOOTSTRAP_CONFIRM !== "CREATE_NEW_ADMIN") throw new Error("Set ADMIN_BOOTSTRAP_CONFIRM=CREATE_NEW_ADMIN to explicitly authorize a new administrator bootstrap.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_BOOTSTRAP_EMAIL must be a valid email address.");
  if (password.length < 20 || password.length > 200) throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be 20–200 characters; use a unique secret manager value.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === "ADMIN") {
      console.log("An administrator with this email already exists; no password, role, or status was changed.");
      return;
    }
    throw new Error("An account with this email already exists without ADMIN role. Resolve identity and authorization manually; no promotion was performed.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { name: name || "Marketplace Administrator", email, passwordHash, role: "ADMIN", status: "ACTIVE" } });
    await tx.auditLog.create({ data: {
      action: "ADMIN_BOOTSTRAPPED",
      entity: "User",
      entityId: created.id,
      metadata: { provisioningMethod: "explicit_environment_bootstrap" },
    } });
    return created;
  });
  console.log(`Created administrator ${email} (id=${user.id}). The supplied password was not logged.`);
}

main()
  .catch((error) => {
    console.error("Administrator bootstrap failed:", error instanceof Error ? error.message : "unknown error");
    process.exitCode = 1;
  })
  .finally(async () => { await prisma.$disconnect(); });
