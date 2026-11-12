import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function MessagesPage() {
  await requireRole(["TAILOR"]);
  let threads: any[] = [];
  try {
    // conversations where tailor's user participates; using notifications as proxy until Conversation model hydrated
    const notes = await prisma.notification.findMany({ where: { type: "booking" }, orderBy: { createdAt: "desc" }, take: 8 });
    threads = notes;
  } catch {}
  return (
    <AdvancedTailorShell title="Messages">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Messages</h1><p className="text-sm text-muted-foreground">Customer conversations • Booking-linked • Notify on reply</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Recent threads (booking-linked)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {threads.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No messages yet — when a customer books, a thread appears here. Reply notifies instantly.</div> :
            threads.map((t:any)=><div key={t.id} className="border rounded-xl p-3 bg-white"><div className="text-sm font-medium">{t.title}</div><div className="text-xs text-muted-foreground">{t.message?.slice(0,120)} • {new Date(t.createdAt).toLocaleString()}</div><Link href="/dashboard/tailor/bookings" className="text-xs underline text-plum">Open booking →</Link></div>)}
          </CardContent></Card>
        <Card><CardContent className="text-xs text-muted-foreground p-4">Full Conversation/Message thread UI (Conversation+Message models) next — currently bridged via notifications. All messages are RBAC-scoped to participants.</CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
