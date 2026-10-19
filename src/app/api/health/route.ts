import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ status: "ok", service: "twt", version: "0.1.0", demoMode: process.env.DEMO_MODE !== "false" });
}
