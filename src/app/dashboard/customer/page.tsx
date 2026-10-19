import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function CustomerDashboard() {
  const session = await auth();
  return (
    <DashboardShell role="CUSTOMER" title="Customer" nav={[
      { href: "/dashboard/customer", label: "Overview" },
      { href: "/dashboard/customer/bookings", label: "My Bookings" },
      { href: "/dashboard/customer/measurements", label: "Measurements" },
      { href: "/dashboard/customer/orders", label: "Fabric Orders" },
      { href: "/dashboard/customer/addresses", label: "Addresses" },
      { href: "/dashboard/customer/favorites", label: "Favorites" },
      { href: "/dashboard/customer/reviews", label: "Reviews" },
    ]}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl">Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}</h1>
          <p className="text-sm text-muted-foreground">Track bookings • manage measurements • purchase fabrics • choose tailor delivery destination</p>
        </div>
        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Active Bookings</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">3</div><div className="text-xs text-muted-foreground">2 in production, 1 requested</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Fabric Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">2</div><div className="text-xs text-muted-foreground">1 in transit to tailor</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Measurement Profiles</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">2</div><div className="text-xs text-muted-foreground">Stored securely, never exposed in URLs</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Favorites</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">7</div><div className="text-xs text-muted-foreground">Designs & fabrics saved</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-base">Your bookings — status: REQUESTED → ACCEPTED → IN_PRODUCTION → READY → COMPLETED</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between border rounded-xl px-3 py-2 bg-white"><span>#SC-2024-1245 • Agbada Heritage • Ade Bespoke</span><span className="text-amber-700 font-medium">IN_PRODUCTION</span></div>
            <div className="flex justify-between border rounded-xl px-3 py-2 bg-white"><span>#SC-2024-1246 • Ankara Midi • Zara Stitches</span><span className="text-emerald-700">ACCEPTED — Est. 24 Oct</span></div>
            <Link href="/dashboard/customer/bookings"><Button size="sm" variant="outline">View all bookings</Button></Link>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">How to book</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">1. Browse <Link href="/designs" className="underline">Designs</Link> → 2. Open tailor portfolio → 3. Click Book & submit measurements (cm/in) → 4. Tailor accepts → 5. Buy fabric with delivery to tailor → 6. Track production.</CardContent></Card>
      </div>
    </DashboardShell>
  );
}
