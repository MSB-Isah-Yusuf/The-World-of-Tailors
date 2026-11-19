import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listPaystackBanks } from "@/lib/paystack";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!["TAILOR", "FABRIC_SELLER"].includes(String((session.user as any).role || ""))) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  try {
    const banks: any[] = await listPaystackBanks("nigeria");
    return NextResponse.json({ items: banks.map((bank) => ({ code: String(bank.code || bank.bank_code || ""), name: String(bank.name || "") })).filter((bank) => bank.code && bank.name).sort((a, b) => a.name.localeCompare(b.name)) });
  } catch {
    return NextResponse.json({ error: "BANK_LIST_UNAVAILABLE", message: "Enter the official Paystack bank code manually or try again later." }, { status: 503 });
  }
}
