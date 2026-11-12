import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function toggleAvailability(formData: FormData) {
  "use server";
  const session = await requireRole(["TAILOR"]);
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) return;
  const current = profile.isPublished;
  await prisma.tailorProfile.update({ where: { id: profile.id }, data: { isPublished: !current } });
  await prisma.auditLog.create({ data: { userId: (session.user as any).id, action: current ? "TAILOR_CLOSE_AVAILABILITY" : "TAILOR_OPEN_AVAILABILITY", entity: "TailorProfile", entityId: profile.id } });
  revalidatePath("/dashboard/tailor/calendar");
}

export default async function CalendarPage() {
  await requireRole(["TAILOR"]);
  const session = await (await import("@/lib/auth")).auth();
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId: (session as any).user.id } });
  const now = new Date();
  let upcoming: any[] = [];
  let overdue: any[] = [];
  try {
    upcoming = await prisma.tailoringBooking.findMany({ where: { tailorId: profile!.id, estimatedCompletion: { gte: now }, status: { in: ["ACCEPTED", "IN_PRODUCTION", "READY"] as any } }, orderBy: { estimatedCompletion: "asc" }, take: 10 });
    overdue = await prisma.tailoringBooking.findMany({ where: { tailorId: profile!.id, estimatedCompletion: { lt: now }, status: { in: ["ACCEPTED", "IN_PRODUCTION"] as any } }, take: 10 });
  } catch { upcoming = []; }
  return (
    <AdvancedTailorShell title="Calendar & Availability">
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between gap-2"><div><h1 className="font-display text-2xl">Calendar & Availability</h1><p className="text-sm text-muted-foreground">Deadlines • Blocked dates • Working hours — availability gates public ranking</p></div><form action={toggleAvailability}><Button size="sm" variant={profile?.isPublished ? "default" : "outline"} className="h-8 text-xs">{profile?.isPublished ? "Open for bookings ✓" : "Closed — not searchable"}</Button></form></div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Upcoming deadlines (10)</CardTitle></CardHeader><CardContent className="space-y-2">{upcoming.length===0?<div className="text-sm text-muted-foreground rounded-xl border bg-white p-4">No upcoming deadlines — est. completion set on ACCEPTED creates entry here.</div>: upcoming.map((b:any)=><div key={b.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><span>{b.reference} • {b.status}</span><span>{b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString():"TBD"}</span></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Overdue • {overdue.length}</CardTitle></CardHeader><CardContent className="space-y-2">{overdue.length===0?<div className="text-sm text-muted-foreground rounded-xl border bg-white p-4">No overdue — on track.</div>: overdue.map((b:any)=><div key={b.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm border-burgundy/20"><span>{b.reference}</span><span className="text-burgundy">{b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString():"—"}</span></div>)}</CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-sm">Availability</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground space-y-2"><div>Current: {profile?.isPublished ? "Published — searchable on /tailors" : "Unpublished — hidden"} • Business status {profile?.businessStatus}</div><div>Toggle closes storefront immediately (isPublished=false removes from public search). Working hours + blocked dates UI next iteration; overlap guard will check TailoringBooking.estimatedCompletion.</div></CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
