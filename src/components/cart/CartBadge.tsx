"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export function CartBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    fetch("/api/cart").then(r => r.json()).then(j => { if (mounted && typeof j.count === "number") setCount(j.count); }).catch(() => {});
    const onFocus = () => fetch("/api/cart").then(r => r.json()).then(j => { if (mounted && typeof j.count === "number") setCount(j.count); }).catch(() => {});
    window.addEventListener("focus", onFocus);
    const iv = setInterval(onFocus, 15000);
    return () => { mounted = false; window.removeEventListener("focus", onFocus); clearInterval(iv); };
  }, []);
  return (
    <Link href="/checkout" className="hidden sm:grid h-9 w-9 place-items-center rounded-full border bg-white relative" aria-label={`Cart${count ? `, ${count} items` : ""}`}>
      <ShoppingBag className="h-4 w-4 text-midnight" />
      {count !== null && count > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-burgundy text-white text-[10px] grid place-items-center font-semibold">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}
