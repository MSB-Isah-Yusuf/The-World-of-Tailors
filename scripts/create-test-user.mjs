#!/usr/bin/env node
// Create a throwaway local test account. Refuse production databases and ADMIN role.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = String(process.argv[2] || `test.user.${Date.now()}@example.invalid`).trim().toLowerCase();
const password = String(process.argv[3] || "");
const role = String(process.argv[4] || "CUSTOMER").toUpperCase();
const databaseUrl = String(process.env.DATABASE_URL || "");

if (process.env.NODE_ENV === "production") throw new Error("Refusing to create a test account with NODE_ENV=production.");
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
if (!/^(localhost|127\.0\.0\.1|::1)(:\d+)?$/.test(new URL(databaseUrl).hostname)) throw new Error("Refusing to create a test user unless DATABASE_URL points to localhost/loopback.");
if (!["CUSTOMER", "TAILOR", "FABRIC_SELLER"].includes(role)) throw new Error("Role must be CUSTOMER, TAILOR, or FABRIC_SELLER; test-admin creation is prohibited.");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email address is required.");
if (password.length < 16 || password.length > 200) throw new Error("Provide a unique test password of 16–200 characters as the second argument.");

const prisma = new PrismaClient();
try {
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("User already exists; no password or role was changed.");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({ data: { name: email.split("@")[0], email, passwordHash, role, status: "ACTIVE" } });
    if (role === "CUSTOMER") await tx.customerProfile.create({ data: { userId: created.id } });
    if (role === "TAILOR") await tx.tailorProfile.create({ data: { userId: created.id, businessName: `${created.name}'s Atelier`, slug: `test-tailor-${created.id.slice(0, 8)}`, city: "Lagos", businessStatus: "PENDING", isPublished: false } });
    if (role === "FABRIC_SELLER") await tx.sellerProfile.create({ data: { userId: created.id, businessName: `${created.name}'s Fabrics`, slug: `test-seller-${created.id.slice(0, 8)}`, city: "Lagos", businessStatus: "PENDING", isPublished: false } });
    return created;
  });
  console.log(`Created local test account ${email} (${role}, id=${user.id}); password was not logged.`);
} finally {
  await prisma.$disconnect();
}
