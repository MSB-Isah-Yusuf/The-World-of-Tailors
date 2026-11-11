import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export default async function CustomerDashboard() {
  const session = await requireRole(["CUSTOMER"]);
  const userId = (session.user as any).id;
  let stats={ bookings:0, orders:0, measurements:0, favorites:0 };
  let recentBookings:any[]=[];
  try {
    const [bookings, orders, measurements, favorites] = await Promise.all([
      prisma.tailoringBooking.count({ where:{ customerId: userId } }),
      prisma.fabricOrder.count({ where:{ customerId: userId } }),
      prisma.measurementProfile.count({ where:{ userId } }),
      prisma.favorite.count({ where:{ userId } }),
    ]);
    stats={ bookings, orders, measurements, favorites };
    recentBookings= await prisma.tailoringBooking.findMany({ where:{ customerId: userId }, include:{ tailor:{ select:{ businessName:true, slug:true } }, design:{ select:{ title:true } } }, orderBy:{ updatedAt:"desc" }, take:4 });
  } catch {}
  return (
    <AdvancedCustomerShell title="Overview">
      <div className="space-y-6">
        <div><h1 className="font-display text-2xl">Welcome back, {(session.user as any).name||"valued customer"}</h1><p className="text-sm text-muted-foreground">Track bookings • view measurements (read-only, tailor-owned) • purchase fabrics • choose tailor delivery destination</p></div>
        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Active Bookings</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.bookings}</div><div className="text-xs text-muted-foreground">Across all tailors</div><Link href="/dashboard/customer/bookings" className="text-xs underline text-plum">View →</Link></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Fabric Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.orders}</div><div className="text-xs text-muted-foreground">Including tailors delivery</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Measurement Profiles</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.measurements}</div><div className="text-xs text-muted-foreground">Your shared measurements (consent-based)</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Favorites</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.favorites}</div><div className="text-xs text-muted-foreground">Designs & fabrics saved</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-base">Your bookings — status: REQUESTED → ACCEPTED → IN_PRODUCTION → READY → COMPLETED</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentBookings.length===0 ? <div className="rounded-xl border bg-white p-6 text-center text-muted-foreground">No bookings yet — <Link href="/designs" className="underline">Browse designs</Link> to start</div>
            : recentBookings.map((b:any)=><div key={b.id} className="flex justify-between border rounded-xl px-3 py-2 bg-white"><span>{b.reference} • {b.design?.title||"Bespoke"} • {b.tailor.businessName}</span><span className={`font-medium ${b.status==="IN_PRODUCTION"?"text-amber-700": b.status==="ACCEPTED"?"text-emerald-700":"text-taupe"}`}>{b.status} {b.estimatedCompletion?`— Est. ${new Date(b.estimatedCompletion).toLocaleDateString()}`:""}</span></div>)}
            <Link href="/dashboard/customer/bookings"><Button size="sm" variant="outline">View all bookings</Button></Link>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Measurements — view only (tailor records)</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Tailors record your measurements with your consent via the interactive mannequin. You can view snapshots per booking at <Link href="/dashboard/customer/measurements" className="underline">Measurements →</Link> but cannot edit tailor-owned walk-in records. Your own profile measurements are stored securely and never exposed in URLs.</CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
