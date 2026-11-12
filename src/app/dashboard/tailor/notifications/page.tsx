import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function markRead(formData: FormData){
  "use server";
  const session = await requireRole(["TAILOR"]);
  const id = String(formData.get("id")||"");
  const n: any = await prisma.notification.findUnique({ where:{ id } });
  if (!n || n.userId !== (session.user as any).id) return;
  await prisma.notification.update({ where:{ id }, data:{ isRead:true } });
  revalidatePath("/dashboard/tailor/notifications");
}
async function markAll(){
  "use server";
  const session = await requireRole(["TAILOR"]);
  await prisma.notification.updateMany({ where:{ userId:(session.user as any).id, isRead:false }, data:{ isRead:true } });
  revalidatePath("/dashboard/tailor/notifications");
}

export default async function TailorNotifications() {
  const session = await requireRole(["TAILOR"]);
  let items: any[] = [];
  try { items = await prisma.notification.findMany({ where:{ userId:(session.user as any).id }, orderBy:{ createdAt:"desc" }, take:30 }); } catch {}
  return (
    <AdvancedTailorShell title="Notifications">
      <div className="space-y-6 max-w-3xl">
        <div className="flex justify-between"><h1 className="font-display text-2xl">Notifications</h1><form action={markAll}><Button size="sm" variant="outline" className="h-7 text-xs">Mark all read</Button></form></div>
        <Card><CardHeader><CardTitle className="text-sm">Recent • New bookings, payments, reviews, deadlines</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No notifications yet — new bookings appear here.</div> :
            items.map((n:any)=><div key={n.id} className={`border rounded-xl p-3 bg-white flex justify-between gap-3 ${n.isRead?"opacity-70":"border-plum/30"}`}>
              <div className="text-sm flex-1"><div className="font-medium">{n.title} {!n.isRead && <span className="ml-2 h-2 w-2 inline-block rounded-full bg-plum"/>}</div><div className="text-xs text-muted-foreground">{n.message}</div><div className="text-[11px] text-muted-foreground">{new Date(n.createdAt).toLocaleString()} • {n.type} {n.link && <Link href={n.link} className="underline">Open</Link>}</div></div>
              {!n.isRead && <form action={markRead}><input type="hidden" name="id" value={n.id}/><Button size="sm" variant="outline" className="h-7 text-xs">Mark read</Button></form>}
            </div>)}
          </CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
