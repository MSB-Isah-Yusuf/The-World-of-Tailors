import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CheckoutPage() {
  const session = await auth();
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-5xl px-6 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card><CardHeader><CardTitle>Checkout — Fabric Marketplace</CardTitle><p className="text-sm text-muted-foreground">Review cart • choose delivery destination • Paystack verification required (never trust browser redirect)</p></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-white p-4 text-sm">Cart is persistent per user. Multi-seller carts create separate fulfilment orders with atomic inventory reservation. Demo: add items from /fabrics then return here.</div>
              <div><Label>Delivery address</Label><Input placeholder="12 Allen Avenue, Ikeja, Lagos" /></div>
              <div className="grid md:grid-cols-2 gap-4"><div><Label>Delivery to</Label><select className="w-full h-10 rounded-xl border px-3 text-sm bg-white"><option>Deliver to me</option><option>Deliver to my tailor — Ade Bespoke (eligible)</option></select></div><div><Label>Phone</Label><Input placeholder="+234..." /></div></div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs">Delivery to tailor requires explicit selection & validation. Seller must confirm. Tailor receives notification, not customer measurements.</div>
              <Button className="w-full">Proceed to Paystack (sandbox)</Button>
              <div className="text-xs text-muted-foreground">Order totals, delivery fees & payment status are verified server-side via Paystack webhook idempotency. No card numbers stored.</div>
            </CardContent></Card>
        </div>
        <Card className="h-fit"><CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader><CardContent className="text-sm space-y-2"><div className="flex justify-between"><span>Subtotal</span><span>₦36,000</span></div><div className="flex justify-between"><span>Delivery</span><span>₦2,500</span></div><div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>₦38,500</span></div><div className="text-xs text-muted-foreground">Separate orders per seller shown post-purchase in /dashboard/customer/orders</div></CardContent></Card>
      </div></div>
  );
}
