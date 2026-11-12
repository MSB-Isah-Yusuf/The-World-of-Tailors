"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type CartItem = { id: string; productId: string; quantity: number; product: any; lineTotal: number };

export default function CheckoutClient() {
  const [cart, setCart] = useState<{ items: CartItem[]; subtotal: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [street, setStreet] = useState("12 Allen Avenue, Ikeja");
  const [city, setCity] = useState("Lagos");
  const [state_, setState_] = useState("Lagos");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"TO_CUSTOMER" | "TO_TAILOR">("TO_CUSTOMER");
  const [tailorSlug, setTailorSlug] = useState("");
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      const j = await res.json();
      if (res.ok) setCart({ items: j.items || [], subtotal: j.subtotal || 0, count: j.count || 0 });
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateQty = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, action: "remove" }) });
    } else {
      await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity }) });
    }
    load();
  };

  const placeOrder = async () => {
    setError(""); setResult(null);
    if (!street || !city) { setError("Street and city required"); return; }
    // resolve tailor id from slug if needed
    let tailorDestinationId: string | null = null;
    if (deliveryType === "TO_TAILOR") {
      if (!tailorSlug.trim()) { setError("Enter tailor slug or ID for delivery to tailor"); return; }
      try {
        const r = await fetch(`/api/v1/tailors?slug=${encodeURIComponent(tailorSlug.trim())}`);
        const jj: any = await r.json().catch(() => ({}));
        const t = jj.tailors?.[0] || jj.tailor || null;
        if (t?.id) tailorDestinationId = t.id;
        else { setError(`Tailor "${tailorSlug}" not found (try: ade-bespoke, zara-stitches)`); return; }
      } catch { setError("Tailor lookup failed"); return; }
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryType,
          deliveryAddress: { street, city, state: state_, phone },
          tailorDestinationId,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Checkout failed");
      setResult(j);
      load();
    } catch (e: any) { setError(e.message); }
    setPlacing(false);
  };

  const pay = async (reference: string) => {
    setError("");
    try {
      const res = await fetch("/api/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Paystack init failed");
      if (j.authorization_url) window.location.href = j.authorization_url;
      else alert("Paystack mock — in test mode. Webhook will mark PAID. Reference: " + reference + " — Use /api/webhooks/paystack to simulate.");
    } catch (e: any) { setError(e.message); }
  };

  const perSellerFee = cart ? Math.ceil(cart.items.reduce((acc, it) => acc, 0) as any) : 0; // placeholder, actual per seller in API

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card><CardHeader><CardTitle>Checkout — Fabric Marketplace</CardTitle><p className="text-sm text-muted-foreground">Review cart • choose delivery destination • Paystack verification required (never trust browser redirect)</p></CardHeader>
          <CardContent className="space-y-4">
            {loading ? <div className="text-sm text-muted-foreground">Loading cart…</div> : !cart || cart.items.length === 0 ? (
              <div className="rounded-xl border bg-white p-6 text-sm text-center">
                Cart empty — <Link href="/fabrics" className="underline text-plum">Browse fabrics</Link> to add items. Stock is reserved atomically at checkout.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.items.map((it) => (
                  <div key={it.id} className="flex gap-3 items-center border rounded-xl p-3 bg-white">
                    <img src={it.product?.images?.[0]?.url || `https://picsum.photos/seed/${it.productId}/80/80`} alt={it.product?.name} className="h-16 w-16 rounded-lg object-cover border" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{it.product?.name || it.productId}</div>
                      <div className="text-xs text-muted-foreground">₦{Number(it.product?.price || 0).toLocaleString()} / {it.product?.unit} • {it.product?.seller?.businessName}</div>
                      <div className="text-xs">Line: ₦{Number(it.lineTotal).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(it.productId, Number(it.quantity) - 1)} className="h-8 w-8 rounded-full border bg-white text-sm">−</button>
                      <span className="w-8 text-center text-sm">{it.quantity}</span>
                      <button onClick={() => updateQty(it.productId, Number(it.quantity) + 1)} className="h-8 w-8 rounded-full border bg-white text-sm">+</button>
                    </div>
                    <button onClick={() => updateQty(it.productId, 0)} className="text-xs underline text-burgundy">Remove</button>
                  </div>
                ))}
              </div>
            )}

            <div><Label>Street address</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="12 Allen Avenue, Ikeja, Lagos" /></div>
            <div className="grid md:grid-cols-3 gap-4">
              <div><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lagos" /></div>
              <div><Label>State</Label><Input value={state_} onChange={(e) => setState_(e.target.value)} placeholder="Lagos" /></div>
              <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." /></div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div><Label>Delivery to</Label>
                <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as any)} className="w-full h-10 rounded-xl border px-3 text-sm bg-white">
                  <option value="TO_CUSTOMER">Deliver to me</option>
                  <option value="TO_TAILOR">Deliver to my tailor (verified)</option>
                </select>
              </div>
              {deliveryType === "TO_TAILOR" && <div><Label>Tailor slug (delivery destination)</Label><Input value={tailorSlug} onChange={(e) => setTailorSlug(e.target.value)} placeholder="ade-bespoke" /><div className="text-[11px] text-muted-foreground mt-1">Must be APPROVED tailor — e.g., ade-bespoke, zara-stitches, the-cut-lagos</div></div>}
            </div>

            {deliveryType === "TO_TAILOR" && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs">Delivery to tailor requires explicit selection & validation. Seller must confirm. Tailor receives notification, not customer measurements.</div>}

            {error && <div className="rounded-xl border border-burgundy/20 bg-burgundy/10 px-3 py-2 text-xs text-burgundy">{error}</div>}
            {result?.references && (
              <div className="rounded-xl border border-emeraldDeep/20 bg-emerald-50 p-3 text-xs">
                <div className="font-semibold text-emeraldDeep">✓ Orders created: {result.references.join(", ")}</div>
                <div className="mt-2 space-y-1">{
                  result.references.map((ref: string) => (
                    <div key={ref} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border"><span>{ref} • PAY-{ref}</span><button onClick={() => pay(`PAY-${ref}`)} className="px-3 py-1 rounded-full bg-midnight text-white text-xs">Pay with Paystack</button></div>
                  ))}
                </div>
                <div className="mt-2 text-muted-foreground">Webhook at <code>/api/webhooks/paystack</code> will verify HMAC SHA512 and mark PAID idempotently. Check <Link href="/dashboard/customer/orders" className="underline">My Orders</Link>.</div>
              </div>
            )}

            <Button onClick={placeOrder} disabled={placing || !cart || cart.items.length === 0} className="w-full">{placing ? "Placing orders…" : "Place Order — Reserve Stock Atomically"}</Button>
            <div className="text-xs text-muted-foreground">Order totals, delivery fees & payment status verified server-side via Paystack webhook idempotency. No card numbers stored. Separate orders per seller shown post-purchase in /dashboard/customer/orders</div>
          </CardContent></Card>
      </div>

      <Card className="h-fit"><CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader><CardContent className="text-sm space-y-2">
        {cart ? <>
          <div className="flex justify-between"><span>Items</span><span>{cart.count}</span></div>
          <div className="flex justify-between"><span>Subtotal</span><span>₦{Number(cart.subtotal).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Delivery (est. per seller)</span><span>₦{(deliveryType ? 2500 : 0).toLocaleString()} × sellers</span></div>
          <div className="flex justify-between font-semibold border-t pt-2"><span>Total est.</span><span>₦{(Number(cart.subtotal) + (cart.count ? 2500 : 0)).toLocaleString()} + fees</span></div>
        </> : <div className="text-xs text-muted-foreground">Loading…</div>}
        <div className="text-xs text-muted-foreground">Separate orders per seller created; each has its own Paystack reference <code>PAY-FO-...</code> and delivery tracking.</div>
        <Link href="/dashboard/customer/orders" className="text-xs underline text-plum">View my orders</Link>
      </CardContent></Card>
    </div>
  );
}
