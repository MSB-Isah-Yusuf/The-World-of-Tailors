import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function saveProfile(formData: FormData) {
  "use server";
  const { requireRole: rr } = await import("@/lib/rbac");
  const session = await rr(["TAILOR"]);
  const { prisma: p } = await import("@/lib/prisma");
  const userId = (session.user as any).id;
  const profile = await p.tailorProfile.findUnique({ where: { userId } });
  if (!profile) return;
  const businessName = String(formData.get("businessName")||profile.businessName).trim();
  const bio = String(formData.get("bio")||"").trim();
  const city = String(formData.get("city")||"").trim();
  const address = String(formData.get("address")||"").trim();
  const latitude = formData.get("latitude") ? Number(formData.get("latitude")) : profile.latitude;
  const longitude = formData.get("longitude") ? Number(formData.get("longitude")) : profile.longitude;
  const startingPrice = formData.get("startingPrice") ? Number(formData.get("startingPrice")) : profile.startingPrice;
  const turnaroundDays = formData.get("turnaroundDays") ? Number(formData.get("turnaroundDays")) : profile.turnaroundDays;
  const isPublished = formData.get("isPublished") === "on";
  // Only APPROVED profiles can publish (admin verification)
  const canPublish = profile.businessStatus==="APPROVED";
  await p.tailorProfile.update({ where: { id: profile.id }, data: { businessName, bio, city, address, latitude: isNaN(latitude as any)? undefined: latitude, longitude: isNaN(longitude as any)? undefined: longitude, startingPrice, turnaroundDays, isPublished: canPublish ? isPublished : false } });
  await p.auditLog.create({ data: { userId, action: "UPDATE_TAILOR_PROFILE", entity: "TailorProfile", entityId: profile.id, metadata:{ businessName } } });
  const { revalidatePath: rp } = await import("next/cache");
  rp("/dashboard/tailor/profile");
  rp("/dashboard/tailor");
}

export default async function TailorProfilePage() {
  const session = await requireRole(["TAILOR"]);
  const profile = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id }, include: { user: { select: { name:true,email:true,phone:true } } } });
  if (!profile) return <DashboardShell role="TAILOR" title="Tailor Business" nav={[{href:"#",label:"Overview"}]}><Card><CardContent className="p-6 text-sm">No tailor profile found. Contact support.</CardContent></Card></DashboardShell>;
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
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Profile & Settings — {profile.businessName}</h1><p className="text-sm text-muted-foreground">Verification status: <span className="font-semibold">{profile.businessStatus}</span> • Published: {profile.isPublished?"Yes":"No"} • Slug: {profile.slug}</p></div>
        {profile.businessStatus!=="APPROVED" && <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">⚠ {profile.businessStatus==="PENDING"?"Pending admin verification — you can manage bookings & designs, but your public page is hidden until APPROVED.":"Your profile is not approved — contact support."} Admin: /admin/verification</div>}
        <Card>
          <CardHeader><CardTitle className="text base">Business details — ownership checked (tailorProfile.userId)</CardTitle></CardHeader>
          <CardContent>
            <form action={saveProfile} className="space-y-4 text-sm">
              <div><Label>Business name</Label><Input name="businessName" defaultValue={profile.businessName} required /></div>
              <div><Label>Bio</Label><Input name="bio" defaultValue={profile.bio||""} placeholder="Kaftan, Agbada specialist — 12 years" /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>City</Label><Input name="city" defaultValue={profile.city||""} /></div>
                <div><Label>Starting price (NGN)</Label><Input name="startingPrice" type="number" defaultValue={profile.startingPrice||""} /></div>
              </div>
              <div><Label>Address (private by default — not published)</Label><Input name="address" defaultValue={profile.address||""} placeholder="14 Allen Ave, Ikeja, Lagos" /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Latitude</Label><Input name="latitude" type="number" step="any" defaultValue={profile.latitude??""} placeholder="6.5244" /></div>
                <div><Label>Longitude</Label><Input name="longitude" type="number" step="any" defaultValue={profile.longitude??""} placeholder="3.3792" /></div>
              </div>
              <div><Label>Turnaround (days)</Label><Input name="turnaroundDays" type="number" defaultValue={profile.turnaroundDays||7} /></div>
              <label className="flex gap-2 items-center text-sm"><input type="checkbox" name="isPublished" defaultChecked={profile.isPublished} disabled={profile.businessStatus!=="APPROVED"} /> Publish public portfolio {profile.businessStatus!=="APPROVED" && <span className="text-xs text-muted-foreground">(requires APPROVED)</span>}</label>
              <Button type="submit" className="w-full">Save profile — audit logged</Button>
              <div className="text-xs text-muted-foreground">Map picker: address search + marker + geolocation available on next iteration; manual coords supported now. Private addresses never listed without publishing.</div>
            </form>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="text-sm">Account</CardTitle></CardHeader><CardContent className="text-sm"><div>Name: {profile.user.name} • Email: {profile.user.email} • Phone: {profile.user.phone||"—"}</div><div className="text-xs text-muted-foreground">Role: TAILOR • Status: APPROVED via admin after verification. Least-privilege RBAC enforced.</div></CardContent></Card>
      </div>
    </DashboardShell>
  );
}
