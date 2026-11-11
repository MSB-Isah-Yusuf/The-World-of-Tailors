import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function advanceProduction(formData: FormData) {
  "use server";
  const { requireRole: rr } = await import("@/lib/rbac");
  const session = await rr(["TAILOR"]);
  const { prisma: p } = await import("@/lib/prisma");
  const bookingId = String(formData.get("bookingId")||"");
  const userId = (session.user as any).id;
  const profile = await p.tailorProfile.findUnique({ where: { userId } });
  const booking = await p.tailoringBooking.findUnique({ where: { id: bookingId } });
  if (!profile || !booking || booking.tailorId!==profile.id) throw new Error("FORBIDDEN");
  // Strict production pipeline: ACCEPTED→IN_PRODUCTION→READY→COMPLETED
  const next: Record<string,string> = { ACCEPTED:"IN_PRODUCTION", IN_PRODUCTION:"READY", READY:"COMPLETED" };
  const to = next[booking.status];
  if (!to) return;
  await p.tailoringBooking.update({ where: { id: bookingId }, data: { status: to as any } });
  await p.bookingStatusHistory.create({ data: { bookingId, fromStatus: booking.status, toStatus: to, changedBy: userId, message: String(formData.get("note")||"Production advance") } });
  await p.auditLog.create({ data: { userId, action: "PRODUCTION_"+booking.status+"_TO_"+to, entity: "TailoringBooking", entityId: bookingId } });
  const { revalidatePath: rp } = await import("next/cache");
  rp("/dashboard/tailor/production");
}

export default async function TailorProductionPage() {
  const session = await requireRole(["TAILOR"]);
  const profile = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) return <DashboardShell role="TAILOR" title="Tailor Business" nav={[{href:"#",label:"Overview"}]}><Card><CardContent className="p-6 text-sm">No profile.</CardContent></Card></DashboardShell>;
  let bookings:any[]=[];
  try {
    bookings = await prisma.tailoringBooking.findMany({
      where: { tailorId: profile.id, status: { in: ["ACCEPTED","IN_PRODUCTION","READY","ON_HOLD"] } },
      include: { customer: { select: { name:true } }, design: { select: { title:true } } },
      orderBy: { estimatedCompletion: "asc" },
    });
  } catch { bookings=[]; }
  const now = Date.now();
  const nav = [
    { href: "/dashboard/tailor", label: "Overview" },
    { href: "/dashboard/tailor/customers", label: "Customers" },
    { href: "/dashboard/tailor/bookings", label: "Bookings" },
    { href: "/dashboard/tailor/production", label: "Production Tracking" },
    { href: "/dashboard/tailor/designs", label: "Design Portfolio" },
    { href: "/dashboard/tailor/profile", label: "Profile & Settings" },
  ];
  return (
    <DashboardShell role="TAILOR" title="Tailor Business" nav={nav}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl">Production Tracking — {profile.businessName}</h1>
          <p className="text-sm text-muted-foreground">Only your accepted pipeline • Overdue flagged vs <code>estimatedCompletion</code> • All moves audit-logged • History preserved.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <Card><CardHeader><CardTitle className="text-sm">In Production</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{bookings.filter(b=>b.status==="IN_PRODUCTION").length}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Ready for pickup</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{bookings.filter(b=>b.status==="READY").length}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Overdue</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold text-burgundy">{bookings.filter(b=> b.estimatedCompletion && new Date(b.estimatedCompletion).getTime() < now && !["COMPLETED","CANCELLED","DECLINED"].includes(b.status)).length}</div></CardContent></Card>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Kanban pipeline — strict state validation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bookings.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No jobs in production. Accept REQUESTED bookings at <Link href="/dashboard/tailor/bookings" className="underline">Bookings</Link> to populate this board.</div> :
            bookings.map(b=>{
              const overdue = b.estimatedCompletion && new Date(b.estimatedCompletion).getTime() < now;
              return (
                <div key={b.id} className={`rounded-xl border p-4 bg-white ${overdue?"border-burgundy/30 bg-burgundy/5":""}`}>
                  <div className="flex justify-between">
                    <div className="text-sm"><span className="font-semibold">{b.reference}</span> • {b.design?.title||"Bespoke"} • {b.customer.name} • Due {b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString(): "—"} {overdue&&<Badge variant="burgundy" className="ml-2">OVERDUE</Badge>}</div>
                    <Badge variant={b.status==="READY"?"gold": b.status==="IN_PRODUCTION"?"plum":"secondary"}>{b.status}</Badge>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <form action={advanceProduction} className="flex gap-2">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input name="note" placeholder="Cutting done / ready note…" className="h-7 rounded border px-2 text-xs w-40" />
                      <Button size="sm" className="h-7 text-xs" type="submit">Advance: {b.status==="ACCEPTED"?"Start production": b.status==="IN_PRODUCTION"?"Mark READY": b.status==="READY"?"Mark COMPLETED":"—"}</Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
