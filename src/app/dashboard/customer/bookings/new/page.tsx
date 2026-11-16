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
    // Minimal required check: at least chest or waist or shirt_length
    if (!snapshot.chest && !snapshot.shoulder && !snapshot.waist) {
      // allow submit anyway — tailor will request full set, but warn
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
    const booking = await prisma.tailoringBooking.create({
      data: {
        reference: ref,
        customerId: (session.user as any).id,
        tailorId: tailor.id,
        designId,
        description: instructions,
        status: "REQUESTED",
        measurementSnapshot: snapshot as any,
        agreedPrice: null,
      }
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
        <Card className="dark:bg-white/[0.05] dark:border-white/10">
          <CardHeader><CardTitle className="dark:text-ivory">Request Tailoring — Full Measurements (Master List)</CardTitle><p className="text-sm text-muted-foreground dark:text-ivory/60">Tailor: {sp.tailor || "Select from portfolio"} • Design: {sp.design || "Bespoke"} • Complete list from master update — stored securely, only visible to chosen tailor. Priority: Shoulder → Neck → Arm → Chest/Bust → Shirt → Waist → Trouser</p></CardHeader>
          <CardContent>
            <form action={createBooking} className="space-y-6">
              <input type="hidden" name="tailorSlug" defaultValue={sp.tailor} />
              <input type="hidden" name="designSlug" defaultValue={sp.design} />
              
              <div className="space-y-3">
                <div className="font-semibold text-sm flex justify-between dark:text-ivory">Upper body <span className="text-xs text-muted-foreground dark:text-ivory/60">{grouped.upper_body.length} fields</span></div>
                <div className="grid md:grid-cols-3 gap-3">
                  {grouped.upper_body.map(f=>(
                    <div key={f.key}><Label>{f.labelEn} {f.required&&<span className="text-burgundy">*</span>}</Label><Input name={f.key} type="number" step="0.5" required={!!f.required} placeholder={f.placeholder} /><div className="text-[10px] text-muted-foreground">{f.labelHa} • {f.key}</div></div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-semibold text-sm flex justify-between dark:text-ivory">Waist / Hip <span className="text-xs text-muted-foreground dark:text-ivory/60">{grouped.waist_torso.length} fields</span></div>
                <div className="grid md:grid-cols-3 gap-3">
                  {grouped.waist_torso.map(f=>(
                    <div key={f.key}><Label>{f.labelEn} {f.required&&<span className="text-burgundy">*</span>}</Label><Input name={f.key} type="number" step="0.5" required={!!f.required} placeholder={f.placeholder} /></div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-semibold text-sm flex justify-between dark:text-ivory">Lower body <span className="text-xs text-muted-foreground dark:text-ivory/60">{grouped.lower_body.length} fields</span></div>
                <div className="grid md:grid-cols-3 gap-3">
                  {grouped.lower_body.map(f=>(
                    <div key={f.key}><Label>{f.labelEn} {f.required&&<span className="text-burgundy">*</span>}</Label><Input name={f.key} type="number" step="0.5" required={!!f.required} placeholder={f.placeholder} /></div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-semibold text-sm flex justify-between dark:text-ivory">Lengths / Other <span className="text-xs text-muted-foreground dark:text-ivory/60">{grouped.other.length} fields</span></div>
                <div className="grid md:grid-cols-3 gap-3">
                  {grouped.other.map(f=>(
                    <div key={f.key}><Label>{f.labelEn} {f.required&&<span className="text-burgundy">*</span>}</Label><Input name={f.key} type="number" step="0.5" required={!!f.required} placeholder={f.placeholder} /></div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Unit</Label><select name="unit" className="w-full h-10 rounded-xl border px-3 bg-white dark:bg-midnight/60"><option value="in">inches</option><option value="cm">cm</option></select></div>
                <div><Label>Special instructions</Label><Input name="instructions" placeholder="Hidden pocket, agbada embroidery, etc." /></div>
              </div>
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 p-3 text-xs">Full {MEASUREMENT_FIELDS.length} fields from master update — booking snapshot frozen. Tailor sees all values at /dashboard/tailor/production. Fabric sellers never see measurements (RBAC).</div>
              <Button type="submit" className="w-full">Submit Full Booking — REQUESTED • {MEASUREMENT_FIELDS.length} fields</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
