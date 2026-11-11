import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";

// Canonical state machine — same as schema + master prompt
const allowedTransitions: Record<string,string[]> = {
  REQUESTED: ["ACCEPTED","DECLINED","CANCELLED"],
  ACCEPTED: ["IN_PRODUCTION","CANCELLED","ON_HOLD"],
  IN_PRODUCTION: ["READY","ON_HOLD","CANCELLED"],
  READY: ["COMPLETED","ON_HOLD"],
  ON_HOLD: ["IN_PRODUCTION","ACCEPTED","CANCELLED"],
  DECLINED: [],
  CANCELLED: [],
  COMPLETED: [],
};

async function transitionBooking(formData: FormData) {
  "use server";
  const session = await requireRole(["TAILOR"]);
  const bookingId = String(formData.get("bookingId")||"");
  const toStatus = String(formData.get("toStatus")||"").toUpperCase();
  const message = String(formData.get("message")||"").trim() || undefined;
  const userId = (session.user as any).id;
  const profile = await prisma.tailorProfile.findUnique({ where: { userId } });
  if (!profile || !bookingId || !toStatus) redirect("/dashboard/tailor/bookings?error=Missing");
  const booking = await prisma.tailoringBooking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.tailorId !== profile.id) throw new Error("FORBIDDEN: not owner booking");
  const from = booking.status;
  const allowed = allowedTransitions[from] || [];
  if (!allowed.includes(toStatus)) {
    redirect('/dashboard/tailor/bookings?error=InvalidTransition&from='+from+'&to='+toStatus);
  }
  // Special: ACCEPTED requires estimatedCompletion
  let estimatedCompletion: Date | undefined = booking.estimatedCompletion || undefined;
  if (from==="REQUESTED" && toStatus==="ACCEPTED") {
    const days = Number(formData.get("estDays")||7);
    estimatedCompletion = new Date(Date.now() + days*86400000);
  }
  await prisma.tailoringBooking.update({ where: { id: bookingId }, data: { status: toStatus as any, estimatedCompletion } });
  await prisma.bookingStatusHistory.create({ data: { bookingId, fromStatus: from, toStatus, changedBy: userId, message } });
  await prisma.auditLog.create({ data: { userId, action: "BOOKING_"+from+"_TO_"+toStatus, entity: "TailoringBooking", entityId: bookingId, metadata: { reference: booking.reference, from, to: toStatus } } });
  // Notify customer
  try { await prisma.notification.create({ data: { userId: booking.customerId, title: `Booking ${toStatus.toLowerCase()}`, message: `${booking.reference} is now ${toStatus}${message?": "+message:""}`, type: "booking", link: "/dashboard/customer/bookings" } }); } catch {}
  revalidatePath("/dashboard/tailor/bookings");
}

