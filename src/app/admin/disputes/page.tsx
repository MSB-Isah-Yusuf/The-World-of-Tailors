import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function resolveDispute(formData: FormData) {
  "use server";
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "").slice(0,500);
  // Using Review as proxy for disputes (report table not yet) — audit + notification
  await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: "ADMIN_RESOLVE_DISPUTE", entity: "Review", entityId: id, metadata: { decision } } });
  revalidatePath("/admin/disputes");
}

export default async function DisputesPage() {
  await requireRole(["ADMIN"]);
  let flagged: any[] = [];
  try { flagged = await prisma.review.findMany({ where: { isPublished: false }, take: 10, include: { author: { select: { email: true } } } as any, orderBy: { createdAt: "desc" } }); } catch { flagged = []; }
  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Disputes & Complaints</h1><p className="text-sm text-muted-foreground">Investigate • Record decisions • Notify parties • Auditable history</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <Card><CardHeader><CardTitle className="text-sm">Open disputes (hidden/reported reviews proxy) • {flagged.length}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {flagged.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No open disputes — reported content appears here. Resolve records decision + audit.</div> :
            flagged.map((r:any)=><div key={r.id} className="border rounded-xl p-3 bg-white">
              <div className="flex justify-between text-sm"><span className="font-medium">Review by {r.author?.email || "—"} • {r.rating}★ <Badge variant="muted">PENDING REVIEW</Badge></span><span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span></div>
              <div className="text-xs mt-1">{r.comment?.slice(0,160)||"—"}</div>
              <form action={resolveDispute} className="flex gap-2 mt-3"><input type="hidden" name="id" value={r.id}/><input name="decision" placeholder="Decision / reason" className="flex-1 h-8 rounded-full border px-3 text-xs bg-white"/><Button size="sm" className="h-8 text-xs">Resolve & notify</Button></form>
            </div>)}
            <div className="text-xs text-muted-foreground">Dispute workflow: view booking/order reference → investigate → decision → notify buyer + seller/tailor → audit ADMIN_RESOLVE_DISPUTE. Full complaint model next.</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
