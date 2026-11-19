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
      const booking: any = await tx.tailoringBooking.findUnique({ where: { id }, include: { tailor: { select: { userId: true } }, paymentObligations: { include: { payments: true } } } });
      if (!booking || booking.customerId !== customerId) throw new Error("BOOKING_NOT_FOUND");
      if (booking.fulfillmentConfirmedAt) return { alreadyConfirmed: true, confirmedAt: booking.fulfillmentConfirmedAt, releasedMinor: 0n };
      if (booking.status !== "COMPLETED" || !["FULLY_PAID", "PAID"].includes(String(booking.paymentStatus))) throw new Error("BOOKING_NOT_READY_FOR_CUSTOMER_CONFIRMATION");
      const obligations = booking.paymentObligations || [];
      if (!obligations.length || obligations.some((obligation: any) => BigInt(obligation.outstandingMinor) !== 0n || obligation.status !== "PAID")) throw new Error("BOOKING_PAYMENT_OBLIGATION_NOT_SETTLED");
      const paymentIds = obligations.flatMap((obligation: any) => (obligation.payments || []).filter((payment: any) => payment.status === "PAID").map((payment: any) => payment.id));
      if (!paymentIds.length) throw new Error("BOOKING_HAS_NO_VERIFIED_PAYMENT");
      const profile: any = await tx.sellerPaymentProfile.findUnique({ where: { tailorProfileId: booking.tailorId } });
      if (!profile) throw new Error("SELLER_PAYMENT_PROFILE_MISSING");
      const now = new Date();
      const update = await tx.tailoringBooking.updateMany({ where: { id, customerId, status: "COMPLETED", paymentStatus: { in: ["FULLY_PAID", "PAID"] }, fulfillmentConfirmedAt: null }, data: { fulfillmentConfirmedAt: now, fulfillmentConfirmedByUserId: customerId } });
      if (update.count !== 1) throw new Error("BOOKING_CONFIRMATION_RACE");
      let releasedMinor = 0n;
      if (obligations.every((obligation: any) => obligation.settlementPolicySnapshot === "CONTROLLED_PAYOUT")) {
        const release = await releaseSellerEarningsAfterCustomerConfirmation(tx, { sellerPaymentProfileId: profile.id, paymentIds, currency: booking.currency || "NGN", sourceType: "TAILORING_BOOKING", sourceId: booking.id, createdById: customerId });
        releasedMinor = release.releasedMinor;
      }
      await tx.auditLog.create({ data: { userId: customerId, action: "CUSTOMER_CONFIRMED_TAILORING_COMPLETION", entity: "TailoringBooking", entityId: booking.id, metadata: { reference: booking.reference, paymentIds, releasedMinor: releasedMinor.toString(), settlementPolicySnapshots: obligations.map((obligation: any) => obligation.settlementPolicySnapshot) } } });
      if (booking.tailor?.userId) await tx.notification.create({ data: { userId: booking.tailor.userId, title: "Customer confirmed completion", message: `${booking.reference} was confirmed complete by the customer. Any payout remains subject to the authorised route and separate approvals.`, type: "payment", link: "/dashboard/tailor/earnings" } });
      return { alreadyConfirmed: false, confirmedAt: now, releasedMinor };
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 20_000 });
    return NextResponse.json({ ok: true, alreadyConfirmed: result.alreadyConfirmed, confirmedAt: result.confirmedAt, releasedMinor: result.releasedMinor.toString(), message: "Completion confirmation recorded. This is not proof of Paystack settlement or an escrow release." });
  } catch (error: any) {
    const message = String(error?.message || "BOOKING_CONFIRMATION_FAILED");
    const status = message === "BOOKING_NOT_FOUND" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
