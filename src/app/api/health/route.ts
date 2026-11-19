import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ status: "ok", service: "twt", version: "0.1.0", demoMode: process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true" });
}
