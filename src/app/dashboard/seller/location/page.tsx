"use client";
import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { LocationPicker } from "@/components/location/LocationPicker";
import { useState, useEffect } from "react";
export default function SellerLocationPage(){
  const [loc,setLoc]= useState({ country:"Nigeria", state:"Lagos", city:"Yaba", address:"", lat:6.60, lng:3.34 });
  const [saved,setSaved]= useState(false);
  useEffect(()=>{ fetch("/api/seller/location").then(r=>r.json()).then(j=>{ if(j.profile) setLoc({ country:j.profile.country||"Nigeria", state:j.profile.state||"Lagos", city:j.profile.city||"Yaba", address:j.profile.address||"", lat:j.profile.latitude||6.6, lng:j.profile.longitude||3.34 }) }).catch(()=>{}); },[]);
  const save= async()=>{ const res= await fetch("/api/seller/location",{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify(loc) }); if(res.ok) setSaved(true); };
  return <AdvancedSellerShell title="Location Settings"><div className="space-y-6 max-w-3xl"><h1 className="font-display text-2xl">Location Settings — Fabric Seller</h1><p className="text-sm text-muted-foreground">Confirm once • Delivery coverage derived from this pin • Private unless published</p><LocationPicker value={loc} onChange={setLoc} /><div className="rounded-xl border bg-white p-4 flex gap-2"><button onClick={save} className="px-4 py-2 rounded-xl bg-midnight text-white text-sm">Confirm Location</button>{saved && <span className="text-xs text-emeraldDeep self-center">✓ Saved — searchable in Fabrics Near You</span>}</div></div></AdvancedSellerShell>;
}
