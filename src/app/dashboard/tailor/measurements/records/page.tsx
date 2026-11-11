import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
export default async function RecordsPage(){
  await requireRole(["TAILOR"]);
  const profile= await prisma.tailorProfile.findUnique({ where:{ userId: (await (await import("@/lib/auth")).auth() as any).user.id } });
  let histories:any[]=[]; try { const profiles= await prisma.measurementProfile.findMany({ where:{ tailorId: profile!.id }, select:{ id:true, name:true } }); const ids= profiles.map(p=>p.id); histories= await prisma.measurementHistory.findMany({ where:{ profileId: { in: ids } }, orderBy:{ createdAt:"desc" }, take:20 }); } catch{}
  return <AdvancedTailorShell title="Measurement Records"><div className="space-y-6"><h1 className="font-display text-2xl">Measurement Records • History</h1><p className="text-sm text-muted-foreground">Immutable audit • Before→after JSON • Who changed, when</p><Card><CardHeader><CardTitle className="text-base">{histories.length} recent changes</CardTitle></CardHeader><CardContent className="space-y-2">{histories.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No history yet — every mannequin save creates a MeasurementHistory + AuditLog entry. Try editing a walk-in profile.</div> : histories.map((h:any)=><div key={h.id} className="border rounded-xl p-3 bg-white text-xs"><div className="font-medium">{h.profileId.slice(0,8)} • {new Date(h.createdAt).toLocaleString()}</div><div className="text-muted-foreground truncate">From {JSON.stringify(h.fromJson||{}).slice(0,80)} → To {JSON.stringify(h.toJson||{}).slice(0,80)}</div><div>{h.note||""}</div></div>)}</CardContent></Card></div></AdvancedTailorShell>;
}