export default async function TailorBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string; error?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const session = await requireRole(["TAILOR"]);
  const profile = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) return <DashboardShell role="TAILOR" title="Tailor Business" nav={[{href:"#",label:"Overview"}]}><Card><CardContent className="p-6 text-sm">No tailor profile — <Link href="/dashboard/tailor/profile" className="underline">create profile</Link></CardContent></Card></DashboardShell>;

  const status = (sp?.status||"all").toUpperCase();
  const q = sp?.q?.toLowerCase().trim()||"";
  const page = Math.max(1, parseInt(sp?.page||"1",10)||1);
  const pageSize = 12;

  const where: any = { tailorId: profile.id };
  if (status!=="ALL" && ["REQUESTED","ACCEPTED","IN_PRODUCTION","READY","COMPLETED","DECLINED","CANCELLED","ON_HOLD"].includes(status)) where.status = status;
  if (q) where.OR = [{ reference: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];

  let bookings:any[]=[], total=0, stats:any={};
  try {
    [total, stats] = await Promise.all([
      prisma.tailoringBooking.count({ where }),
      (async()=>{
        const groups = await prisma.tailoringBooking.groupBy({ by: ["status"], where: { tailorId: profile.id }, _count: true });
        const m:any={}; groups.forEach(g=>m[g.status]=g._count); return m;
      })()
    ]);
    bookings = await prisma.tailoringBooking.findMany({
      where,
      include: { customer: { select: { name: true, email: true } }, design: { select: { title: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page-1)*pageSize, take: pageSize,
    });
  } catch { bookings=[]; }

  const variant:Record<string,any> = { REQUESTED:"warning", ACCEPTED:"secondary", IN_PRODUCTION:"plum", READY:"gold", COMPLETED:"success", DECLINED:"muted", CANCELLED:"muted", ON_HOLD:"burgundy" };

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
          <h1 className="font-display text-2xl">Bookings — {profile.businessName}</h1>
          <p className="text-sm text-muted-foreground">Status state-machine validated server-side • Every change records <code>BookingStatusHistory</code> + <code>AuditLog</code> • Only owner tailor can mutate.</p>
        </div>

        {sp?.error==="InvalidTransition" && (
          <div className="rounded-xl border border-burgundy/20 bg-burgundy/10 px-3 py-3 text-sm text-burgundy">
            <div className="font-semibold">Invalid transition</div>
            <div className="text-xs">{sp.from} → {sp.to} is not allowed. Allowed: {(allowedTransitions[sp.from||""]||[]).join(", ")||"none (terminal state)"}. Correct flow: REQUESTED → ACCEPTED → IN_PRODUCTION → READY → COMPLETED (plus DECLINED/CANCELLED/ON_HOLD).</div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          {["ALL","REQUESTED","ACCEPTED","IN_PRODUCTION","READY","COMPLETED","ON_HOLD","DECLINED","CANCELLED"].map(s=>(
            <Link key={s} href={`/dashboard/tailor/bookings${s==="ALL"?"":"?status="+s}`} className={`px-3 py-1.5 rounded-full border ${status===s?"bg-midnight text-white":"bg-white"}`}>{s} {stats[s]?`(${stats[s]})`:""}</Link>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Your bookings — {total} total • Ownership-scoped (tailorId = {profile.id.slice(0,8)}…)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {bookings.length===0 ? (
              <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">
                No bookings for filter <code>{status}</code>. Create designs at <Link href="/dashboard/tailor/designs" className="underline">Design Portfolio</Link> and share <Link href={`/tailors/${profile.slug}`} className="underline">/tailors/{profile.slug}</Link> to receive REQUESTED bookings.
                <div className="mt-2 text-xs">Demo: log in as <code>customer@demo.twt.ng / DemoPass123!</code> → book at /tailors → tailor sees it here.</div>
              </div>
            ) : bookings.map((b:any)=>(
              <div key={b.id} className="rounded-xl border bg-white p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="text-sm">
                    <span className="font-semibold">{b.reference}</span> • {b.customer.name} ({b.customer.email}) • {b.design?.title || "Bespoke (no design)"}
                    <div className="text-xs text-muted-foreground">{b.description?.slice(0,140) || "—"} • Est: {b.estimatedCompletion ? new Date(b.estimatedCompletion).toLocaleDateString() : "TBD"} • Snapshot: {b.measurementSnapshot ? JSON.stringify(b.measurementSnapshot).slice(0,90)+"…" : "no snapshot"}</div>
                  </div>
                  <Badge variant={variant[b.status]||"secondary"}>{b.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {(allowedTransitions[b.status]||[]).map((to:string)=>(
                    <form key={to} action={transitionBooking} className="flex gap-1 items-center">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="toStatus" value={to} />
                      {b.status==="REQUESTED" && to==="ACCEPTED" && <span className="flex items-center gap-1"><span>Est days:</span><input name="estDays" type="number" defaultValue={7} className="w-12 h-7 rounded border px-1" /></span>}
                      <input name="message" placeholder={to==="DECLINED"?"Reason…": to==="ACCEPTED"?"Accept note…":"Note…"} className="h-7 rounded border px-2 w-28" />
                      <Button size="sm" type="submit" variant={to==="DECLINED"||to==="CANCELLED"?"outline":"default"} className="h-7 text-xs">{to}</Button>
                    </form>
                  ))}
                  {allowedTransitions[b.status]?.length===0 && <span className="text-xs text-muted-foreground">Terminal state — no further transitions. See history in DB: BookingStatusHistory + AuditLog.</span>}
                  <Link href={`/api/v1/bookings/${b.id}`} className="ml-auto text-xs underline text-plum self-center">API</Link>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-xs pt-2">
              <span className="text-muted-foreground">All mutations check <code>booking.tailorId === profile.id</code> and validate {`{from→to}` } against allow-list; history immutable.</span>
              <span className="flex gap-2">{page>1 && <Link href={`/dashboard/tailor/bookings?status=${status}&page=${page-1}`} className="px-3 py-1 rounded-full border bg-white">← Prev</Link>}{bookings.length===pageSize && <Link href={`/dashboard/tailor/bookings?status=${status}&page=${page+1}`} className="px-3 py-1 rounded-full border bg-white">Next →</Link>}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
