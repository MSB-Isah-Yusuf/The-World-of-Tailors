import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["CUSTOMER"]);
  const { id } = await params;
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  let b: any = null;
  try {
    b = await prisma.tailoringBooking.findUnique({ where: { id }, include: { tailor: { select: { businessName: true, slug: true } }, design: { select: { title: true, slug: true } }, statusHistory: { orderBy: { createdAt: "asc" } }, notes: { orderBy: { createdAt: "desc" }, take: 5 } } });
  } catch {}
  if (!b || b.customerId !== uid) return <AdvancedCustomerShell title="Booking"><div className="p-8 text-sm">Booking not found or not yours.</div></AdvancedCustomerShell>;
  return (
    <AdvancedCustomerShell title="Booking Details">
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">{b.reference} • {b.tailor?.businessName}</h1><p className="text-sm text-muted-foreground">Tailor: <Link href={`/tailors/${b.tailor?.slug}`} className="underline">{b.tailor?.businessName}</Link> • Design: {b.design?.title||"Bespoke"} • Snapshot frozen at request</p></div><Badge variant={b.status==="COMPLETED"?"success":b.status==="REQUESTED"?"warning":"secondary"}>{b.status} • {b.paymentStatus}</Badge></div>
        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Agreed Price</CardTitle></CardHeader><CardContent>₦{b.agreedPrice?Number(b.agreedPrice).toLocaleString():"To be quoted"}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Est. Completion</CardTitle></CardHeader><CardContent>{b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString():"TBD"}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Measurement Snapshot</CardTitle></CardHeader><CardContent className="text-xs font-mono">{b.measurementSnapshot ? JSON.stringify(b.measurementSnapshot).slice(0,120) : "—"}</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-sm">Status history • {b.statusHistory?.length||0} events</CardTitle></CardHeader><CardContent className="space-y-1 text-xs">{(b.statusHistory||[]).length ? b.statusHistory.map((h:any)=><div key={h.id} className="flex justify-between border-b py-2"><span>{h.fromStatus||"—"} → {h.toStatus} {h.message?`• ${h.message.slice(0,60)}`:""}</span><span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span></div>) : <div className="text-muted-foreground">No transitions yet.</div>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader><CardContent className="text-sm">{b.description||"—"}</CardContent></Card>
        <Link href="/dashboard/customer/bookings" className="text-sm underline">← Back to bookings</Link>
      </div>
    </AdvancedCustomerShell>
  );
}
