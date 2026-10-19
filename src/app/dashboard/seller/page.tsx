import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SellerDashboard() {
  return (
    <DashboardShell role="FABRIC_SELLER" title="Fabric Business" nav={[
      { href: "/dashboard/seller", label: "Overview" },
      { href: "/dashboard/seller/products", label: "Products" },
      { href: "/dashboard/seller/inventory", label: "Inventory" },
      { href: "/dashboard/seller/customers", label: "Customers" },
      { href: "/dashboard/seller/orders", label: "Orders" },
      { href: "/dashboard/seller/profile", label: "Portfolio & Profile" },
    ]}>
      <div className="space-y-6">
        <h1 className="font-display text-2xl">Seller Overview — Lagos Fabrics Hub</h1>
        <p className="text-sm text-muted-foreground">No garment measurement access — strictly enforced. All products & orders are ownership-scoped.</p>
        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Total Products</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">34</div><div className="text-xs text-muted-foreground">28 published</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Low Stock</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">3</div><Badge variant="secondary">Alert</Badge></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">New Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">6</div><div className="text-xs text-muted-foreground">Awaiting confirmation</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">In Transit</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">9</div><div className="text-xs text-muted-foreground">To customers & tailors</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-base">Order workflow — PENDING → CONFIRMED → PREPARING → READY_FOR_DISPATCH → IN_TRANSIT → DELIVERED</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="border rounded-xl p-3 bg-white flex justify-between"><span>#FO-2024-089 • Ankara Gold Burst • 4 metres • Deliver to tailor: Ade Bespoke</span><Badge>PENDING</Badge></div>
            <div className="border rounded-xl p-3 bg-white flex justify-between"><span>#FO-2024-088 • Swiss Lace • 3 metres • To customer: 12 Allen Ave</span><Badge variant="success">CONFIRMED</Badge></div>
            <div className="text-xs text-muted-foreground">State transitions validated server-side. Inventory reserved via transactions to prevent overselling.</div>
            <Link href="/dashboard/seller/orders"><Button size="sm" variant="outline">Manage orders</Button></Link>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Inventory — atomic updates + movement history</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Stock quantities require inventory movement records. Reserved vs available-to-sell tracked. No direct stock edits without audit.</CardContent></Card>
      </div>
    </DashboardShell>
  );
}
