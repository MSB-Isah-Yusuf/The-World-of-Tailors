import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function createWalkIn(formData: FormData){
  "use server";
  const session = await requireRole(["TAILOR"]);
  const profile = await prisma.tailorProfile.findUnique({ where:{ userId:(session.user as any).id } });
  if (!profile) redirect("/dashboard/tailor/measurements?error=NoProfile");
  const fullName = String(formData.get("fullName")||"").trim();
  const phone = String(formData.get("phone")||"").trim();
  const email = String(formData.get("email")||"").trim() || null;
  const gender = String(formData.get("gender")||"MALE") as any;
  const garmentType = String(formData.get("garmentType")||"NATIVE_WEAR") as any;
  const unit = String(formData.get("unit")||"cm");
  const notes = String(formData.get("notes")||"").trim() || null;
  if (!fullName || !phone) redirect("/dashboard/tailor/measurements/new?error=Missing");
  // dedup per tailor
  const existingPhone = await prisma.tailorCustomer.findUnique({ where:{ tailorId_phone:{ tailorId: profile.id, phone } } });
  if (existingPhone) redirect(`/dashboard/tailor/measurements?error=PhoneExists&phone=${encodeURIComponent(phone)}`);
  const cust = await prisma.tailorCustomer.create({ data:{ tailorId: profile.id, fullName, phone, email, gender, garmentPreference: garmentType, notes } });
  // Create initial measurement profile shell (not recorded) — tailor will fill via mannequin
  const mp = await prisma.measurementProfile.create({ data:{ tailorId: profile.id, tailorCustomerId: cust.id, name: `${fullName} — ${garmentType}`, garmentType, bodyTemplate: gender, unit, status:"NOT_RECORDED" as any, recordedBy:(session.user as any).id, notes } });
  await prisma.auditLog.create({ data:{ userId:(session.user as any).id, action:"CREATE_WALKIN_CUSTOMER", entity:"TailorCustomer", entityId:cust.id, metadata:{ fullName, phone } } });
  revalidatePath("/dashboard/tailor/measurements");
  redirect(`/dashboard/tailor/measurements/${mp.id}?edit=1`);
}

export default async function NewWalkInPage({ searchParams }: { searchParams: Promise<{ error?:string }> }) {
  const sp = await searchParams;
  return (
    <AdvancedTailorShell title="Add Walk-in Customer">
      <div className="max-w-2xl space-y-6">
        <div><h1 className="font-display text-2xl">+ Add Walk-in Customer</h1><p className="text-sm text-muted-foreground">Private to you — no TWT account required. You can invite them to join later via phone/email verification. Records never merge on name alone.</p></div>
        {sp?.error==="Missing" && <div className="rounded-xl border border-burgundy/20 bg-burgundy/10 px-3 py-2 text-sm text-burgundy">Full name and phone are required.</div>}
        {sp?.error==="PhoneExists" && <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">That phone already exists for your walk-in list. Use a different phone or open the existing record to update measurements.</div>}
        <Card>
          <CardHeader><CardTitle className="text-base">Customer details — local business record</CardTitle></CardHeader>
          <CardContent>
            <form action={createWalkIn} className="space-y-4 text-sm">
              <div><Label>Full name *</Label><Input name="fullName" required placeholder="Fatima Bello" /></div>
              <div className="grid md:grid-cols-2 gap-4"><div><Label>Phone *</Label><Input name="phone" required placeholder="+234 801 ..."/></div><div><Label>Email (optional)</Label><Input name="email" type="email" placeholder="fatima@..."/></div></div>
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>Gender / Body template</Label><select name="gender" className="w-full h-9 rounded-xl border px-3"><option value="MALE">Male mannequin</option><option value="FEMALE">Female mannequin</option></select></div>
                <div><Label>Garment type</Label><select name="garmentType" className="w-full h-9 rounded-xl border px-3"><option value="NATIVE_WEAR">Native wear</option><option value="SHIRT">Shirt</option><option value="TROUSERS">Trousers</option><option value="SUIT">Suit</option><option value="GOWN">Gown</option><option value="DRESS">Dress</option><option value="AGBADA">Agbada</option><option value="KAFTAN">Kaftan</option><option value="CHILDRENS_WEAR">Children's wear</option></select></div>
                <div><Label>Unit</Label><select name="unit" className="w-full h-9 rounded-xl border px-3"><option value="cm">cm</option><option value="in">inches</option></select></div>
              </div>
              <div><Label>Notes / Reference</Label><Input name="notes" placeholder="Walk-in, prefers gold embroidery, allergic to..." /></div>
              <Button type="submit" className="w-full">Save & open measurement mannequin →</Button>
              <div className="text-xs text-muted-foreground">Walk-in records remain private (tailorId scoped). Optional <em>Invite to join TWT</em> appears after saving. Account-linking verifies phone/email ownership — never merges on name.</div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdvancedTailorShell>
  );
}
