import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPaystackRefundByReference } from "@/lib/paystack";
import { applyVerifiedPaystackRefund } from "@/lib/payments/paystack-refunds";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await params;
  const refund: any = await prisma.refund.findUnique({ where: { id } });
  if (!refund) return NextResponse.json({ error: "REFUND_NOT_FOUND" }, { status: 404 });
  if (!["INITIATING", "PROCESSING", "REFUND_UNKNOWN"].includes(refund.status) || !refund.initiatedAt) return NextResponse.json({ error: "REFUND_NOT_VERIFIABLE", message: "Only an already-submitted provider refund can be queried. This action never creates or retries a refund." }, { status: 409 });
  try {
    const result: any = await getPaystackRefundByReference(refund.reference);
    const records = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : [];
    const providerRefund = records.find((row: any) => String(row.reference || row.refund_reference || "") === refund.reference || String(row.refund_reference || "") === String(refund.providerRefundReference || ""));
    if (!providerRefund) return NextResponse.json({ error: "PROVIDER_REFUND_NOT_FOUND_YET", message: "No matching refund was returned. Keep the item under review and query the same reference later; do not create another refund." }, { status: 202 });
    const applied = await applyVerifiedPaystackRefund(refund.reference, providerRefund, String((session.user as any).id || ""));
    await prisma.auditLog.create({ data: { userId: String((session.user as any).id || ""), action: "ADMIN_VERIFIED_REFUND_STATUS", entity: "Refund", entityId: refund.id, metadata: { reference: refund.reference, status: applied.status, providerStatus: String(providerRefund.status || "unknown") } } });
    return NextResponse.json({ ok: true, item: { id, reference: refund.reference, status: applied.status }, message: applied.status === "SUCCESS" ? "Provider verified refund success." : applied.status === "FAILED" ? "Provider verified refund failure; payment status restored." : "Refund remains pending or requires review." }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "PROVIDER_REFUND_STATUS_UNAVAILABLE", message: "No new refund was sent. Query this reference again after provider status is available." }, { status: 502 });
  }
}
