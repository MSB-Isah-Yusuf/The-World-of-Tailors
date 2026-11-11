import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export default async function SellerDashboard() {
  const session = await requireRole(["FABRIC_SELLER"]);
  const profile = await prisma.sellerProfile.findUnique({ where:{ userId: (session.user as any).id } });
  if (!profile) return <AdvancedSellerShell title="Overview"><Card><CardContent className="p-6 text-sm">No seller profile — <Link href="/register/seller" className="underline">create one</Link></CardContent></Card></AdvancedSellerShell>;

  let stats={ products:0, published:0, lowStock:0, pending:0, inTransit:0 };
  let recentOrders:any[]=[];
  try {
    const [products, published, lowStock, pending, inTransit] = await Promise.all([
      prisma.fabricProduct.count({ where:{ sellerId: profile.id } }),
      prisma.fabricProduct.count({ where:{ sellerId: profile.id, isPublished:true } }),
      prisma.fabricProduct.count({ where:{ sellerId: profile.id, stock:{ lt:5 } } }),
      prisma.fabricOrder.count({ where:{ sellerId: profile.id, status:"PENDING" } }),
      prisma.fabricOrder.count({ where:{ sellerId: profile.id, status:"IN_TRANSIT" } }),
    ]);
    stats={ products, published, lowStock, pending, inTransit };
    recentOrders = await prisma.fabricOrder.findMany({ where:{ sellerId: profile.id }, include:{ customer:{select:{name:true}} }, orderBy:{ updatedAt:"desc" }, take:4 });
  } catch {}

  return (
    <AdvancedSellerShell title="Overview">
      <div className="space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Seller Overview — {profile.businessName}</h1><p className="text-sm text-muted-foreground">No measurement access — strictly ownership-scoped • Verified: <Badge variant={profile.businessStatus==="APPROVED"?"success":"warning"}>{profile.businessStatus}</Badge> {profile.isPublished?<Badge variant="gold" className="ml-2">Published</Badge>:<Badge variant="secondary" className="ml-2">Hidden</Badge>} • <Link href={`/sellers/${profile.slug}`} className="text-xs underline ml-2">View /sellers/{profile.slug} →</Link></p></div><Link href="/dashboard/seller/profile"><Button size="sm" variant="outline">Edit profile</Button></Link></div>
        <div className="grid md:grid-cols-4 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Total Products</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.products}</div><div className="text-xs text-muted-foreground">{stats.published} published</div><Link href="/dashboard/seller/products" className="text-xs underline text-plum">Manage →</Link></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Low Stock</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.lowStock}</div><Badge variant={stats.lowStock>0?"warning":"secondary"} className="mt-1">{stats.lowStock>0?"Re-stock":"All good"}</Badge></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">New Orders</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.pending}</div><div className="text-xs text-muted-foreground">Awaiting confirmation</div><Link href="/dashboard/seller/orders" className="text-xs underline text-plum">View →</Link></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">In Transit</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stats.inTransit}</div><div className="text-xs text-muted-foreground">To customers & tailors</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-base">Order workflow — PENDING → CONFIRMED → PREPARING → READY_FOR_DISPATCH → IN_TRANSIT → DELIVERED</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentOrders.length===0 ? <div className="rounded-xl border bg-white p-6 text-center text-muted-foreground">No orders yet — list products at <Link href="/dashboard/seller/products" className="underline">Products</Link> to receive PENDING orders.</div>
            : recentOrders.map((o:any)=><div key={o.id} className="border rounded-xl p-3 bg-white flex justify-between"><span>{o.reference} • {o.customer.name} • {o.deliveryType==="TO_TAILOR" ? `Deliver to tailor ${o.tailorDestinationId?.slice(0,6)||"—"}`: "To customer"} • ₦{Number(o.total).toLocaleString()}</span><Badge variant={o.status==="PENDING"?"warning":"success"}>{o.status}</Badge></div>)}
            <div className="text-xs text-muted-foreground">State transitions validated server-side. Inventory reserved via transactions to prevent overselling.</div>
            <Link href="/dashboard/seller/orders"><Button size="sm" variant="outline">Manage orders</Button></Link>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Inventory — atomic updates + movement history</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Stock quantities require inventory movement records. Reserved vs available tracked. No direct stock edits without audit. See <Link href="/dashboard/seller/inventory" className="underline">Inventory →</Link></CardContent></Card>
      </div>
    </AdvancedSellerShell>
  );
}
