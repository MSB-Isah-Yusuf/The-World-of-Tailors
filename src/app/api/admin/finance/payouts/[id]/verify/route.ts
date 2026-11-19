import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPaystackTransfer } from "@/lib/paystack";
import { applyVerifiedPaystackTransfer } from "@/lib/payments/paystack-transfers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const payout: any = await prisma.payout.findUnique({ where: { id } });
  if (!payout) return NextResponse.json({ error: "PAYOUT_NOT_FOUND" }, { status: 404 });
  if (!["PROCESSING", "TRANSFER_UNKNOWN", "INITIATING", "AWAITING_PROVIDER"].includes(payout.status)) return NextResponse.json({ error: "PAYOUT_NOT_VERIFIABLE", message: "Only submitted or uncertain transfers can be queried; verification does not create or retry a transfer." }, { status: 409 });
  try {
    const providerTransfer = await verifyPaystackTransfer(payout.reference);
    const result = await applyVerifiedPaystackTransfer(payout.reference, providerTransfer, `admin-verify:${String((session.user as any).id || "")}`);
    await prisma.auditLog.create({ data: { userId: String((session.user as any).id || ""), action: "ADMIN_VERIFIED_PAYOUT_STATUS", entity: "Payout", entityId: payout.id, metadata: { reference: payout.reference, status: result.status, providerStatus: String(providerTransfer.status || "unknown") } } });
    return NextResponse.json({ ok: true, item: { id: payout.id, reference: payout.reference, status: result.status }, message: result.status === "SUCCESS" ? "Provider verified transfer success." : result.status === "FAILED" ? "Provider verified failure; ledger payable was restored." : "Transfer is not yet in a final provider state." });
  } catch {
    return NextResponse.json({ error: "PROVIDER_STATUS_UNAVAILABLE", message: "No new transfer was sent. Keep this payout under review and query Paystack again later." }, { status: 502 });
  }
}
