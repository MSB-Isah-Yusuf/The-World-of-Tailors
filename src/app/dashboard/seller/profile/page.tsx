import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import Link from "next/link";
async function saveProfile(formData:FormData){
  "use server";
  const session= await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id } });
  if(!profile) return;
  const businessName= String(formData.get("businessName")||profile.businessName).trim();
  const bio= String(formData.get("bio")||"").trim();
  const city= String(formData.get("city")||"").trim();
  const deliveryCoverageKm= formData.get("deliveryCoverageKm")? Number(formData.get("deliveryCoverageKm")): profile.deliveryCoverageKm;
  const isPublished= formData.get("isPublished")==="on";
  const canPublish= profile.businessStatus==="APPROVED";
  await prisma.sellerProfile.update({ where:{ id:profile.id }, data:{ businessName, bio, city, deliveryCoverageKm, isPublished: canPublish? isPublished:false } });
  await prisma.auditLog.create({ data:{ userId:(session.user as any).id, action:"UPDATE_SELLER_PROFILE", entity:"SellerProfile", entityId: profile.id } });
  revalidatePath("/dashboard/seller/profile");
}
export default async function SellerProfilePage(){
  const session= await requireRole(["FABRIC_SELLER"]);
  const profile= await prisma.sellerProfile.findUnique({ where:{ userId:(session.user as any).id }, include:{ user:{select:{name:true,email:true}} } });
  if(!profile) return <AdvancedSellerShell title="Business Profile"><div className="p-6">No seller profile</div></AdvancedSellerShell>;
  return <AdvancedSellerShell title="Business Profile"><div className="space-y-6 max-w-3xl"><h1 className="font-display text-2xl">Business Profile — {profile.businessName}</h1><p className="text-sm text-muted-foreground">Status {profile.businessStatus} • Published {profile.isPublished?"Yes":"No"} • Slug {profile.slug}</p>
  {profile.businessStatus!=="APPROVED" && <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">Pending verification — products hidden until APPROVED</div>}
  <Card><CardHeader><CardTitle className="text-base">Edit business</CardTitle></CardHeader><CardContent><form action={saveProfile} className="space-y-4 text-sm">
    <label className="block">Business name<input name="businessName" defaultValue={profile.businessName} className="w-full h-9 rounded-xl border px-3 mt-1"/></label>
    <label className="block">Bio<input name="bio" defaultValue={profile.bio||""} className="w-full h-9 rounded-xl border px-3 mt-1"/></label>
    <label className="block">City<input name="city" defaultValue={profile.city||""} className="w-full h-9 rounded-xl border px-3 mt-1"/></label>
    <label className="block">Delivery coverage (km)<input name="deliveryCoverageKm" type="number" defaultValue={profile.deliveryCoverageKm||25} className="w-full h-9 rounded-xl border px-3 mt-1"/></label>
    <label className="flex gap-2 items-center"><input type="checkbox" name="isPublished" defaultChecked={profile.isPublished} disabled={profile.businessStatus!=="APPROVED"}/> Publish</label>
    <button type="submit" className="w-full h-9 rounded-xl bg-midnight text-white text-sm">Save — audit logged</button>
  </form></CardContent></Card>
  <Card><CardHeader><CardTitle className="text-sm">Account</CardTitle></CardHeader><CardContent className="text-sm"><div>{profile.user.name} • {profile.user.email}</div><div className="text-xs text-muted-foreground">Seller location editable at <Link href="/dashboard/seller/location" className="underline">Location Settings</Link></div></CardContent></Card></div></AdvancedSellerShell>;
}
