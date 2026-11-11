#!/usr/bin/env node
// Creates a TWT test user directly in Postgres (works locally or against Vercel DB)
// Usage:
//   DATABASE_URL="postgres://...@db.prisma.io:5432/postgres?sslmode=require" node scripts/create-test-user.mjs [email] [password] [role]
//   Roles: CUSTOMER | TAILOR | FABRIC_SELLER | ADMIN
//   Default: test.user+$(date +%s)@twt.ng / TestPass123! / CUSTOMER
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = process.argv[2] || `test.user.${Date.now().toString().slice(-6)}@twt.ng`;
const password = process.argv[3] || "TestPass123!";
const role = (process.argv[4] || "CUSTOMER").toUpperCase();

if (!["CUSTOMER","TAILOR","FABRIC_SELLER","ADMIN"].includes(role)) {
  console.error(`Invalid role ${role}. Use CUSTOMER|TAILOR|FABRIC_SELLER|ADMIN`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing. Copy it from Vercel → Settings → Environment Variables");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists (id=${existing.id}, role=${existing.role}) — resetting password/role...`);
    await prisma.user.update({ where: { email }, data: { passwordHash: hash, role, status: "ACTIVE" }});
    console.log(`✅ Updated ${email} → ${role} / ${password}`);
  } else {
    const u = await prisma.user.create({
      data: { name: email.split("@")[0], email, passwordHash: hash, role, status: "ACTIVE", phone: "+2348010000000" }
    });
    // create role profile if needed
    if (role === "CUSTOMER") await prisma.customerProfile.create({ data: { userId: u.id }});
    if (role === "TAILOR") await prisma.tailorProfile.create({ data: { userId: u.id, businessName: `${u.name}'s Atelier`, slug: `test-tailor-${u.id.slice(0,6)}`, city: "Lagos", businessStatus: "APPROVED", isPublished: true }});
    if (role === "FABRIC_SELLER") await prisma.sellerProfile.create({ data: { userId: u.id, businessName: `${u.name}'s Fabrics`, slug: `test-seller-${u.id.slice(0,6)}`, city: "Lagos", businessStatus: "APPROVED", isPublished: true }});
    console.log(`✅ Created ${email} → ${role} / ${password} (id=${u.id})`);
  }
  console.log(`Login at: https://your-domain.vercel.app/login`);
} catch (e) {
  console.error("Failed:", e.message);
  if (e.code === "P2021") console.error("→ Tables missing. Wait for Vercel deploy fe441fd to finish (prisma db push), then retry.");
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
