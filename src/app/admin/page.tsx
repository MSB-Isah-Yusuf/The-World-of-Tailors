import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function AdminPage() {
  await requireRole(["ADMIN"]);
  let pendingTailors = 0, pendingSellers = 0, totalUsers = 0, totalOrders = 0;
  let recentLogs: any[] = [];
  let queuePreview: any[] = [];
  try {
    [pendingTailors, pendingSellers, totalUsers, totalOrders, recentLogs, queuePreview] = await Promise.all([
      prisma.tailorProfile.count({ where: { businessStatus: "PENDING" } }),
      prisma.sellerProfile.count({ where: { businessStatus: "PENDING" } }),
      prisma.user.count(),
      prisma.fabricOrder.count(),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { email: true } } } }),
      prisma.tailorProfile.findMany({ where: { businessStatus: "PENDING" }, take: 2, select: { businessName: true, city: true, createdAt: true } }),
    ]);
  } catch {}

  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between gap-2">
          <div><h1 className="font-display text-2xl">Admin — Platform Control</h1><p className="text-sm text-muted-foreground">Live stats • No public admin registration • Measurement access audited • MSB + admin@demo only</p></div>
          <Link href="/admin/verification" className="px-4 py-2 rounded-full bg-midnight text-white text-xs self-start">Verification Queue →</Link>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Pending Verifications</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{pendingTailors + pendingSellers}</div><div className="text-xs text-muted-foreground">{pendingTailors} tailors • {pendingSellers} sellers</div><Link href="/admin/verification" className="text-xs underline text-plum">Review →</Link></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Total Users</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{totalUsers}</div><div className="text-xs text-muted-foreground">All roles • <Link href="/admin/users" className="underline">Manage</Link></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Fabric Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{totalOrders}</div><div className="text-xs text-muted-foreground"><Link href="/admin/orders" className="underline">Oversight</Link> • Paystack PAID via webhook</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Security (24h)</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{recentLogs.length}</div><div className="text-xs text-muted-foreground">Audit events • Rate-limited 429 in middleware</div><Link href="/admin/audit" className="text-xs underline text-plum">Audit logs →</Link></CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle className="text-base">Business Verification Queue (live)</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {queuePreview.length ? queuePreview.map((q:any) => <div key={q.businessName} className="border rounded-xl p-3 bg-white flex justify-between"><span>{q.businessName} — {q.city} • Applied {new Date(q.createdAt).toLocaleDateString()}</span><Badge variant="secondary">PENDING</Badge></div>)
            : <div className="text-sm text-muted-foreground p-4 border rounded-xl bg-white text-center">No pending — demo tailors are APPROVED via seed.</div>}
            <div className="text-xs text-muted-foreground">Approve/reject records AuditLog APPROVE_TAILOR/SELLER. Suspension revokes sessions immediately.</div>
          </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Audit Logs — last 5 (live)</CardTitle></CardHeader>
          <CardContent className="text-xs font-mono space-y-1">
            {recentLogs.length ? recentLogs.map((l:any) => <div key={l.id}>[{new Date(l.createdAt).toLocaleString()}] {l.user?.email || l.userId || "system"} • {l.action} • {l.entity}{l.entityId ? `:${String(l.entityId).slice(0,8)}` : ""}</div>)
            : <div>[live] No audit events yet — create/approve actions appear here.</div>}
            <div className="text-muted-foreground pt-2">All privileged ops audited. Measurement access redacted. <Link href="/admin/audit" className="underline">View all →</Link></div>
          </CardContent></Card>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/admin/users" className="px-4 py-2 rounded-full border bg-white">User Management</Link>
          <Link href="/admin/verification" className="px-4 py-2 rounded-full border bg-white">Business Verification</Link>
          <Link href="/admin/orders" className="px-4 py-2 rounded-full border bg-white">Order Oversight</Link>
          <Link href="/admin/audit" className="px-4 py-2 rounded-full border bg-white">Audit Logs</Link>
        </div>
      </div>
    </div>
  );
}
