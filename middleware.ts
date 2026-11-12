import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "./src/lib/rate-limit";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Security headers
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  if (process.env.NODE_ENV === "production") res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // Rate limit: auth endpoints 10 req / 60s per IP
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/auth") || path === "/api/demo-login" || path.startsWith("/api/webhooks")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { ok } = rateLimit({ key: `rl:${path}:${ip}`, limit: 30, windowMs: 60_000 });
    if (!ok) return NextResponse.json({ error: "Too many requests — slow down" }, { status: 429, headers: res.headers });
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/dashboard/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
