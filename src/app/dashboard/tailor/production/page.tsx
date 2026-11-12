import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function advanceProduction(formData: FormData) {
  "use server";
  const session = await requireRole(["TAILOR"]);
  const bookingId = String(formData.get("bookingId") || "");
  const note = String(formData.get("note") || "").slice(0,500);
  const userId = (session.user as any).id;
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId } });
  const booking: any = await prisma.tailoringBooking.findUnique({ where: { id: bookingId } });
  if (!profile || !booking || booking.tailorId !== profile.id) throw new Error("FORBIDDEN");
  const next: Record<string, string> = { ACCEPTED: "IN_PRODUCTION", IN_PRODUCTION: "READY", READY: "COMPLETED" };
  const to = next[booking.status];
  if (!to) return;
  await prisma.tailoringBooking.update({ where: { id: bookingId }, data: { status: to as any } });
  await prisma.bookingStatusHistory.create({ data: { bookingId, fromStatus: booking.status, toStatus: to, changedBy: userId, message: note || "Production advance" } });
  if (note) await prisma.bookingNote.create({ data: { bookingId, authorId: userId, message: note, isInternal: false } });
  await prisma.auditLog.create({ data: { userId, action: "PRODUCTION_" + booking.status + "_TO_" + to, entity: "TailoringBooking", entityId: bookingId, metadata: { note } } });
  if (to === "READY" || to === "COMPLETED") await prisma.notification.create({ data: { userId: booking.customerId, title: `Booking ${to.toLowerCase()}`, message: `${booking.reference} is now ${to}`, type: "booking", link: "/dashboard/customer/bookings" } });
  revalidatePath("/dashboard/tailor/production");
}

async function addNote(formData: FormData) {
  "use server";
  const session = await requireRole(["TAILOR"]);
  const bookingId = String(formData.get("bookingId") || "");
  const message = String(formData.get("message") || "").slice(0,800).trim();
  if (!message) return;
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  const booking: any = await prisma.tailoringBooking.findUnique({ where: { id: bookingId } });
  if (!profile || !booking || booking.tailorId !== profile.id) return;
  await prisma.bookingNote.create({ data: { bookingId, authorId: (session.user as any).id, message, isInternal: Boolean(formData.get("isInternal")) } });
  revalidatePath("/dashboard/tailor/production");
}

export default async function TailorProductionPage() {
  const session = await requireRole(["TAILOR"]);
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) return <AdvancedTailorShell title="Production"><Card><CardContent className="p-6 text-sm">No profile.</CardContent></Card></AdvancedTailorShell>;
  let bookings: any[] = [];
  try {
    bookings = await prisma.tailoringBooking.findMany({
      where: { tailorId: profile.id, status: { in: ["ACCEPTED", "IN_PRODUCTION", "READY", "ON_HOLD"] as any } },
      include: { customer: { select: { name: true } }, design: { select: { title: true } }, statusHistory: { orderBy: { createdAt: "desc" }, take: 3 }, notes: { orderBy: { createdAt: "desc" }, take: 3 } },
      orderBy: { estimatedCompletion: "asc" },
    });
  } catch { bookings = []; }
  const now = Date.now();
  return (
    <AdvancedTailorShell title="Production Tracking">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Production Tracking — {profile.businessName}</h1><p className="text-sm text-muted-foreground">Kanban pipeline • Progress notes • Status history • Customer notified on milestones</p></div>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <Card><CardHeader><CardTitle className="text-sm">In Production</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{bookings.filter(b=>b.status==="IN_PRODUCTION").length}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Ready</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{bookings.filter(b=>b.status==="READY").length}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Overdue</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold text-burgundy">{bookings.filter(b=> b.estimatedCompletion && new Date(b.estimatedCompletion).getTime() < now && ["ACCEPTED","IN_PRODUCTION"].includes(b.status)).length}</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-base">Pipeline — strict state-machine</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {bookings.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No jobs in production. Accept REQUESTED bookings at <Link href="/dashboard/tailor/bookings" className="underline">Bookings</Link>.</div> :
            bookings.map(b=>{
              const overdue = b.estimatedCompletion && new Date(b.estimatedCompletion).getTime() < now;
              return (
                <div key={b.id} className={`rounded-xl border p-4 bg-white ${overdue?"border-burgundy/30 bg-burgundy/5":""}`}>
                  <div className="flex flex-wrap justify-between gap-2"><div className="text-sm"><span className="font-semibold">{b.reference}</span> • {b.design?.title||"Bespoke"} • {b.customer.name} • Due {b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString():"—"} {overdue&&<Badge variant="burgundy" className="ml-2">OVERDUE</Badge>}</div><Badge variant={b.status==="READY"?"gold":b.status==="IN_PRODUCTION"?"plum":"secondary"}>{b.status}</Badge></div>
                  <div className="text-xs text-muted-foreground mt-2">History: {b.statusHistory?.length ? b.statusHistory.map((h:any)=> `${h.fromStatus||"—"}→${h.toStatus} ${h.message?`(${h.message.slice(0,30)})`:""}`).join(" • ") : "No history yet"}</div>
                  {b.notes?.length ? <div className="mt-2 space-y-1 text-xs">{b.notes.map((n:any)=><div key={n.id} className="rounded-lg bg-ivory border px-3 py-2">{n.message} <span className="text-muted-foreground">• {new Date(n.createdAt).toLocaleString()} {n.isInternal?"• internal":""}</span></div>)}</div> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={advanceProduction} className="flex gap-2"><input type="hidden" name="bookingId" value={b.id}/><input name="note" placeholder="Cutting done / ready note…" className="h-7 rounded-full border px-3 text-xs w-40 bg-white"/><Button size="sm" className="h-7 text-xs">Advance: {b.status==="ACCEPTED"?"Start → IN_PRODUCTION": b.status==="IN_PRODUCTION"?"Mark READY":b.status==="READY"?"Mark COMPLETED":"—"}</Button></form>
                    <form action={addNote} className="flex gap-2 flex-1"><input type="hidden" name="bookingId" value={b.id}/><input name="message" placeholder="Add private note…" className="flex-1 h-7 rounded-full border px-3 text-xs bg-white"/><label className="text-xs flex items-center gap-1"><input type="checkbox" name="isInternal" defaultChecked/> internal</label><Button size="sm" variant="outline" className="h-7 text-xs">Add note</Button></form>
                  </div>
                </div>
              );
            })}
          </CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
