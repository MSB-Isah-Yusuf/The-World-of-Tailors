import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function SellerVerificationPage() {
  await requireRole(["FABRIC_SELLER"]);
  const session = await (await import("@/lib/auth")).auth();
  const profile: any = await prisma.sellerProfile.findUnique({ where: { userId: (session as any).user.id } });
  if (!profile) return <AdvancedSellerShell title="Verification"><div className="p-6">No seller profile</div></AdvancedSellerShell>;
  const isApproved = profile.businessStatus === "APPROVED";
  return (
    <AdvancedSellerShell title="Verification">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Verification Status</h1><p className="text-sm text-muted-foreground">Seller verification • Admin approval required to publish products</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Current: <Badge variant={isApproved?"success":profile.businessStatus==="PENDING"?"warning":"burgundy"}>{profile.businessStatus}</Badge> {profile.isPublished ? <Badge variant="gold" className="ml-2">Published</Badge> : <Badge variant="secondary" className="ml-2">Unpublished</Badge>}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className={`flex-1 p-3 rounded-xl border text-center ${profile.businessStatus==="PENDING"||profile.businessStatus==="UNDER_REVIEW"?"bg-ivory":"bg-white border-muted"}`}><div className="text-xs">PENDING</div><div className="text-[11px] text-muted-foreground">Awaiting review</div></div>
              <div className={`flex-1 p-3 rounded-xl border text-center ${isApproved?"bg-emerald-50 border-emeraldDeep":"bg-white"}`}><div className="text-xs">APPROVED</div><div className="text-[11px] text-muted-foreground">Published</div></div>
            </div>
            <div className="text-xs text-muted-foreground">{profile.businessName} • {profile.city} • {profile.slug} • Applied {new Date(profile.createdAt).toLocaleDateString()} • Delivery {profile.deliveryMethods || "—"}</div>
            {isApproved ? <div className="text-xs">Your products are searchable on <Link href="/fabrics" className="underline text-plum">/fabrics</Link>. Keep stock accurate.</div> : <div className="text-xs text-amber-700">Publish blocked until APPROVED — drafts saved. Admin will notify on decision.</div>}
          </CardContent></Card>
      </div>
    </AdvancedSellerShell>
  );
}
