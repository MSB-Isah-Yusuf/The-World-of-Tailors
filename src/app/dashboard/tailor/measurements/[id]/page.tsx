import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { MeasurementSimpleForm } from "@/components/mannequin/MeasurementSimpleForm";
import { MeasurementDetailActions } from "@/components/mannequin/MeasurementDetailActions";
import Link from "next/link";

export default async function MeasurementDetailPage({ params, searchParams }: { params: Promise<{ id:string }>; searchParams: Promise<{ edit?:string }> }) {
  const { id } = await params;
  const session = await requireRole(["TAILOR"]);
  const profile = await prisma.tailorProfile.findUnique({ where:{ userId: (session.user as any).id } });
  if (!profile) return <AdvancedTailorShell title="Measurement"><div className="p-6">No profile</div></AdvancedTailorShell>;
  let mp:any=null;
  try {
    mp = await prisma.measurementProfile.findUnique({ where:{ id }, include:{ values:true, user:{select:{name:true,email:true}}, tailorCustomer:{select:{fullName:true,phone:true}} } });
  } catch {}
  if (!mp || (mp.tailorId !== profile.id && mp.userId !== (session.user as any).id)) {
    if (mp?.tailorCustomerId) {
      const tc = await prisma.tailorCustomer.findUnique({ where:{ id: mp.tailorCustomerId } });
      if (!tc || tc.tailorId !== profile.id) return <AdvancedTailorShell title="Measurement"><Card><CardContent className="p-6 text-sm">FORBIDDEN: not your measurement record.</CardContent></Card></AdvancedTailorShell>;
    } else return <AdvancedTailorShell title="Measurement"><Card><CardContent className="p-6 text-sm">Measurement not found.</CardContent></Card></AdvancedTailorShell>;
  }
  const displayName = mp.tailorCustomer?.fullName || mp.user?.name || mp.name;
  return (
    <AdvancedTailorShell title={`Measurements — ${displayName}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div><h1 className="font-display text-2xl">{displayName} • {mp.garmentType}</h1><p className="text-sm text-muted-foreground">{mp.bodyTemplate} • {mp.unit} • Status {mp.status} • Updated {new Date(mp.updatedAt).toLocaleString()}</p></div>
          <div className="flex gap-2 text-xs"><Link href="/dashboard/tailor/measurements"><Button variant="outline" size="sm">← Back</Button></Link><span className="px-3 py-1 rounded-full bg-champagne border text-xs">{mp.values.length} values recorded</span></div>
        </div>
        <MeasurementSimpleForm profile={mp} />
        <Card><CardHeader><CardTitle className="text-sm">History & actions</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">
          <div>History preserved via MeasurementHistory + booking snapshot (bookingId: {mp.bookingId||"—"}). Print & export permitted.</div>
          <MeasurementDetailActions id={mp.id} />
        </CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
