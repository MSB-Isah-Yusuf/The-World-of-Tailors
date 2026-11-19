import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseSellerEarningsAfterCustomerConfirmation } from "@/lib/payments/seller-ledger";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "CUSTOMER") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const customerId = String((session.user as any).id || "");
  const { id } = await params;
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const order: any = await tx.fabricOrder.findUnique({ where: { id }, include: { seller: { select: { userId: true } }, payments: { include: { obligation: true } } } });
      if (!order || order.customerId !== customerId) throw new Error("ORDER_NOT_FOUND");
      if (order.fulfillmentConfirmedAt) return { alreadyConfirmed: true, confirmedAt: order.fulfillmentConfirmedAt, releasedMinor: 0n };
      if (order.status !== "DELIVERED" || order.paymentStatus !== "PAID") throw new Error("ORDER_NOT_READY_FOR_CUSTOMER_CONFIRMATION");
      const paidPayments = order.payments.filter((payment: any) => payment.status === "PAID" && payment.obligation);
      if (!paidPayments.length || paidPayments.some((payment: any) => BigInt(payment.obligation.outstandingMinor) !== 0n || payment.obligation.status !== "PAID")) throw new Error("ORDER_PAYMENT_OBLIGATION_NOT_SETTLED");
      const profile: any = await tx.sellerPaymentProfile.findUnique({ where: { sellerProfileId: order.sellerId } });
      if (!profile) throw new Error("SELLER_PAYMENT_PROFILE_MISSING");
      const now = new Date();
      const update = await tx.fabricOrder.updateMany({ where: { id, customerId, status: "DELIVERED", paymentStatus: "PAID", fulfillmentConfirmedAt: null }, data: { fulfillmentConfirmedAt: now, fulfillmentConfirmedByUserId: customerId } });
      if (update.count !== 1) throw new Error("ORDER_CONFIRMATION_RACE");
      let releasedMinor = 0n;
      if (paidPayments.every((payment: any) => payment.obligation.settlementPolicySnapshot === "CONTROLLED_PAYOUT")) {
        const release = await releaseSellerEarningsAfterCustomerConfirmation(tx, { sellerPaymentProfileId: profile.id, paymentIds: paidPayments.map((payment: any) => payment.id), currency: order.currency, sourceType: "FABRIC_ORDER", sourceId: order.id, createdById: customerId });
        releasedMinor = release.releasedMinor;
      }
      await tx.auditLog.create({ data: { userId: customerId, action: "CUSTOMER_CONFIRMED_FABRIC_DELIVERY", entity: "FabricOrder", entityId: order.id, metadata: { reference: order.reference, releasedMinor: releasedMinor.toString(), settlementPolicySnapshot: paidPayments[0]?.obligation?.settlementPolicySnapshot || null } } });
      if (order.seller?.userId) await tx.notification.create({ data: { userId: order.seller.userId, title: "Customer confirmed delivery", message: `${order.reference} was confirmed delivered by the customer. Payout remains subject to the authorised route and approval process.`, type: "order", link: "/dashboard/seller/earnings" } });
      return { alreadyConfirmed: false, confirmedAt: now, releasedMinor };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
    return NextResponse.json({ ok: true, alreadyConfirmed: result.alreadyConfirmed, confirmedAt: result.confirmedAt, releasedMinor: result.releasedMinor.toString(), message: "Delivery confirmation recorded. This is not proof of Paystack settlement or an escrow release." });
  } catch (error: any) {
    const message = String(error?.message || "DELIVERY_CONFIRMATION_FAILED");
    const status = message === "ORDER_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
