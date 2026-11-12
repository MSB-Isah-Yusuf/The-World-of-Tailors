import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { createNotification } from "@/lib/notifications";

// POST /api/checkout — body: { deliveryType: "TO_CUSTOMER"|"TO_TAILOR", deliveryAddress: { street, city, state, phone }, tailorDestinationId?: string, items?: [{productId, quantity}] optional — defaults to cart }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await req.json().catch(() => ({} as any));
  const deliveryType = (body.deliveryType || "TO_CUSTOMER") as "TO_CUSTOMER" | "TO_TAILOR";
  const deliveryAddress = body.deliveryAddress as any;
  const tailorDestinationId = body.tailorDestinationId ? String(body.tailorDestinationId) : null;
  const overrideItems = body.items as { productId: string; quantity: number }[] | undefined;

  if (!deliveryAddress?.street || !deliveryAddress?.city) return NextResponse.json({ error: "deliveryAddress { street, city, state } required" }, { status: 400 });
  if (!["TO_CUSTOMER","TO_TAILOR"].includes(deliveryType)) return NextResponse.json({ error: "deliveryType must be TO_CUSTOMER or TO_TAILOR" }, { status: 400 });

  // Validate tailor destination if TO_TAILOR
  if (deliveryType === "TO_TAILOR") {
    if (!tailorDestinationId) return NextResponse.json({ error: "tailorDestinationId required when delivering to tailor" }, { status: 400 });
    const tailor = await prisma.tailorProfile.findUnique({ where: { id: tailorDestinationId } });
    if (!tailor) return NextResponse.json({ error: "Tailor destination not found" }, { status: 404 });
    if (tailor.businessStatus !== "APPROVED") return NextResponse.json({ error: "Tailor not approved yet" }, { status: 400 });
    // Optional: check tailor's city/service coverage — MVP allow any approved tailor
  }

  // Resolve items: either override (for single-product buy-now) or cart
  let rawItems: { productId: string; quantity: number }[] = [];
  if (overrideItems?.length) {
    rawItems = overrideItems;
  } else {
    const cart: any = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return NextResponse.json({ error: "Cart empty — add items at /fabrics" }, { status: 400 });
    const cartItems: any[] = await (prisma as any).cartItem.findMany({ where: { cartId: cart.id } });
    if (!cartItems.length) return NextResponse.json({ error: "Cart empty" }, { status: 400 });
    rawItems = cartItems.map((ci: any) => ({ productId: ci.productId, quantity: Number(ci.quantity) }));
  }

  // Load products with seller, validate stock, group by seller
  const productIds = rawItems.map(r => r.productId);
  const products: any[] = await prisma.fabricProduct.findMany({ where: { id: { in: productIds } }, include: { seller: true } });
  const productMap = new Map(products.map((p: any) => [p.id, p]));

  for (const it of rawItems) {
    const p: any = productMap.get(it.productId);
    if (!p) return NextResponse.json({ error: `Product ${it.productId} not found` }, { status: 404 });
    if (!p.isPublished) return NextResponse.json({ error: `${p.name} is not published` }, { status: 400 });
    if (it.quantity < p.minOrderQty) return NextResponse.json({ error: `${p.name} min order ${p.minOrderQty} ${p.unit}` }, { status: 400 });
    const available = Number(p.stock) - Number(p.reserved);
    if (it.quantity > available) return NextResponse.json({ error: `${p.name} only ${available} ${p.unit} available` }, { status: 400 });
  }

  // Group by sellerId for separate fulfilment orders
  const bySeller = new Map<string, typeof rawItems>();
  for (const it of rawItems) {
    const p: any = productMap.get(it.productId);
    const sid = p.sellerId;
    if (!bySeller.has(sid)) bySeller.set(sid, []);
    bySeller.get(sid)!.push(it);
  }

  // Create orders transactionally per seller with atomic inventory reservation
  const createdOrders: string[] = [];
  const orderRefs: string[] = [];

  try {
    for (const [sellerId, sellerItems] of bySeller.entries()) {
      const reference = `FO-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;
      const subtotal = sellerItems.reduce((s, it) => s + Number((productMap.get(it.productId) as any).price) * Number(it.quantity), 0);
      const deliveryFee = 2500; // flat fee per seller order (MVP); TODO distance-based
      const total = subtotal + deliveryFee;

      await prisma.$transaction(async (tx) => {
        // Reserve inventory atomically (optimistic check + update)
        for (const it of sellerItems) {
          const p: any = await tx.fabricProduct.findUnique({ where: { id: it.productId } });
          if (!p) throw new Error(`Product ${it.productId} not found in tx`);
          const available = Number(p.stock) - Number(p.reserved);
          if (it.quantity > available) throw new Error(`${p.name} insufficient stock ${available} in tx`);
          await tx.fabricProduct.update({ where: { id: it.productId }, data: { reserved: { increment: it.quantity } } });
          await tx.inventoryMovement.create({ data: { productId: it.productId, delta: -it.quantity, reason: `RESERVE checkout ${reference}` } });
        }

        const order = await tx.fabricOrder.create({
          data: {
            reference,
            customerId: userId,
            sellerId,
            status: "PENDING",
            subtotal, deliveryFee, total,
            currency: "NGN",
            paymentStatus: "PENDING",
            deliveryType,
            deliveryAddress,
            tailorDestinationId,
          },
        });

        for (const it of sellerItems) {
          const p: any = productMap.get(it.productId);
          await tx.fabricOrderItem.create({
            data: {
              orderId: order.id,
              productId: p.id,
              productName: p.name,
              unit: p.unit,
              priceSnapshot: p.price,
              quantity: it.quantity,
              lineTotal: Number(p.price) * Number(it.quantity),
            },
          });
        }

        await tx.delivery.create({
          data: {
            fabricOrderId: order.id,
            type: deliveryType,
            address: deliveryAddress,
            status: "PENDING",
            trackingCode: `TRK${nanoid(6).toUpperCase()}`,
          },
        });

        await tx.payment.create({
          data: {
            reference: `PAY-${reference}`,
            fabricOrderId: order.id,
            amount: total,
            currency: "NGN",
            provider: "paystack",
            status: "PENDING",
          },
        });

        // Notifications + audit inside tx
        const sellerProfile: any = await tx.sellerProfile.findUnique({ where: { id: sellerId } });
        if (sellerProfile?.userId) {
          await tx.notification.create({ data: { userId: sellerProfile.userId, title: "New fabric order", message: `Order ${reference} — ₦${total.toLocaleString()} • ${deliveryType === "TO_TAILOR" ? "Deliver to tailor" : "Deliver to customer"}`, type: "order", link: "/dashboard/seller/orders" } });
        }
        await tx.auditLog.create({ data: { userId, action: "CREATE_FABRIC_ORDER", entity: "FabricOrder", entityId: order.id, metadata: { reference, sellerId, total } } });

        createdOrders.push(order.id);
        orderRefs.push(reference);
      });
    }

    // Clear cart after success (only if we used cart)
    if (!overrideItems?.length) {
      const cart: any = await prisma.cart.findUnique({ where: { userId } });
      if (cart) await (prisma as any).cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    // Extra notification to tailor if delivered to them
    if (deliveryType === "TO_TAILOR" && tailorDestinationId) {
      try {
        const t: any = await prisma.tailorProfile.findUnique({ where: { id: tailorDestinationId } });
        if (t?.userId) await createNotification({ userId: t.userId, title: "Fabric arriving for your customer", message: `Order(s) ${orderRefs.join(", ")} will be delivered to your atelier — coordinate with customer`, type: "delivery", link: "/dashboard/tailor/orders" } as any);
      } catch {}
    }

    return NextResponse.json({ ok: true, orders: createdOrders, references: orderRefs, message: `Created ${createdOrders.length} order(s). Pay via Paystack to confirm — webhook will mark PAID.` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 400 });
  }
}
