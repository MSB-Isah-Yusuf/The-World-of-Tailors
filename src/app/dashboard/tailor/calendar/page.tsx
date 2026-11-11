import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
export default async function CalendarPage(){
  await requireRole(["TAILOR"]);
  const now=new Date(); const upcoming = await prisma.tailoringBooking.findMany({ where:{ estimatedCompletion:{ gte: now }, status:{ in:["ACCEPTED","IN_PRODUCTION","READY"] } }, orderBy:{ estimatedCompletion:"asc"}, take:10 }).catch(()=>[]);
  return <AdvancedTailorShell title="Calendar & Availability"><div className="space-y-6"><h1 className="font-display text-2xl">Calendar & Availability</h1><p className="text-sm text-muted-foreground">Upcoming deadlines • Availability respected in recommendations</p><Card><CardHeader><CardTitle className="text-base">Upcoming deadlines</CardTitle></CardHeader><CardContent className="space-y-2">{upcoming.length===0?<div className="text-sm text-muted-foreground rounded-xl border bg-white p-4">No upcoming deadlines — deadlines derive from estimatedCompletion set on ACCEPTED.</div>: upcoming.map((b:any)=><div key={b.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><span>{b.reference} • {b.status}</span><span>{b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString():"TBD"}</span></div>)}</CardContent></Card><Card><CardContent className="text-xs text-muted-foreground p-4">Availability toggle (open/closed for new bookings) will gate public search ranking — implemented next iteration. Current status derived from businessStatus + isPublished.</CardContent></Card></div></AdvancedTailorShell>;
}
