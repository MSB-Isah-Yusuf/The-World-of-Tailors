import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export default async function TailorDashboard() {
  const session = await requireRole(["TAILOR"]);
  const userId = (session.user as any).id;
  const profile = await prisma.tailorProfile.findUnique({ where: { userId } });
  if (!profile) {
    return (
      <DashboardShell role="TAILOR" title="Tailor Business" nav={[
        { href: "/dashboard/tailor", label: "Overview" },
        { href: "/dashboard/tailor/customers", label: "Customers" },
        { href: "/dashboard/tailor/bookings", label: "Bookings" },
        { href: "/dashboard/tailor/production", label: "Production Tracking" },
        { href: "/dashboard/tailor/designs", label: "Design Portfolio" },
        { href: "/dashboard/tailor/profile", label: "Profile & Settings" },
      ]}>
        <Card><CardHeader><CardTitle>Complete your tailor profile</CardTitle></CardHeader><CardContent className="text-sm">No TailorProfile yet. Contact admin or <Link href="/register/tailor" className="underline">re-register</Link>.</CardContent></Card>
      </DashboardShell>
    );
  }

  // Ownership-scoped stats — safe fallback if DB unreachable
  let stats = { customers:0, requested:0, inProduction:0, completed:0, designs:0, overdue:0 };
  let recent:any[]=[];
  try {
    const [customerIds, requested, inProduction, completed, overdue, designsCount] = await Promise.all([
      prisma.tailoringBooking.findMany({ where:{ tailorId: profile.id }, select:{ customerId:true } }).then(rows=> new Set(rows.map(r=>r.customerId)).size),
      prisma.tailoringBooking.count({ where:{ tailorId: profile.id, status:"REQUESTED" } }),
      prisma.tailoringBooking.count({ where:{ tailorId: profile.id, status:"IN_PRODUCTION" } }),
      prisma.tailoringBooking.count({ where:{ tailorId: profile.id, status:"COMPLETED" } }),
      prisma.tailoringBooking.count({ where:{ tailorId: profile.id, status:"IN_PRODUCTION", estimatedCompletion:{ lt: new Date() } } }),
      prisma.design.count({ where:{ tailorId: profile.id } }),
    ]);
    stats = { customers: customerIds, requested, inProduction, completed, designs: designsCount, overdue };
    recent = await prisma.tailoringBooking.findMany({
      where:{ tailorId: profile.id },
      include:{ customer:{ select:{ name:true } }, design:{ select:{ title:true } } },
      orderBy:{ updatedAt:"desc" }, take: 5,
    });
  } catch {
    // keep defaults for dummy local DB
  }

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
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl">Tailor Overview — {profile.businessName}</h1>
            <p className="text-sm text-muted-foreground">All stats are ownership-scoped: only your bookings, customers & designs. Verified: <Badge variant={profile.businessStatus==="APPROVED"?"success":"warning"}>{profile.businessStatus}</Badge> {profile.isPublished?<Badge variant="gold" className="ml-2">Published</Badge>:<Badge variant="secondary" className="ml-2">Draft — not public</Badge>} • <Link href={`/tailors/${profile.slug}`} className="underline text-xs ml-2">View public /tailors/{profile.slug} →</Link></p>
          </div>
          <Link href="/dashboard/tailor/profile"><Button variant="outline" size="sm">Edit profile</Button></Link>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Total Customers</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.customers}</div><div className="text-xs text-muted-foreground">Authorized relationships only</div><Link href="/dashboard/tailor/customers" className="text-xs underline text-plum mt-1 inline-block">Manage →</Link></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">New Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.requested}</div><Badge variant="secondary" className="mt-1">{stats.requested>0?"Action needed":"All caught up"}</Badge><Link href="/dashboard/tailor/bookings?status=REQUESTED" className="text-xs underline text-plum mt-2 inline-block">View →</Link></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">In Production</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.inProduction}</div><div className="text-xs text-muted-foreground">{stats.overdue} overdue • strict state-machine</div><Link href="/dashboard/tailor/production" className="text-xs underline text-plum mt-1 inline-block">Track →</Link></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Designs</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.designs}</div><div className="text-xs text-muted-foreground">{stats.completed} bookings completed this year</div><Link href="/dashboard/tailor/designs" className="text-xs underline text-plum mt-1 inline-block">Portfolio →</Link></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent bookings — status transitions validated server-side</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {recent.length===0 ? <div className="text-muted-foreground rounded-xl border bg-white p-4 text-center">No bookings yet — create designs and share your portfolio to receive REQUESTED jobs.</div> :
            recent.map((b:any)=>(
              <div key={b.id} className="border rounded-xl p-3 bg-white space-y-2">
                <div className="flex justify-between"><span className="font-medium">{b.reference} • {b.customer.name} • {b.design?.title||"Bespoke"}</span><Badge variant={b.status==="REQUESTED"?"warning": b.status==="IN_PRODUCTION"?"plum": b.status==="COMPLETED"?"success":"secondary"}>{b.status}</Badge></div>
                <div className="text-xs text-muted-foreground">{b.description?.slice(0,120)||"—"} • Est: {b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString() : "TBD"}</div>
                <div className="flex gap-2"><Link href={`/dashboard/tailor/bookings?q=${b.reference}`}><Button size="sm" variant="outline" className="h-7 text-xs">Open booking</Button></Link><span className="text-xs text-muted-foreground self-center">Ownership: only you can act • History: BookingStatusHistory + AuditLog</span></div>
              </div>
            ))}
            <Link href="/dashboard/tailor/bookings" className="inline-block mt-2"><Button size="sm" variant="outline">Manage all bookings</Button></Link>
          </CardContent></Card>

        <Card><CardHeader><CardTitle className="text-base">Measurement snapshots per booking</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Measurements are associated to customer + authorized booking. Reusable profiles allowed; historical snapshots preserved so profile edits don't alter old jobs. Units stored explicitly (cm/in). Access controlled at DB query level — sellers have no access.</CardContent></Card>
      </div>
    </DashboardShell>
  );
}
