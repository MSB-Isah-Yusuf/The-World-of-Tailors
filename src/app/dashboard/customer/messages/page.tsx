import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export default async function CustomerMessages() {
  await requireRole(["CUSTOMER"]);
  let notes: any[] = [];
  try { notes = await prisma.notification.findMany({ where: { type: "booking" }, orderBy: { createdAt: "desc" }, take: 8 }); } catch {}
  return (
    <AdvancedCustomerShell title="Messages">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Messages</h1><p className="text-sm text-muted-foreground">Conversations with tailors • Booking-linked • RBAC-scoped</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Recent threads</CardTitle></CardHeader><CardContent className="space-y-2">{notes.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No messages — booking a tailor creates a thread here.</div> : notes.map((n:any)=><div key={n.id} className="border rounded-xl p-3 bg-white"><div className="text-sm font-medium">{n.title}</div><div className="text-xs text-muted-foreground">{n.message?.slice(0,120)} • {new Date(n.createdAt).toLocaleString()}</div></div>)}</CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
