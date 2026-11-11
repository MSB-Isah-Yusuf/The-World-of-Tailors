import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function TailorCustomersPage() {
  const session = await requireRole(["TAILOR"]);
  const profile = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) return <DashboardShell role="TAILOR" title="Tailor Business" nav={[{href:"#"} as any]}><div>No profile</div></DashboardShell>;
  let rows:any[]=[];
  try {
    // Customers are derived from bookings — least-privilege: only those who booked you
    const bookings = await prisma.tailoringBooking.findMany({ where: { tailorId: profile.id }, select: { customerId:true, customer:{select:{id:true,name:true,email:true,phone:true}}, status:true, createdAt:true } });
    const map = new Map<string, any>();
    for (const b of bookings) {
      const c = b.customer;
      if (!map.has(c.id)) map.set(c.id, { ...c, bookings:0, lastActive: b.createdAt, statuses:new Set<string>() });
      const m = map.get(c.id);
      m.bookings++; m.statuses.add(b.status);
      if (b.createdAt > m.lastActive) m.lastActive=b.createdAt;
    }
    rows = Array.from(map.values()).sort((a,b)=>b.bookings-a.bookings);
  } catch { rows=[]; }
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
        <div><h1 className="font-display text-2xl">Customers — {profile.businessName}</h1><p className="text-sm text-muted-foreground">Only customers who have booked you (ownership-scoped via <code>customerId → TailoringBooking.tailorId</code>). No platform-wide list.</p></div>
        <Card>
          <CardHeader><CardTitle className="text-base">{rows.length} customers • Authorized via bookings only</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {rows.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No customers yet — share <Link href={`/tailors/${profile.slug}`} className="underline">/tailors/{profile.slug}</Link> to get your first REQUESTED booking.</div> :
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b"><tr><th className="text-left py-2 px-2">Customer</th><th className="text-left py-2">Bookings</th><th className="text-left py-2">States</th><th className="text-left py-2">Last active</th><th className="text-right py-2">Profile</th></tr></thead>
                  <tbody>{rows.map(r=><tr key={r.id} className="border-b"><td className="py-3 px-2"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.email} • {r.phone||"—"}</div></td><td className="py-3">{r.bookings}</td><td className="py-3 text-xs">{Array.from(r.statuses as Set<string>).join(", ")}</td><td className="py-3 text-xs">{new Date(r.lastActive).toLocaleDateString()}</td><td className="py-3 text-right"><Link href={`/dashboard/tailor/bookings?q=${r.email}`} className="underline text-plum text-xs">View bookings →</Link></td></tr>)}</tbody>
                </table>
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
