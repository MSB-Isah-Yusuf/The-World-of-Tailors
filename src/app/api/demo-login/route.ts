import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  if (process.env.DEMO_MODE === "false") return NextResponse.json({ error: "Demo disabled" }, { status: 403 });
  const form = await req.formData();
  const email = String(form.get("email")||"").toLowerCase();
  const allowed = ["customer@demo.twt.ng","tailor@demo.twt.ng","seller@demo.twt.ng","admin@demo.twt.ng"];
  if (!allowed.includes(email)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  // Redirect to next-auth credentials callback via signIn
  // For demo, set cookie via simple redirect to login with hint; real NextAuth will handle POST to /api/auth/callback/credentials
  // We emulate by redirecting to login with auto-fill
  return NextResponse.redirect(new URL("/login", req.url));
}
