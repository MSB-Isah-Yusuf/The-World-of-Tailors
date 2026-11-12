import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/cart — ownership-scoped, returns cart with items + product + seller
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  let cart: any = await prisma.cart.findUnique({ where: { userId }, include: { items: { include: { } } as any } });
  // Prisma include needs relation; CartItem has productId but no direct relation defined in schema for product — we fetch manually
  if (!cart) return NextResponse.json({ cart: null, items: [] });

  const items = await (prisma as any).cartItem.findMany({ where: { cartId: cart.id } });
  const productIds = items.map((i: any) => i.productId);
  const products = productIds.length ? await prisma.fabricProduct.findMany({ where: { id: { in: productIds } }, include: { seller: true, images: true } }) : [];
  const productMap = new Map((products as any[]).map((p: any) => [p.id, p]));

  const enriched = items.map((it: any) => ({
    ...it,
    product: productMap.get(it.productId) || null,
    lineTotal: productMap.get(it.productId) ? Number(productMap.get(it.productId).price) * Number(it.quantity) : 0,
  }));
  const subtotal = enriched.reduce((s: number, it: any) => s + (it.lineTotal || 0), 0);

  return NextResponse.json({ cart: { id: cart.id, userId }, items: enriched, subtotal, count: enriched.length });
}

// POST /api/cart — { productId, quantity } — upsert, validates stock + minOrderQty + publish
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const body = await req.json().catch(() => ({}));
  const { productId, quantity, action } = body as { productId?: string; quantity?: number; action?: string };

  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product: any = await prisma.fabricProduct.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (!product.isPublished) return NextResponse.json({ error: "Product not published" }, { status: 400 });

  // handle remove action
  if (action === "remove") {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) await (prisma as any).cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    return NextResponse.json({ ok: true });
  }

  const qty = Number(quantity ?? product.minOrderQty);
  if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  if (qty < product.minOrderQty) return NextResponse.json({ error: `Min order ${product.minOrderQty} ${product.unit}` }, { status: 400 });
  const available = Number(product.stock) - Number(product.reserved);
  if (qty > available) return NextResponse.json({ error: `Only ${available} ${product.unit} available (stock ${product.stock} - reserved ${product.reserved})` }, { status: 400 });

  // ensure cart exists
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) cart = await prisma.cart.create({ data: { userId } });

  const existing: any = await (prisma as any).cartItem.findFirst({ where: { cartId: cart.id, productId } });
  if (existing) {
    await (prisma as any).cartItem.update({ where: { id: existing.id }, data: { quantity: qty } });
  } else {
    await (prisma as any).cartItem.create({ data: { cartId: cart.id, productId, quantity: qty } });
  }

  return NextResponse.json({ ok: true });
}

// PATCH /api/cart — { items: [{ productId, quantity }] } — bulk update (e.g., checkout page)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { items } = await req.json().catch(() => ({} as any));
  if (!Array.isArray(items)) return NextResponse.json({ error: "items array required" }, { status: 400 });

  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) cart = await prisma.cart.create({ data: { userId } });

  for (const it of items) {
    if (!it.productId) continue;
    const p: any = await prisma.fabricProduct.findUnique({ where: { id: it.productId } });
    if (!p) continue;
    const qty = Number(it.quantity);
    if (!qty || qty <= 0) {
      await (prisma as any).cartItem.deleteMany({ where: { cartId: cart.id, productId: it.productId } });
      continue;
    }
    const available = Number(p.stock) - Number(p.reserved);
    if (qty > available) return NextResponse.json({ error: `Insufficient stock for ${p.name}: ${available} available` }, { status: 400 });
    const ex: any = await (prisma as any).cartItem.findFirst({ where: { cartId: cart.id, productId: it.productId } });
    if (ex) await (prisma as any).cartItem.update({ where: { id: ex.id }, data: { quantity: qty } });
    else await (prisma as any).cartItem.create({ data: { cartId: cart.id, productId: it.productId, quantity: qty } });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/cart — clear cart
export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (cart) await (prisma as any).cartItem.deleteMany({ where: { cartId: cart.id } });
  return NextResponse.json({ ok: true });
}
