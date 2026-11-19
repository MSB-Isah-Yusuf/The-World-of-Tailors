import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredCheckoutReservations } from "@/lib/payments/inventory";

export const runtime = "nodejs";

function validCronAuthorization(header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !validCronAuthorization(req.headers.get("authorization"), secret)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const result = await releaseExpiredCheckoutReservations();
  return NextResponse.json({ ok: true, ...result });
}
