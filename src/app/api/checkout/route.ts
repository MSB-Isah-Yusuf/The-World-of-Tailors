import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { createNotification } from "@/lib/notifications";
import { createPaymentObligationSnapshot } from "@/lib/payments/rules";
import { minorToMajorString, multiplyMinorByQuantity, quantityToTenThousandths, toMinorUnits } from "@/lib/payments/money";
import { releaseExpiredCheckoutReservations } from "@/lib/payments/inventory";
import { assertCustomerPaymentsEnabled, getFabricDeliveryFeeMinor, getPaymentRuntimeConfig, PaymentConfigurationError } from "@/lib/payments/config";

const CHECKOUT_EXPIRY_MINUTES = 30;

type CheckoutItem = { productId: string; quantity: number };

function majorNumber(minor: bigint): number {
  const value = Number(minorToMajorString(minor));
  if (!Number.isFinite(value) || !Number.isSafeInteger(Number(minor))) throw new Error("Order amount exceeds the supported safe range");
  return value;
}

function coalesceItems(items: CheckoutItem[]): CheckoutItem[] {
  const combined = new Map<string, number>();
  for (const item of items) {
    const productId = String(item.productId || "").trim();
    const quantity = Number(item.quantity);
    if (!productId || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) throw new Error("Invalid product or quantity");
    combined.set(productId, (combined.get(productId) || 0) + quantity);
  }
  return [...combined].map(([productId, quantity]) => ({ productId, quantity }));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  if ((session.user as any).role !== "CUSTOMER") return NextResponse.json({ error: "Customer checkout only" }, { status: 403 });
  await releaseExpiredCheckoutReservations().catch(() => {});

  const body: any = await req.json().catch(() => ({}));
  const deliveryType = String(body.deliveryType || "TO_CUSTOMER").toUpperCase();
  const deliveryAddress = body.deliveryAddress as any;
  const tailorDestinationId = body.tailorDestinationId ? String(body.tailorDestinationId) : null;
  const overrideItems = Array.isArray(body.items) ? body.items as CheckoutItem[] : undefined;
  if (!deliveryAddress?.street || !deliveryAddress?.city || !deliveryAddress?.state) return NextResponse.json({ error: "deliveryAddress { street, city, state } is required" }, { status: 400 });
  if (!["TO_CUSTOMER", "TO_TAILOR"].includes(deliveryType)) return NextResponse.json({ error: "deliveryType must be TO_CUSTOMER or TO_TAILOR" }, { status: 400 });
  if (deliveryType === "TO_TAILOR") {
    if (!tailorDestinationId) return NextResponse.json({ error: "tailorDestinationId required when delivering to tailor" }, { status: 400 });
    const tailor = await prisma.tailorProfile.findUnique({ where: { id: tailorDestinationId }, select: { id: true, businessStatus: true } });
    if (!tailor) return NextResponse.json({ error: "Tailor destination not found" }, { status: 404 });
    if (tailor.businessStatus !== "APPROVED") return NextResponse.json({ error: "Tailor is not approved" }, { status: 400 });
  }

  let rawItems: CheckoutItem[] = [];
  if (overrideItems?.length) rawItems = overrideItems;
  else {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    const cartItems: any[] = await (prisma as any).cartItem.findMany({ where: { cartId: cart.id } });
    rawItems = cartItems.map((item: any) => ({ productId: item.productId, quantity: Number(item.quantity) }));
  }
  try { rawItems = coalesceItems(rawItems); }
  catch (error: any) { return NextResponse.json({ error: error.message || "Invalid cart" }, { status: 400 }); }
  if (!rawItems.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const products: any[] = await prisma.fabricProduct.findMany({ where: { id: { in: rawItems.map((item) => item.productId) } }, include: { seller: true } });
  const productMap = new Map(products.map((product: any) => [product.id, product]));
  const bySeller = new Map<string, Array<{ productId: string; quantity: number; quantityScaled: bigint; priceMinor: bigint; lineTotalMinor: bigint }>>();

  for (const item of rawItems) {
    const product: any = productMap.get(item.productId);
    if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
    if (!product.isPublished || product.seller?.businessStatus !== "APPROVED") return NextResponse.json({ error: `${product.name} is not available for purchase` }, { status: 400 });
    if (String(product.currency || "").trim().toUpperCase() !== "NGN") return NextResponse.json({ error: "UNSUPPORTED_PRODUCT_CURRENCY", message: `${product.name} is not available for purchase in the enabled NGN checkout currency.` }, { status: 409 });
    if (item.quantity < Number(product.minOrderQty)) return NextResponse.json({ error: `${product.name} requires a minimum order of ${product.minOrderQty} ${product.unit}` }, { status: 400 });
    if (item.quantity > Number(product.stock) - Number(product.reserved)) return NextResponse.json({ error: `${product.name} has insufficient available stock` }, { status: 409 });
    let priceMinor: bigint;
    let quantityScaled: bigint;
    try {
      priceMinor = product.priceMinor == null ? toMinorUnits(Number(product.price)) : BigInt(product.priceMinor);
      quantityScaled = quantityToTenThousandths(String(item.quantity));
    } catch { return NextResponse.json({ error: `Invalid price or quantity for ${product.name}` }, { status: 409 }); }
    const lineTotalMinor = multiplyMinorByQuantity(priceMinor, quantityScaled);
    if (!bySeller.has(product.sellerId)) bySeller.set(product.sellerId, []);
    bySeller.get(product.sellerId)!.push({ productId: product.id, quantity: item.quantity, quantityScaled, priceMinor, lineTotalMinor });
  }

  let paymentConfig;
  let deliveryFeeMinor: bigint;
  try { paymentConfig = getPaymentRuntimeConfig(); assertCustomerPaymentsEnabled(paymentConfig); deliveryFeeMinor = getFabricDeliveryFeeMinor(); }
  catch (error) { return NextResponse.json({ error: "PAYMENT_NOT_CONFIGURED", message: error instanceof PaymentConfigurationError ? error.message : "Payment configuration unavailable" }, { status: 503 }); }
  for (const sellerId of bySeller.keys()) {
    const settlement: any = await prisma.sellerPaymentProfile.findUnique({ where: { sellerProfileId: sellerId } });
    if (!settlement || settlement.verificationStatus !== "VERIFIED" || !settlement.payoutEligible || settlement.suspendedAt) return NextResponse.json({ error: "SELLER_NOT_PAYMENT_ELIGIBLE", message: "A seller in this cart has not completed verified Paystack settlement setup." }, { status: 409 });
    const route = String(settlement.settlementPolicy || "DISABLED").toUpperCase();
    if (route === "IMMEDIATE_SPLIT" && (!paymentConfig.immediateSplitEnabled || !settlement.subaccountActive || !settlement.paystackSubaccountCode)) return NextResponse.json({ error: "IMMEDIATE_SPLIT_UNAVAILABLE" }, { status: 409 });
    if (route === "CONTROLLED_PAYOUT" && (!paymentConfig.controlledPayoutsEnabled || !settlement.paystackTransferRecipientCode)) return NextResponse.json({ error: "CONTROLLED_PAYOUT_UNAVAILABLE" }, { status: 409 });
    if (route === "DISABLED" || !["IMMEDIATE_SPLIT", "CONTROLLED_PAYOUT"].includes(route)) return NextResponse.json({ error: "SETTLEMENT_POLICY_DISABLED" }, { status: 409 });
    if (route === "IMMEDIATE_SPLIT" && paymentConfig.processingFeePolicy === "SHARED") return NextResponse.json({ error: "SHARED_FEE_SPLIT_UNSUPPORTED_FOR_IMMEDIATE_SPLIT" }, { status: 409 });
  }

  const refs: string[] = [];
  const ids: string[] = [];
  const checkoutPayments: Array<{ orderId: string; orderReference: string; paymentId: string; paymentReference: string; amountMinor: string; currency: string }> = [];
  const groupReference = `FG-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;
  const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRY_MINUTES * 60_000);
  const planned: Array<{ sellerId: string; items: Array<{ productId: string; quantity: number; quantityScaled: bigint; priceMinor: bigint; lineTotalMinor: bigint }>; reference: string; subtotalMinor: bigint; deliveryFeeMinor: bigint; totalMinor: bigint }> = [];
  for (const [sellerId, sellerItems] of bySeller.entries()) {
    const subtotalMinor = sellerItems.reduce((sum, item) => sum + item.lineTotalMinor, 0n);
    const sellerDeliveryFeeMinor = deliveryFeeMinor;
    planned.push({ sellerId, items: sellerItems, reference: `FO-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`, subtotalMinor, deliveryFeeMinor: sellerDeliveryFeeMinor, totalMinor: subtotalMinor + sellerDeliveryFeeMinor });
  }
  const totalSubtotalMinor = planned.reduce((sum, order) => sum + order.subtotalMinor, 0n);
  const totalDeliveryMinor = planned.reduce((sum, order) => sum + order.deliveryFeeMinor, 0n);
  const totalMinor = totalSubtotalMinor + totalDeliveryMinor;

  try {
    await prisma.$transaction(async (tx: any) => {
      // Reserve stock with optimistic compare-and-swap so concurrent checkouts cannot oversell.
      for (const orderPlan of planned) {
        for (const item of orderPlan.items) {
          const current: any = await tx.fabricProduct.findUnique({ where: { id: item.productId } });
          if (!current || !current.isPublished) throw new Error("PRODUCT_UNAVAILABLE");
          const currentPrice = current.priceMinor == null ? toMinorUnits(Number(current.price)) : BigInt(current.priceMinor);
          if (currentPrice !== item.priceMinor) throw new Error("PRICE_CHANGED_REFRESH_CHECKOUT");
          if (Number(current.stock) - Number(current.reserved) < item.quantity) throw new Error(`OUT_OF_STOCK:${current.name}`);
          const reserve = await tx.fabricProduct.updateMany({
            where: { id: item.productId, stock: current.stock, reserved: current.reserved },
            data: { reserved: { increment: item.quantity } },
          });
          if (reserve.count !== 1) throw new Error("INVENTORY_CHANGED_RETRY_CHECKOUT");
          await tx.inventoryMovement.create({ data: { productId: item.productId, delta: 0, reason: `RESERVED ${item.quantity} • checkout ${orderPlan.reference}` } });
        }
      }

      const group = await tx.fabricOrderGroup.create({ data: {
        reference: groupReference, customerId: userId, currency: "NGN",
        subtotalMinor: totalSubtotalMinor, deliveryTotalMinor: totalDeliveryMinor, totalMinor,
        status: "PENDING", deliveryType: deliveryType as any, deliveryAddress,
        tailorDestinationId, expiresAt,
      } });

      for (const orderPlan of planned) {
        const seller = await tx.sellerProfile.findUnique({ where: { id: orderPlan.sellerId } });
        if (!seller || seller.businessStatus !== "APPROVED") throw new Error("SELLER_NOT_AVAILABLE");
        const order = await tx.fabricOrder.create({ data: {
          reference: orderPlan.reference, customerId: userId, sellerId: orderPlan.sellerId,
          status: "PENDING", subtotal: majorNumber(orderPlan.subtotalMinor), subtotalMinor: orderPlan.subtotalMinor,
          deliveryFee: majorNumber(orderPlan.deliveryFeeMinor), deliveryFeeMinor: orderPlan.deliveryFeeMinor,
          total: majorNumber(orderPlan.totalMinor), totalMinor: orderPlan.totalMinor,
          currency: "NGN", paymentStatus: "PENDING", deliveryType: deliveryType as any,
          deliveryAddress, tailorDestinationId, orderGroupId: group.id,
        } });
        for (const item of orderPlan.items) {
          const product: any = productMap.get(item.productId);
          await tx.fabricOrderItem.create({ data: {
            orderId: order.id, productId: item.productId, productName: product.name, unit: product.unit,
            priceSnapshot: majorNumber(item.priceMinor), priceSnapshotMinor: item.priceMinor,
            quantity: item.quantity, lineTotal: majorNumber(item.lineTotalMinor), lineTotalMinor: item.lineTotalMinor,
          } });
        }
        await tx.delivery.create({ data: { fabricOrderId: order.id, type: deliveryType as any, address: deliveryAddress, status: "PENDING", trackingCode: `TRK${nanoid(6).toUpperCase()}` } });
        const obligation = await createPaymentObligationSnapshot({
          tx, customerId: userId, type: "FABRIC_ORDER", category: "FABRIC_SALE", totalMinor: orderPlan.totalMinor, commissionBaseMinor: orderPlan.subtotalMinor,
          currency: "NGN", orderGroupId: group.id, fabricOrderId: order.id, sellerProfileId: orderPlan.sellerId,
          expiresAt, acceptedAt: new Date(),
        });
        const payment = await tx.payment.create({ data: {
          reference: `PAY-${orderPlan.reference}`, fabricOrderId: order.id, obligationId: obligation.id,
          amount: majorNumber(orderPlan.totalMinor), amountMinor: orderPlan.totalMinor, currency: "NGN",
          provider: "paystack", category: "FABRIC_ORDER", status: "PENDING",
        } });
        checkoutPayments.push({ orderId: order.id, orderReference: order.reference, paymentId: payment.id, paymentReference: payment.reference, amountMinor: orderPlan.totalMinor.toString(), currency: "NGN" });
        if (seller.userId) await tx.notification.create({ data: { userId: seller.userId, title: "Fabric order received — payment pending", message: `Order ${order.reference} is awaiting verified customer payment. Do not dispatch yet.`, type: "order", link: "/dashboard/seller/orders" } });
        await tx.auditLog.create({ data: { userId, action: "CREATE_FABRIC_ORDER", entity: "FabricOrder", entityId: order.id, metadata: { reference: order.reference, groupReference, sellerId: orderPlan.sellerId, totalMinor: orderPlan.totalMinor.toString() } } });
        ids.push(order.id);
        refs.push(order.reference);
      }
      await tx.auditLog.create({ data: { userId, action: "CREATE_FABRIC_ORDER_GROUP", entity: "FabricOrderGroup", entityId: group.id, metadata: { reference: groupReference, orderCount: planned.length, totalMinor: totalMinor.toString() } } });
    }, { maxWait: 10_000, timeout: 25_000, isolationLevel: "Serializable" });

    if (!overrideItems?.length) {
      const cart = await prisma.cart.findUnique({ where: { userId } });
      if (cart) await (prisma as any).cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    if (deliveryType === "TO_TAILOR" && tailorDestinationId) {
      try {
        const tailor = await prisma.tailorProfile.findUnique({ where: { id: tailorDestinationId } });
        if (tailor?.userId) await createNotification({ userId: tailor.userId, title: "Fabric arriving for your customer", message: `Order(s) ${refs.join(", ")} may be delivered to your atelier. Coordinate directly with the customer.`, type: "delivery", link: "/dashboard/tailor/orders" } as any);
      } catch {}
    }
    return NextResponse.json({ ok: true, groupReference, orders: ids, orderReferences: refs, references: refs, payments: checkoutPayments, amountMinor: totalMinor.toString(), currency: "NGN", expiresAt: expiresAt.toISOString(), message: `Created ${planned.length} seller order(s) in checkout group ${groupReference}. Each seller order has its own payment transaction and fulfilment status.` });
  } catch (error: any) {
    const message = String(error?.message || "Checkout failed");
    if (message.includes("No active") || message.includes("Ambiguous active")) return NextResponse.json({ error: "COMMISSION_CONFIGURATION_REQUIRED", message: "Admin must configure an active commission rule for each seller category before checkout can be paid." }, { status: 409 });
    if (message.includes("PRICE_CHANGED") || message.includes("INVENTORY_CHANGED") || message.includes("OUT_OF_STOCK")) return NextResponse.json({ error: message }, { status: 409 });
    return NextResponse.json({ error: message.slice(0, 220) }, { status: 400 });
  }
}
