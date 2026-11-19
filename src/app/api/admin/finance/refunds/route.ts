import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const refunds: any[] = await prisma.refund.findMany({ include: {
    payment: { include: { obligation: { select: { settlementPolicySnapshot: true, customer: { select: { name: true, email: true } } } }, booking: { select: { reference: true, tailor: { select: { businessName: true } } } }, fabricOrder: { select: { reference: true, seller: { select: { businessName: true } } } } } },
    sellerPaymentProfile: { select: { sellerType: true, bankName: true, maskedAccountNumber: true, settlementPolicy: true, payoutEligible: true, verificationStatus: true } },
    initiatedBy: { select: { id: true, name: true, email: true } }, approvedBy: { select: { id: true, name: true, email: true } }, secondApprovedBy: { select: { id: true, name: true, email: true } },
  }, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({ items: refunds.map((refund) => ({
    id: refund.id, reference: refund.reference, amountMinor: String(refund.amountMinor), currency: refund.currency, reason: refund.reason,
    status: refund.status, createdAt: refund.createdAt, initiatedAt: refund.initiatedAt, completedAt: refund.completedAt,
    approvedByUserId: refund.approvedByUserId, approvedBy: refund.approvedBy, secondApprovedByUserId: refund.secondApprovedByUserId, secondApprovedBy: refund.secondApprovedBy,
    providerRefundReference: refund.providerRefundReference, providerResponseSummary: refund.providerResponseSummary,
    initiatedBy: refund.initiatedBy, sellerPaymentProfile: refund.sellerPaymentProfile,
    commissionReversedMinor: refund.commissionReversedMinor == null ? null : String(refund.commissionReversedMinor),
    sellerReversedMinor: refund.sellerReversedMinor == null ? null : String(refund.sellerReversedMinor),
    payment: { id: refund.payment.id, reference: refund.payment.reference, status: refund.payment.status, amountMinor: refund.payment.amountMinor == null ? null : String(refund.payment.amountMinor), currency: refund.payment.currency, transactionIdPresent: Boolean(refund.payment.providerTransactionId), settlementPolicySnapshot: refund.payment.obligation?.settlementPolicySnapshot, customer: refund.payment.obligation?.customer || null, booking: refund.payment.booking ? { reference: refund.payment.booking.reference, tailorName: refund.payment.booking.tailor.businessName } : null, fabricOrder: refund.payment.fabricOrder ? { reference: refund.payment.fabricOrder.reference, sellerName: refund.payment.fabricOrder.seller.businessName } : null },
  })) });
}
