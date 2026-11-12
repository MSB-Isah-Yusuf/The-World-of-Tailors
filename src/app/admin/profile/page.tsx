import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function AdminProfilePage() {
  const session = await requireRole(["ADMIN"]);
  const uid = (session.user as any).id;
  let user: any = null;
  let myLogs: any[] = [];
  try {
    user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true, role: true, status: true, phone: true, createdAt: true } });
    myLogs = await prisma.auditLog.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" }, take: 10 });
  } catch {}
  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex justify-between"><h1 className="font-display text-2xl">Admin Profile</h1><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardHeader><CardTitle className="text-sm">Account</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> {user?.name || (session.user as any).name}</div>
          <div><span className="text-muted-foreground">Email:</span> {user?.email || (session.user as any).email}</div>
          <div><span className="text-muted-foreground">Role:</span> {user?.role || "ADMIN"} • Status {user?.status || "ACTIVE"}</div>
          <div><span className="text-muted-foreground">Phone:</span> {user?.phone || "—"} • Joined {user ? new Date(user.createdAt).toLocaleDateString() : "—"}</div>
          <div className="text-xs text-muted-foreground pt-2">MSB msb_025@outlook.com is platform owner • Change password via /login → reset • Sessions audited below.</div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">My recent admin actions (10)</CardTitle></CardHeader><CardContent className="space-y-1 font-mono text-xs">{myLogs.length ? myLogs.map((l:any)=><div key={l.id}>[{new Date(l.createdAt).toLocaleString()}] {l.action} {l.entity} {l.entityId?.slice(0,8) || ""}</div>) : <div className="text-muted-foreground">No actions yet.</div>}</CardContent></Card>
      </div>
    </div>
  );
}
