import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function markAllRead() {
  "use server";
  const session = await requireAuth();
  await prisma.notification.updateMany({ where: { userId: (session.user as any).id, isRead: false }, data: { isRead: true } });
  revalidatePath("/notifications");
}
async function markOne(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const id = String(formData.get("id") || "");
  const n: any = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== (session.user as any).id) return;
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  revalidatePath("/notifications");
}

export default async function NotificationsPage() {
  const session = await requireAuth();
  const userId = (session.user as any).id;
  let items: any[] = [];
  let unread = 0;
  try {
    items = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
    unread = items.filter((i) => !i.isRead).length;
  } catch {}

  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex justify-between items-center">
          <div><h1 className="font-display text-2xl">Notifications</h1><p className="text-sm text-muted-foreground">{unread} unread • Booking, order, payment, delivery updates</p></div>
          <form action={markAllRead}><Button size="sm" variant="outline" className="h-8 text-xs">Mark all read</Button></form>
        </div>
        <Card><CardHeader><CardTitle className="text-sm">Recent • Auto-created on booking transitions, checkout, Paystack PAID</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.length === 0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No notifications yet — create a booking at /tailors or place a fabric order at /checkout.</div> :
            items.map((n: any) => (
              <div key={n.id} className={`border rounded-xl p-3 bg-white flex justify-between gap-3 ${n.isRead ? "opacity-70" : "border-plum/30"}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{n.title} {!n.isRead && <span className="ml-2 h-2 w-2 inline-block rounded-full bg-plum" aria-label="unread" />}</div>
                  <div className="text-xs text-muted-foreground">{n.message}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()} • {n.type} {n.link && <>• <Link href={n.link} className="underline">Open</Link></>}</div>
                </div>
                {!n.isRead && <form action={markOne}><input type="hidden" name="id" value={n.id} /><Button size="sm" variant="outline" className="h-7 text-xs shrink-0">Mark read</Button></form>}
              </div>
            ))}
            <div className="text-xs text-muted-foreground pt-2">Ownership-scoped: you only see your notifications. Email mirror via RESEND_API_KEY when EMAIL_PROVIDER=resend.</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
