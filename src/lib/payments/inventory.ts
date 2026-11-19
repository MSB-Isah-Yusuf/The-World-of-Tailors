import { prisma } from "@/lib/prisma";

const FINAL_ATTEMPT_STATES = new Set(["FAILED", "ABANDONED", "CANCELLED", "EXPIRED", "REVERSED", "DUPLICATE_CAPTURE"]);

/** Release only expired stock reservations with no payment and no unresolved Paystack attempt.
 * A pending/ongoing hosted checkout is never released because it could still be paid.
 */
export async function releaseExpiredCheckoutReservations(now = new Date(), batchSize = 50) {
  const groups: any[] = await prisma.fabricOrderGroup.findMany({
    where: { status: "PENDING", expiresAt: { lte: now } },
    orderBy: { expiresAt: "asc" }, take: batchSize,
    include: { orders: { include: { items: true, payments: { include: { attempts: true, obligation: true } } } } },
  });
  let released = 0;
  for (const candidate of groups) {
    try {
      const didRelease = await prisma.$transaction(async (tx: any) => {
        const group: any = await tx.fabricOrderGroup.findUnique({ where: { id: candidate.id }, include: { orders: { include: { items: true, payments: { include: { attempts: true, obligation: true } } } } } });
        if (!group || group.status !== "PENDING" || !group.expiresAt || group.expiresAt > now) return false;
        const payments = group.orders.flatMap((order: any) => order.payments);
        if (payments.some((payment: any) => payment.status === "PAID")) return false;
        const unresolvedAttempt = payments.some((payment: any) => payment.attempts.some((attempt: any) => !FINAL_ATTEMPT_STATES.has(String(attempt.status).toUpperCase())));
        if (unresolvedAttempt) return false;

        for (const order of group.orders) {
          for (const item of order.items) {
            const update = await tx.fabricProduct.updateMany({ where: { id: item.productId, reserved: { gte: item.quantity } }, data: { reserved: { decrement: item.quantity } } });
            if (update.count !== 1) throw new Error("RESERVATION_INVARIANT_FAILED");
            await tx.inventoryMovement.create({ data: { productId: item.productId, delta: 0, reason: `RESERVATION RELEASED • expired checkout ${group.reference} / ${order.reference}` } });
          }
          await tx.fabricOrder.update({ where: { id: order.id }, data: { status: "CANCELLED", paymentStatus: "CANCELLED" } });
          await tx.payment.updateMany({ where: { fabricOrderId: order.id, status: "PENDING" }, data: { status: "CANCELLED" } });
          await tx.paymentObligation.updateMany({ where: { fabricOrderId: order.id, status: { notIn: ["PAID", "REFUNDED"] } }, data: { status: "EXPIRED" } });
        }
        await tx.fabricOrderGroup.update({ where: { id: group.id }, data: { status: "EXPIRED" } });
        await tx.auditLog.create({ data: { action: "EXPIRED_CHECKOUT_RESERVATION_RELEASED", entity: "FabricOrderGroup", entityId: group.id, metadata: { reference: group.reference, orderCount: group.orders.length } } });
        return true;
      }, { maxWait: 5_000, timeout: 15_000, isolationLevel: "Serializable" });
      if (didRelease) released++;
    } catch (error) {
      console.error("[inventory] reservation release failed", String((error as any)?.name || "Error"));
    }
  }
  return { examined: groups.length, released };
}
