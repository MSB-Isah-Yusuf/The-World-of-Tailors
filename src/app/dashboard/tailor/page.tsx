import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TailorDashboard() {
  return (
    <DashboardShell role="TAILOR" title="Tailor Business" nav={[
      { href: "/dashboard/tailor", label: "Overview" },
      { href: "/dashboard/tailor/customers", label: "Customers" },
      { href: "/dashboard/tailor/bookings", label: "Bookings" },
      { href: "/dashboard/tailor/production", label: "Production Tracking" },
      { href: "/dashboard/tailor/designs", label: "Design Portfolio" },
      { href: "/dashboard/tailor/profile", label: "Profile & Settings" },
    ]}>
      <div className="space-y-6">
        <h1 className="font-display text-2xl">Tailor Overview — Ade Bespoke</h1>
        <p className="text-sm text-muted-foreground">All stats are ownership-scoped: only your bookings, customers & designs.</p>
        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Total Customers</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">87</div><div className="text-xs text-muted-foreground">Authorized relationships only</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">New Requests</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">5</div><Badge variant="secondary">Action needed</Badge></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">In Production</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">12</div><div className="text-xs text-muted-foreground">3 overdue</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Completed</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">142</div><div className="text-xs text-muted-foreground">This year</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-base">Recent bookings — status transitions validated server-side</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="border rounded-xl p-3 bg-white space-y-2">
              <div className="flex justify-between"><span className="font-medium">#SC-2024-1245 • Chidi O. • Agbada Heritage</span><Badge>REQUESTED</Badge></div>
              <div className="text-xs text-muted-foreground">Chest 42", Waist 36", Shoulder 18" • "Add hidden pocket, gold embroidery" • Booking date: 19 Oct</div>
              <div className="flex gap-2"><Button size="sm">Accept & Set Est. Date</Button><Button size="sm" variant="outline">Decline</Button><span className="text-xs text-muted-foreground self-center">Acceptance records status history; only owner can act</span></div>
            </div>
            <div className="border rounded-xl p-3 bg-white flex justify-between"><span>#SC-2024-1244 • Amaka • Accepted — In Production</span><Badge variant="success">IN_PRODUCTION</Badge></div>
            <Link href="/dashboard/tailor/bookings" className="inline-block"><Button size="sm" variant="outline">Manage all bookings</Button></Link>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Measurement Management — snapshots per booking</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Measurements are associated to customer + authorized booking. Reusable profiles allowed; historical snapshots preserved so profile edits don't alter old jobs. Units stored explicitly (cm/in). Seller role has no access — enforced at DB query level.</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Design Portfolio Management</CardTitle></CardHeader><CardContent className="text-sm"><div>Upload → preview → edit → publish/unpublish → delete. Object storage + metadata in PostgreSQL. Validation: file signature, size, dimensions. Thumbnails & optimized variants generated. Ownership checks on every operation.</div><Link href="/dashboard/tailor/designs"><Button size="sm" className="mt-3">Manage Designs</Button></Link></CardContent></Card>
      </div>
    </DashboardShell>
  );
}
