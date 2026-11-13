import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, token, password } = await req.json().catch(()=>({} as any));
  const clean = String(email||"").toLowerCase().trim();
  const tok = String(token||"").trim();
  const pw = String(password||"");
  if (!clean || !tok) return NextResponse.json({ error: "Email and token required" }, { status: 400 });
  if (!pw || pw.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  try {
    const record = await prisma.verificationToken.findFirst({ where: { identifier: clean, token: tok } });
    if (!record) return NextResponse.json({ error: "Invalid or expired reset link — request a new one at /forgot-password" }, { status: 400 });
    if (new Date(record.expires) < new Date()) {
      await prisma.verificationToken.delete({ where: { token: tok } }).catch(()=>{});
      return NextResponse.json({ error: "Reset link expired — request a new one" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email: clean } });
    if (!user) return NextResponse.json({ error: "No account for that email" }, { status: 404 });

    const hash = await bcrypt.hash(pw, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    // Single-use: delete token
    await prisma.verificationToken.delete({ where: { token: tok } }).catch(()=>{});
    await prisma.verificationToken.deleteMany({ where: { identifier: clean } }).catch(()=>{});
    await prisma.auditLog.create({ data: { userId: user.id, action: "PASSWORD_RESET", entity: "User", entityId: user.id } }).catch(()=>{});

    return NextResponse.json({ ok: true, message: "Password updated — you can now sign in at /login" });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Reset failed" }, { status: 500 });
  }
}
