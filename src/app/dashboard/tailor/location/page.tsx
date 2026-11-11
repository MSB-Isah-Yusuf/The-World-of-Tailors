"use client";
import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationPicker } from "@/components/location/LocationPicker";
import { useState, useEffect } from "react";
export default function LocationSettingsPage(){
  const [ loc, setLoc ] = useState({ country:"Nigeria", state:"Lagos", city:"Ikeja", address:"", lat:6.60, lng:3.34 });
  const [ saved, setSaved ] = useState(false);
  useEffect(()=>{ fetch("/api/tailor/location").then(r=>r.json()).then(j=>{ if(j.profile) setLoc({ country:j.profile.country||"Nigeria", state:j.profile.state||"Lagos", city:j.profile.city||"Ikeja", address:j.profile.address||"", lat:j.profile.latitude||6.6, lng:j.profile.longitude||3.34 }) }).catch(()=>{}); },[]);
  const save = async()=>{
    const res = await fetch("/api/tailor/location",{ method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(loc) });
    if(res.ok) setSaved(true);
  };
  return <AdvancedTailorShell title="Location Settings"><div className="space-y-6 max-w-3xl"><h1 className="font-display text-2xl">Location Settings</h1><p className="text-sm text-muted-foreground">Confirm once • Manual fallback allowed • Private unless published • Validated server-side</p><LocationPicker value={loc} onChange={setLoc} /><Card><CardContent className="p-4 flex gap-2"><button onClick={save} className="px-4 py-2 rounded-xl bg-midnight text-white text-sm">Confirm Location</button>{saved && <span className="text-xs text-emeraldDeep self-center">✓ Saved — now searchable</span>}<span className="text-xs text-muted-foreground self-center">Service radius {20} km • Used for homepage Near You ranking</span></CardContent></Card></div></AdvancedTailorShell>;
}
