import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
export default async function DeliveryPage(){
  await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(await (await import("@/lib/auth")).auth() as any).user.id } });
  return <AdvancedSellerShell title="Delivery Coverage"><div className="space-y-6"><h1 className="font-display text-2xl">Delivery Coverage — {profile?.businessName}</h1><Card><CardHeader><CardTitle className="text-base">Zones: {profile?.deliveryZones || "Lagos, Abuja, Ibadan"}</CardTitle></CardHeader><CardContent className="text-sm"><div>Methods: {profile?.deliveryMethods || "Dispatch Rider, Inter-state Bus"}</div><div className="text-xs text-muted-foreground mt-1">Coverage radius {profile?.deliveryCoverageKm||25}km • Pickup {profile?.pickupAvailable?"available":"unavailable"} • Edit in Location Settings or profile</div></CardContent></Card><Card><CardContent className="text-xs text-muted-foreground p-4">Coverage determines homepage ranking for Fabric Sellers Near You. Orders outside coverage are still allowed but flagged as out-of-zone.</CardContent></Card></div></AdvancedSellerShell>;
}
