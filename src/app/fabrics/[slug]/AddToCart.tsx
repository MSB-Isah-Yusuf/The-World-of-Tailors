"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function AddToCart({ productId, minOrderQty, stock, unit }: { productId: string; minOrderQty: number; stock: number; unit: string }) {
  const [qty, setQty] = useState(minOrderQty);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const available = stock;

  const add = async () => {
    setMsg(""); setLoading(true);
    try {
      const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: qty }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setMsg("✓ Added to cart");
      router.refresh();
    } catch (e: any) { setMsg("✗ " + e.message); }
    setLoading(false);
  };

  return (
    <div className="mt-6 space-y-2">
      <div className="flex gap-2">
        <Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} min={minOrderQty} max={available} className="w-24 bg-white" />
        <Button onClick={add} disabled={loading} className="flex-1">{loading ? "Adding…" : "Add to Cart"}</Button>
      </div>
      <div className="text-xs text-muted-foreground">Min {minOrderQty} {unit} • {available} available • {msg && <span className={msg.startsWith("✓") ? "text-emeraldDeep" : "text-burgundy"}>{msg}</span>}</div>
    </div>
  );
}
