import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { MEASUREMENT_FIELDS } from "@/lib/measurements";
import { createBookingReturningId } from "@/lib/bookings/schema-compat";

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ tailor?: string; design?: string }> }) {
  const sp = await searchParams;
  async function createBooking(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");
    const tailorSlug = String(formData.get("tailorSlug")|| sp.tailor || "");
    const designSlug = String(formData.get("designSlug")|| sp.design || "");
    const instructions = String(formData.get("instructions")||"");
    const unit = String(formData.get("unit")||"in");

    // Collect ALL measurement fields dynamically (master list)
    const snapshot: Record<string, any> = { unit, instructions };
    for (const f of MEASUREMENT_FIELDS) {
      const v = formData.get(f.key);
      if (v !== null && String(v).trim() !== "") {
        const num = parseFloat(String(v));
        if (!isNaN(num)) snapshot[f.key] = num;
      }
    }
    // Exactly 6 required per master spec: shoulder, sleeve_length, chest, shirt_length, trouser_length, ankle
    const REQUIRED_6 = ["shoulder","sleeve_length","chest","shirt_length","trouser_length","ankle"] as const;
    const missing = (REQUIRED_6 as readonly string[]).filter(k => snapshot[k]==null || snapshot[k]==="");
    if (missing.length > 0) {
      throw new Error(`Missing required: ${missing.join(", ")} — all 6 required fields must be filled`);
    }

    const tailor = await prisma.tailorProfile.findUnique({ where: { slug: tailorSlug } });
    if (!tailor) throw new Error("Tailor not found");
    let designId: string | null = null;
    if (designSlug) {
      const d = await prisma.design.findUnique({ where: { slug: designSlug } });
      if (d && d.tailorId === tailor.id) designId = d.id;
      else if (d) throw new Error("Design does not belong to this tailor");
    }
    const ref = `SC-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;
    const booking = await createBookingReturningId(prisma.tailoringBooking, {
      reference: ref,
      customerId: (session.user as any).id,
      tailorId: tailor.id,
      designId,
      description: instructions,
      status: "REQUESTED",
      measurementSnapshot: snapshot as any,
      agreedPrice: null,
    });
    await prisma.bookingStatusHistory.create({ data: { bookingId: booking.id, toStatus: "REQUESTED", changedBy: (session.user as any).id } });
    await prisma.notification.create({ data: { userId: tailor.userId, title: "New booking request", message: `Booking ${ref} — review ${Object.keys(snapshot).length} measurements`, type: "booking", link: "/dashboard/tailor/bookings" } });
    // Also create/ update MeasurementProfile for audit trail
    try {
      await prisma.measurementProfile.create({
        data: {
          userId: (session.user as any).id,
          tailorId: tailor.id,
          bookingId: booking.id,
          name: `${ref} — ${tailor.businessName}`,
          garmentType: "NATIVE_WEAR" as any,
          bodyTemplate: "MALE" as any,
          unit,
          status: "AWAITING_CONFIRMATION" as any,
          notes: instructions,
          values: { create: Object.entries(snapshot).filter(([k,v])=> typeof v==="number").map(([k,v])=> ({ key:k, value: v as number, unit })) }
        }
      });
    } catch {}
    redirect("/dashboard/customer/bookings");
  }

  const grouped = {
    upper_body: MEASUREMENT_FIELDS.filter(f=>f.category==="upper_body"),
    waist_torso: MEASUREMENT_FIELDS.filter(f=>f.category==="waist_torso"),
    lower_body: MEASUREMENT_FIELDS.filter(f=>f.category==="lower_body"),
    other: MEASUREMENT_FIELDS.filter(f=>f.category==="other"),
  };

  return (
    <div className="min-h-screen bg-[#FFFBF0] dark:bg-midnight"><SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Card className="dark:bg-[#292929] dark:border-[#3A3936] bg-white">
          <CardHeader><CardTitle className="dark:text-[#F5F3EF]">Request Tailoring — 6 Required Measurements</CardTitle><p className="text-sm text-muted-foreground dark:text-[#B8B5AE]">Tailor: {sp.tailor || "Select from portfolio"} • Design: {sp.design || "Bespoke"} • 6 required • rest optional • stored securely, only visible to chosen tailor</p></CardHeader>
          <CardContent>
            <form action={createBooking} className="space-y-6">
              <input type="hidden" name="tailorSlug" defaultValue={sp.tailor} />
              <input type="hidden" name="designSlug" defaultValue={sp.design} />
              
              <div className="space-y-3">
                <div className="font-semibold text-sm flex items-center gap-2 dark:text-[#F5F3EF]"><span className="h-1.5 w-1.5 rounded-full bg-[#C6A15B]" /> Required — 6 fields (inch) <span className="ml-auto text-xs text-muted-foreground dark:text-[#B8B5AE]">All 6 marked * are required</span></div>
                <div className="grid md:grid-cols-3 gap-3">
                  {MEASUREMENT_FIELDS.filter(f=>f.required).map(f=>(
                    <div key={f.key}><Label>{f.labelEn} <span className="text-burgundy">*</span> <span className="text-[10px] text-muted-foreground">inch</span></Label><Input name={f.key} type="number" step="0.5" required placeholder={f.placeholder} className="h-9" /><div className="text-[10px] text-muted-foreground">{f.labelHa}</div></div>
                  ))}
                </div>
              </div>

              <details className="space-y-3 rounded-xl border bg-ivory/50 dark:bg-[#242424] dark:border-[#3A3936] p-3">
                <summary className="text-sm font-semibold cursor-pointer dark:text-[#F5F3EF]">Optional — expand for {MEASUREMENT_FIELDS.filter(f=>!f.required).length} more measurements</summary>
                <div className="grid md:grid-cols-3 gap-3 pt-2">
                  {MEASUREMENT_FIELDS.filter(f=>!f.required).map(f=>(
                    <div key={f.key}><Label className="text-xs">{f.labelEn} <span className="text-[10px] text-muted-foreground">inch</span></Label><Input name={f.key} type="number" step="0.5" placeholder={f.placeholder} className="h-9" /></div>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground">Optional — leave blank if not needed. Tailor can request specifics.</div>
              </details>

              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Unit</Label><select name="unit" className="w-full h-10 rounded-xl border px-3 bg-white dark:bg-midnight/60"><option value="in">inches</option><option value="cm">cm</option></select></div>
                <div><Label>Special instructions</Label><Input name="instructions" placeholder="Hidden pocket, agbada embroidery, etc." /></div>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/20 p-3 text-xs dark:text-[#B8B5AE]">6 required (Shoulder, Sleeve/Arm Length, Chest, Shirt, Trouser, Ankle) • rest optional • snapshot frozen • Tailor sees at /dashboard/tailor/production • sellers never see measurements (RBAC)</div>
              <Button type="submit" className="w-full">Submit Booking — REQUESTED • 6 required</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
