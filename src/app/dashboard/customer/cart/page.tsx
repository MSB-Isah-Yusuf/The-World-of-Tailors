import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function CustomerCart() {
  return (
    <AdvancedCustomerShell title="Shopping Cart">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Shopping Cart</h1><p className="text-sm text-muted-foreground">Persistent per user • Multi-seller orders • Direct link to checkout (deliver to tailor supported)</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Your cart lives at /checkout — full live cart with qty +/- and checkout</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-white p-4 text-sm">Cart is shared between public /fabrics Add to Cart and this dashboard. <Link href="/checkout" className="underline text-plum">Go to /checkout →</Link> to review items, choose TO_CUSTOMER/TO_TAILOR, place order atomically, then Paystack.</div>
            <div className="text-xs text-muted-foreground">See also: <Link href="/dashboard/customer/orders" className="underline">My Fabric Orders</Link> after checkout • <Link href="/dashboard/customer/deliveries" className="underline">Delivery Tracking</Link></div>
          </CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
