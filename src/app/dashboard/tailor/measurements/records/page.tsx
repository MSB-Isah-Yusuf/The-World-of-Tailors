import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function RecordsPage() {
  await requireRole(["TAILOR"]);
  const session = await (await import("@/lib/auth")).auth();
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId: (session as any).user.id } });
  if (!profile) return <AdvancedTailorShell title="Measurement Records"><div className="p-6">No profile</div></AdvancedTailorShell>;
  let histories: any[] = [];
  let profiles: any[] = [];
  try {
    profiles = await prisma.measurementProfile.findMany({ where: { tailorId: profile.id }, select: { id: true, name: true, tailorCustomer: { select: { fullName: true } }, user: { select: { name: true } }, garmentType: true, bodyTemplate: true }, take: 10 });
    const ids = profiles.map(p=>p.id);
    if (ids.length) histories = await prisma.measurementHistory.findMany({ where: { profileId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 20, include: { profile: { select: { name: true, garmentType: true } } } });
  } catch { histories = []; }
  return (
    <AdvancedTailorShell title="Measurement Records">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Measurement Records • History</h1><p className="text-sm text-muted-foreground">Immutable audit • Per-customer timeline • Before→after JSON • Snapshot linked to booking</p></div>
        <div className="grid md:grid-cols-3 gap-4 text-xs">
          <Card><CardHeader><CardTitle className="text-sm">Profiles</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{profiles.length}</div><div className="text-xs text-muted-foreground">Active measurement profiles</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Histories</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{histories.length}</div><div className="text-xs text-muted-foreground">Changes recorded</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Snapshots</CardTitle></CardHeader><CardContent><div className="text-xs text-muted-foreground">Booking measurementSnapshot frozen — profile edits don’t affect old jobs. Access private to you.</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-base">{histories.length} recent changes • Printable sheets per profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {histories.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No history yet — every mannequin save creates a MeasurementHistory + AuditLog. Try editing a walk-in profile at /dashboard/tailor/measurements.</div> :
            histories.map((h:any)=><div key={h.id} className="border rounded-xl p-3 bg-white text-xs">
              <div className="flex justify-between gap-2"><span className="font-medium">{h.profile?.name || h.profileId.slice(0,8)} • {h.profile?.garmentType}</span><span className="text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</span></div>
              <div className="font-mono text-[11px] mt-1">From {JSON.stringify(h.fromJson||{}).slice(0,100)} → To {JSON.stringify(h.toJson||{}).slice(0,100)}</div>
              <div className="text-muted-foreground mt-1">{h.note||""} <Link href={`/dashboard/tailor/measurements/${h.profileId}`} className="underline text-plum ml-2">Open profile →</Link></div>
            </div>)}
          </CardContent></Card>
        <Card><CardContent className="text-xs text-muted-foreground p-4">Privacy: seller has no access • History is immutable • Export JSON at /api/tailor/measurements/{'{id}'}/export • Duplicate at mannequin duplicate button.</CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
