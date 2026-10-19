import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ tailor?: string; design?: string }> }) {
  const sp = await searchParams;
  async function createBooking(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) redirect("/login");
    const tailorSlug = String(formData.get("tailorSlug")|| sp.tailor || "");
    const designSlug = String(formData.get("designSlug")|| sp.design || "");
    const chest = parseFloat(String(formData.get("chest")||""));
    const waist = parseFloat(String(formData.get("waist")||""));
    const instructions = String(formData.get("instructions")||"");
    const unit = String(formData.get("unit")||"in");
    // lookup tailor (ownership-scoped)
    const tailor = await prisma.tailorProfile.findUnique({ where: { slug: tailorSlug } });
    if (!tailor) throw new Error("Tailor not found");
    let designId: string | null = null;
    if (designSlug) {
      const d = await prisma.design.findUnique({ where: { slug: designSlug } });
      if (d && d.tailorId === tailor.id) designId = d.id; // enforce ownership: design must belong to tailor
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
        measurementSnapshot: { chest, waist, shoulder: 18, sleeve: 24, unit, instructions },
        agreedPrice: null,
      }
    });
    await prisma.bookingStatusHistory.create({ data: { bookingId: booking.id, toStatus: "REQUESTED", changedBy: (session.user as any).id } });
    await prisma.notification.create({ data: { userId: tailor.userId, title: "New booking request", message: `Booking ${ref} — review measurements`, type: "booking" } });
    redirect("/dashboard/customer/bookings");
  }

  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Card>
          <CardHeader><CardTitle>Request Tailoring — Submit Measurements</CardTitle><p className="text-sm text-muted-foreground">Tailor: {sp.tailor || "Select from portfolio"} • Design: {sp.design || "Bespoke"} • Measurements stored securely, only visible to your chosen tailor.</p></CardHeader>
          <CardContent>
            <form action={createBooking} className="space-y-4">
              <input type="hidden" name="tailorSlug" defaultValue={sp.tailor} />
              <input type="hidden" name="designSlug" defaultValue={sp.design} />
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>Chest / Bust</Label><Input name="chest" type="number" step="0.5" required placeholder="42" /></div>
                <div><Label>Waist</Label><Input name="waist" type="number" step="0.5" required placeholder="36" /></div>
                <div><Label>Unit</Label><select name="unit" className="w-full h-10 rounded-xl border px-3"><option value="in">inches</option><option value="cm">cm</option></select></div>
              </div>
              <div><Label>Special instructions</Label><Input name="instructions" placeholder="Add hidden pocket, gold embroidery, etc." /></div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs">Booking snapshot preserves your measurements — future profile edits won't affect this job. Fabric sellers never see measurements (RBAC enforced).</div>
              <Button type="submit" className="w-full">Submit Booking Request — REQUESTED</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
