import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function MeasurementsDashboard({ searchParams }: { searchParams: Promise<{ q?:string; type?:string; garment?:string; gender?:string }> }) {
  const sp = await searchParams;
  const session = await requireRole(["TAILOR"]);
  const profile = await prisma.tailorProfile.findUnique({ where:{ userId: (session.user as any).id } });
  if (!profile) return <AdvancedTailorShell title="Measurements"><div className="p-6 text-sm">No tailor profile.</div></AdvancedTailorShell>;

  const q = sp?.q?.toLowerCase()?.trim() || "";
  const type = sp?.type || "all"; // all | registered | walkin
  const garment = sp?.garment || "all";
  const gender = sp?.gender || "all";

  let profiles:any[]=[];
  try {
    const where:any={ tailorId: profile.id };
    if (type==="registered") where.userId = { not: null };
    if (type==="walkin") where.tailorCustomerId = { not: null };
    if (garment!=="all") where.garmentType = garment;
    if (gender!=="all") where.bodyTemplate = gender;
    // search handled in memory for joined names (phone/name)
    profiles = await prisma.measurementProfile.findMany({
      where,
      include:{ user:{select:{name:true, email:true, phone:true}}, tailorCustomer:{select:{fullName:true, phone:true}}, values:true },
      orderBy:{ updatedAt:"desc" }, take: 50
    });
    if (q) {
      profiles = profiles.filter(p=>{
        const name = p.tailorCustomer?.fullName || p.user?.name || p.name || "";
        return name.toLowerCase().includes(q) || (p.user?.email||"").toLowerCase().includes(q) || (p.tailorCustomer?.phone||"").toLowerCase().includes(q);
      });
    }
  } catch { profiles=[]; }

  return (
    <AdvancedTailorShell title="Customer Measurements">
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl">Customer Measurements</h1>
            <p className="text-sm text-muted-foreground">Registered + walk-in • Gender-aware mannequin • Garment-specific • Snapshot per booking • Private to you</p>
          </div>
          <Link href="/dashboard/tailor/measurements/new"><Button variant="default">+ Add Walk-in Customer</Button></Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form className="flex flex-wrap gap-2 items-end">
              <div><label className="text-xs text-taupe">Search customer</label><Input name="q" defaultValue={sp?.q||""} placeholder="Name, phone, email" className="h-9 w-48" /></div>
              <div><label className="text-xs text-taupe">Type</label>
                <select name="type" defaultValue={type} className="h-9 rounded-xl border bg-white px-3 text-sm"><option value="all">All</option><option value="registered">Registered</option><option value="walkin">Walk-in</option></select>
              </div>
              <div><label className="text-xs text-taupe">Garment</label>
                <select name="garment" defaultValue={garment} className="h-9 rounded-xl border bg-white px-3 text-sm"><option value="all">All garments</option><option value="NATIVE_WEAR">Native wear</option><option value="SHIRT">Shirt</option><option value="TROUSERS">Trousers</option><option value="SUIT">Suit</option><option value="GOWN">Gown</option><option value="DRESS">Dress</option><option value="AGBADA">Agbada</option><option value="KAFTAN">Kaftan</option></select>
              </div>
              <div><label className="text-xs text-taupe">Template</label>
                <select name="gender" defaultValue={gender} className="h-9 rounded-xl border bg-white px-3 text-sm"><option value="all">Male & Female</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
              </div>
              <Button type="submit" size="sm" variant="outline">Filter</Button>
              <div className="ml-auto text-xs text-muted-foreground">{profiles.length} records • Status: Not Recorded / In Progress / Completed / Awaiting Confirmation</div>
            </form>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.length===0 ? (
            <Card className="md:col-span-3"><CardContent className="p-8 text-center text-sm text-muted-foreground">
              <div className="font-semibold text-midnight">No measurement records</div>
              <div className="mt-1">Bookings automatically appear here after you have authorization. Or add a walk-in customer to start recording.</div>
              <div className="mt-3 flex justify-center gap-2"><Link href="/dashboard/tailor/measurements/new"><Button size="sm">+ Add Walk-in Customer</Button></Link><Link href="/dashboard/tailor/bookings" className="text-xs underline self-center">View booking requests →</Link></div>
            </CardContent></Card>
          ) : profiles.map(p=>{
            const isWalkIn = !!p.tailorCustomerId;
            const displayName = p.tailorCustomer?.fullName || p.user?.name || p.name;
            const phone = p.tailorCustomer?.phone || p.user?.phone || "—";
            return (
              <Card key={p.id} className="hover:shadow-card transition">
                <CardHeader><CardTitle className="text-sm flex justify-between"><span>{displayName}</span><span className={`text-[10px] px-2 py-1 rounded-full border ${isWalkIn?"bg-amber-50 border-amber-200 text-amber-800":"bg-emerald-50 border-emerald-200 text-emerald-800"}`}>{isWalkIn?"Walk-in":"Registered"} • {p.bodyTemplate}</span></CardTitle><p className="text-xs text-muted-foreground">{phone} • {p.garmentType} • {p.unit} • {new Date(p.updatedAt).toLocaleDateString()}</p></CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex gap-2"><span className="px-2 py-1 rounded-full bg-champagne text-midnight text-xs">{p.status}</span><span className="text-muted-foreground">{p.values.length} values • {p.bookingId?`Booking ${p.bookingId.slice(0,6)}`:"No booking link"}</span></div>
                  <div className="flex gap-2"><Link href={`/dashboard/tailor/measurements/${p.id}`} className="flex-1"><Button size="sm" className="w-full h-7 text-xs">View Measurements</Button></Link><Link href={`/dashboard/tailor/measurements/${p.id}?edit=1`} className="flex-1"><Button size="sm" variant="outline" className="w-full h-7 text-xs">Edit</Button></Link></div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground">Walk-in records are <strong>private to you</strong> (tailorId scoped, phone unique per tailor, never in public search). Registered customers are linked via booking authorization. Snapshots are frozen on booking so later edits don't alter old orders.</div>
      </div>
    </AdvancedTailorShell>
  );
}
