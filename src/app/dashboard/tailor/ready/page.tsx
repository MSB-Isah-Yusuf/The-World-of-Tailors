import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";

async function markCompleted(formData: FormData) {
  "use server";
  const session = await requireRole(["TAILOR"]);
  const id = String(formData.get("id") || "");
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) return;
  const b: any = await prisma.tailoringBooking.findUnique({ where: { id } });
  if (!b || b.tailorId !== profile.id || b.status !== "READY") return;
  await prisma.tailoringBooking.update({ where: { id }, data: { status: "COMPLETED" as any } });
  await prisma.bookingStatusHistory.create({ data: { bookingId: id, fromStatus: "READY", toStatus: "COMPLETED", changedBy: (session.user as any).id } });
  await prisma.notification.create({ data: { userId: b.customerId, title: "Garment completed", message: `${b.reference} is completed — thank you!`, type: "booking", link: "/dashboard/customer/bookings" } });
  revalidatePath("/dashboard/tailor/ready");
}

export default async function ReadyPage() {
  const session = await requireRole(["TAILOR"]);
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) return <AdvancedTailorShell title="Ready"><div className="p-6">No profile</div></AdvancedTailorShell>;
  let ready: any[] = [];
  try { ready = await prisma.tailoringBooking.findMany({ where: { tailorId: profile.id, status: "READY" as any }, include: { customer: { select: { name: true } }, design: { select: { title: true } } }, orderBy: { updatedAt: "desc" } }); } catch { ready = []; }
  return (
    <AdvancedTailorShell title="Ready for Collection">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Ready for Collection</h1><p className="text-sm text-muted-foreground">Garments finished • Notify customer • Handover → Completed</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Ready • {ready.length} — notify customer, mark collected</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ready.length===0 ? <div className="text-sm text-muted-foreground p-6 text-center border rounded-xl bg-white">No garments ready — move jobs from Production (IN_PRODUCTION → READY) first.</div> :
            ready.map((b:any)=><div key={b.id} className="border rounded-xl p-3 bg-white">
              <div className="flex justify-between gap-2"><span className="text-sm font-medium">{b.reference} • {b.customer?.name} • {b.design?.title||"Bespoke"} <Badge variant="gold">READY</Badge></span><span className="text-xs text-muted-foreground">{b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString():"—"}</span></div>
              <div className="text-xs text-muted-foreground line-clamp-2">{b.description?.slice(0,120)||"—"}</div>
              <form action={markCompleted} className="mt-3"><input type="hidden" name="id" value={b.id}/><Button size="sm" className="h-7 text-xs">Mark Collected → Completed</Button><span className="text-xs text-muted-foreground ml-2">Notifies customer, creates history</span></form>
            </div>)}
          </CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
