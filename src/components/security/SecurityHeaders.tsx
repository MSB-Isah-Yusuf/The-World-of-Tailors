import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function addSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.headers.set("X-XSS-Protection", "0");
  // CSP minimal — allow self + Paystack, Mapbox, Unsplash images
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co; connect-src 'self' https://api.paystack.co https://nominatim.openstreetmap.org https://*.mapbox.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; frame-src 'self' https://www.openstreetmap.org https://js.paystack.co; object-src 'none'; base-uri 'self'"
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}
