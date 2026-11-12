import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function markAll(){
  "use server";
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  await prisma.notification.updateMany({ where:{ userId:(session as any).user.id, isRead:false }, data:{ isRead:true } });
  revalidatePath("/dashboard/customer/notifications");
}

export default async function CustomerNotifications(){
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  let items: any[] = [];
  try{ items = await prisma.notification.findMany({ where:{ userId:(session as any).user.id }, orderBy:{ createdAt:"desc" }, take:30 }); } catch{}
  return (
    <AdvancedCustomerShell title="Notifications">
      <div className="space-y-6 max-w-3xl">
        <div className="flex justify-between"><h1 className="font-display text-2xl">Notifications</h1><form action={markAll}><Button size="sm" variant="outline" className="h-7 text-xs">Mark all read</Button></form></div>
        <Card><CardHeader><CardTitle className="text-sm">Recent • Bookings, orders, delivery, payments</CardTitle></CardHeader><CardContent className="space-y-2">{items.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No notifications — bookings & orders create them.</div> : items.map((n:any)=><div key={n.id} className={`border rounded-xl p-3 bg-white flex justify-between gap-3 ${n.isRead?"opacity-70":"border-plum/30"}`}><div className="text-sm flex-1"><div className="font-medium">{n.title}</div><div className="text-xs text-muted-foreground">{n.message}</div><div className="text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()} {n.link && <Link href={n.link} className="underline">Open →</Link>}</div></div></div>)}</CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
