import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 30;
  const action = sp?.action || "";

  let where: any = {};
  if (action) where.action = { contains: action, mode: "insensitive" };

  let logs: any[] = [], total = 0;
  try {
    total = await prisma.auditLog.count({ where });
    logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page-1)*take, take, include: { user: { select: { email: true, name: true } } } });
  } catch { logs = []; }

  return (
    <div className="min-h-screen bg-ivory p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><h1 className="font-display text-2xl">Audit Logs</h1><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardContent className="p-4">
          <form className="flex gap-2">
            <input name="action" defaultValue={action} placeholder="Filter action e.g. APPROVE" className="h-9 rounded-xl border px-3 text-sm bg-white w-64" />
            <button className="px-4 h-9 rounded-full bg-midnight text-white text-xs">Filter</button>
            <span className="text-xs text-muted-foreground self-center">{total} entries • page {page}</span>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Last {logs.length} events • Immutable • Measurement access is redacted</CardTitle></CardHeader>
          <CardContent className="space-y-1 font-mono text-xs">
            {logs.length === 0 ? <div className="text-muted-foreground p-4 border rounded-xl bg-white text-center">No audit entries yet — actions like BOOKING_*_TO_*, CREATE_FABRIC_ORDER, APPROVE_TAILOR, ADMIN_SUSPENDED_USER appear here.</div> :
            logs.map((l:any) => (
              <div key={l.id} className="flex gap-2 py-2 border-b last:border-0">
                <span className="text-muted-foreground shrink-0">{new Date(l.createdAt).toLocaleString()}</span>
                <span className="font-semibold">{l.user?.email || l.userId || "system"}</span>
                <span className="px-2 py-0.5 rounded-full bg-midnight text-white">{l.action}</span>
                <span>{l.entity || ""}{l.entityId ? `:${String(l.entityId).slice(0,8)}` : ""}</span>
                {l.metadata && <span className="text-muted-foreground truncate">{JSON.stringify(l.metadata).slice(0,120)}</span>}
              </div>
            ))}
            <div className="flex gap-2 pt-3">
              {page > 1 && <Link href={`/admin/audit?page=${page-1}`} className="px-3 py-1 rounded-full border bg-white text-xs">← Prev</Link>}
              {logs.length === take && <Link href={`/admin/audit?page=${page+1}`} className="px-3 py-1 rounded-full border bg-white text-xs">Next →</Link>}
            </div>
          </CardContent></Card>
      </div>
    </div>
  );
}
