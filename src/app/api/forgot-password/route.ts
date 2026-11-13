import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(()=>({} as any));
  const clean = String(email||"").toLowerCase().trim();
  if (!clean || !clean.includes("@")) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  // Rate limit: 5 requests per 15m per email + IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const byIp = rateLimit({ key: `forgot:ip:${ip}`, limit: 10, windowMs: 15*60*1000 });
  const byEmail = rateLimit({ key: `forgot:email:${clean}`, limit: 5, windowMs: 15*60*1000 });
  if (!byIp.ok || !byEmail.ok) return NextResponse.json({ error: "Too many requests — try again in 15 minutes" }, { status: 429 });

  // Always return success to prevent email enumeration, but only create token if user exists
  let tokenValue: string | null = null;
  try {
    const user = await prisma.user.findUnique({ where: { email: clean } });
    if (user) {
      // Delete any existing tokens for this identifier
      await prisma.verificationToken.deleteMany({ where: { identifier: clean } }).catch(()=>{});
      tokenValue = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60*60*1000); // 1h expiry
      await prisma.verificationToken.create({ data: { identifier: clean, token: tokenValue, expires } });
    }
  } catch (e:any) {
    console.warn("[forgot-password] db error", e.message);
  }

  // If user exists, send email with reset link
  if (tokenValue) {
    const base = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
    const link = `${base}/reset-password?token=${tokenValue}&email=${encodeURIComponent(clean)}`;
    const html = `<p>You requested a password reset for <b>${clean}</b>.</p><p>Click <a href="${link}">this link to reset your password</a> — it expires in 1 hour and can only be used once.</p><p>If you didn't request this, ignore this email.</p><p style="word-break:break-all;font-size:11px;color:#666">${link}</p>`;
    try {
      await sendEmail({ to: clean, subject: "Reset your TWT password", html });
      console.log(`[forgot-password] reset link for ${clean}: ${link}`);
    } catch (e:any) {
      console.warn("[forgot-password] email failed", e.message);
    }
    // In dev/console mode, also log clearly
    if ((process.env.EMAIL_PROVIDER||"console")==="console") {
      console.log(`[email:console] PASSWORD RESET LINK for ${clean}: ${link}`);
    }
  }

  // Don't leak whether email exists
  return NextResponse.json({ ok: true, message: "If that email is registered, a reset link was sent. Check your inbox (and spam). In dev, check server console." });
}
