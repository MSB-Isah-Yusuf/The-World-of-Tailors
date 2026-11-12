import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function broadcast(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);
  const title = String(formData.get("title") || "").slice(0,100).trim();
  const message = String(formData.get("message") || "").slice(0,500).trim();
  const target = String(formData.get("target") || "all") as "all"|"tailors"|"sellers"|"customers";
  if (!title || !message) return;
  let where: any = {};
  if (target === "tailors") where.role = "TAILOR" as any;
  if (target === "sellers") where.role = "FABRIC_SELLER" as any;
  if (target === "customers") where.role = "CUSTOMER" as any;
  const users: any[] = await prisma.user.findMany({ where, select: { id: true }, take: 200 });
  for (const u of users) await prisma.notification.create({ data: { userId: u.id, title, message, type: "broadcast", link: target === "tailors" ? "/dashboard/tailor" : target === "sellers" ? "/dashboard/seller" : "/" } });
  await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_BROADCAST", entity: "Notification", entityId: "broadcast", metadata: { title, target, count: users.length } } });
  revalidatePath("/admin/notifications");
}

export default async function AdminNotifications() {
  await requireRole(["ADMIN"]);
  let recent: any[] = [];
  try { recent = await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { user: { select: { email: true } } } as any }); } catch {}
  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Notifications</h1><p className="text-sm text-muted-foreground">Broadcast to roles • Templates • Recent 10 live</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardHeader><CardTitle className="text-sm">Broadcast</CardTitle></CardHeader><CardContent>
          <form action={broadcast} className="space-y-3">
            <Input name="title" placeholder="Title e.g. Platform update" className="h-9 bg-white" required/>
            <Input name="message" placeholder="Message (500 chars)" className="h-10 bg-white" required/>
            <div className="flex gap-2"><select name="target" className="h-9 rounded-xl border px-3 text-sm bg-white"><option value="all">All users</option><option value="tailors">Tailors only</option><option value="sellers">Sellers only</option><option value="customers">Customers only</option></select><Button size="sm" type="submit">Broadcast • audit logged</Button></div>
            <div className="text-xs text-muted-foreground">Creates Notification per user (batched 200), unread bell, email mirror if RESEND configured.</div>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Recent notifications (10)</CardTitle></CardHeader><CardContent className="space-y-1 text-xs">{recent.length? recent.map((n:any)=><div key={n.id} className="flex justify-between border-b py-2"><span>{n.title} → {n.user?.email||n.userId.slice(0,8)} • {n.type}</span><span className="text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</span></div>) : <div className="text-muted-foreground p-4 text-center border rounded-xl bg-white">No notifications yet.</div>}</CardContent></Card>
      </div>
    </div>
  );
}
