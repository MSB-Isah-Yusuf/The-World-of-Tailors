import { prisma } from "./prisma";

export async function createNotification({ userId, title, message, type, link }: { userId: string; title: string; message: string; type: string; link?: string }) {
  try {
    return await prisma.notification.create({ data: { userId, title, message, type, link } });
  } catch (e) {
    console.warn("[notifications] create failed", (e as Error).message);
    return null;
  }
}

export async function createNotificationForSellerOrder({ sellerUserId, reference }: { sellerUserId: string; reference: string }) {
  return createNotification({ userId: sellerUserId, title: "New fabric order", message: `Order ${reference} placed — confirm in your dashboard`, type: "order", link: "/dashboard/seller/orders" });
}
