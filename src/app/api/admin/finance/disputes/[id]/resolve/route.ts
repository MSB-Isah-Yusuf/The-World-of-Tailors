import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["UNDER_REVIEW", "RESOLVED_CUSTOMER", "RESOLVED_SELLER", "CLOSED"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const actorId = String((session.user as any).id || "");
  const { id } = await params;
  const body: any = await req.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();
  const resolution = String(body.resolution || "").trim().slice(0, 2000);
  if (!ALLOWED.has(status) || !resolution) return NextResponse.json({ error: "A valid status and resolution note are required" }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const dispute: any = await tx.paymentDispute.findUnique({
        where: { id },
        include: {
          payment: {
            include: {
              booking: { include: { tailor: { select: { userId: true } } } },
              fabricOrder: { include: { seller: { select: { userId: true } } } },
            },
          },
        },
      });
      if (!dispute) throw new Error("DISPUTE_NOT_FOUND");
      if (["RESOLVED_CUSTOMER", "RESOLVED_SELLER", "CLOSED"].includes(dispute.status) && status !== dispute.status) throw new Error("DISPUTE_ALREADY_CLOSED");
      const resolved = ["RESOLVED_CUSTOMER", "RESOLVED_SELLER", "CLOSED"].includes(status);
      const updated = await tx.paymentDispute.update({ where: { id }, data: { status, resolution, assignedAdminId: actorId, resolvedAt: resolved ? new Date() : null } });
      await tx.auditLog.create({ data: { userId: actorId, action: `ADMIN_PAYMENT_DISPUTE_${status}`, entity: "PaymentDispute", entityId: id, metadata: { paymentId: dispute.paymentId, resolution } } });
      await tx.notification.create({ data: { userId: dispute.customerId, title: "Payment dispute updated", message: `Your dispute for payment ${dispute.payment.reference} is now ${status}.`, type: "payment", link: "/dashboard/customer/disputes" } });
      const sellerUserId = dispute.payment.booking?.tailor?.userId || dispute.payment.fabricOrder?.seller?.userId;
      if (sellerUserId) await tx.notification.create({ data: { userId: sellerUserId, title: "Payment dispute updated", message: `A payment dispute for ${dispute.payment.reference} is now ${status}.`, type: "payment", link: dispute.payment.booking ? "/dashboard/tailor/earnings" : "/dashboard/seller/earnings" } });
      return updated;
    }, { isolationLevel: "Serializable", maxWait: 10_000, timeout: 15_000 });
    return NextResponse.json({ ok: true, item: { id: result.id, status: result.status, resolvedAt: result.resolvedAt } });
  } catch (error: any) {
    const message = String(error?.message || "DISPUTE_RESOLUTION_FAILED");
    return NextResponse.json({ error: message }, { status: message === "DISPUTE_NOT_FOUND" ? 404 : 409 });
  }
}
