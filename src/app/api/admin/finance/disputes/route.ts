import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const items: any[] = await prisma.paymentDispute.findMany({ include: {
    customer: { select: { id: true, name: true, email: true } },
    payment: { include: { booking: { select: { reference: true, tailorId: true, tailor: { select: { businessName: true, userId: true } } } }, fabricOrder: { select: { reference: true, sellerId: true, seller: { select: { businessName: true, userId: true } } } }, obligation: { select: { settlementPolicySnapshot: true } } } },
    assignedAdmin: { select: { id: true, name: true, email: true } },
  }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ items: items.map((item) => ({
    id: item.id, paymentId: item.paymentId, reason: item.reason, evidence: item.evidence, status: item.status,
    resolution: item.resolution, createdAt: item.createdAt, updatedAt: item.updatedAt, resolvedAt: item.resolvedAt,
    customer: item.customer, assignedAdmin: item.assignedAdmin,
    sellerPaymentProfileId: item.sellerPaymentProfileId,
    payment: { id: item.payment.id, reference: item.payment.reference, status: item.payment.status, amountMinor: item.payment.amountMinor == null ? null : String(item.payment.amountMinor), currency: item.payment.currency, settlementPolicySnapshot: item.payment.obligation?.settlementPolicySnapshot,
      booking: item.payment.booking ? { reference: item.payment.booking.reference, businessName: item.payment.booking.tailor.businessName, userId: item.payment.booking.tailor.userId } : null,
      fabricOrder: item.payment.fabricOrder ? { reference: item.payment.fabricOrder.reference, businessName: item.payment.fabricOrder.seller.businessName, userId: item.payment.fabricOrder.seller.userId } : null,
    },
  })) });
}
