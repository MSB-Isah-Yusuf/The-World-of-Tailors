"use client";
import * as React from "react";
import { NIGERIA_STATES } from "@/lib/location-data";
import { distanceKm } from "@/lib/location-data";

export function HomepageLocationSelector({ initialState, initialCity, onChange }: { initialState?: string; initialCity?: string; onChange?: (v:{state?:string, city?:string, lat?:number, lng?:number})=>void }) {
  const [state, setState] = React.useState(initialState || "");
  const [city, setCity] = React.useState(initialCity || "");
  const [detecting, setDetecting] = React.useState(false);
  const [status, setStatus] = React.useState("");

  const stateEntry = NIGERIA_STATES.find(s=> s.name===state);

  const detect = async()=>{
    setDetecting(true); setStatus("Detecting…");
    if (!navigator.geolocation) { setStatus("Not supported"); setDetecting(false); return; }
    navigator.geolocation.getCurrentPosition(async pos=>{
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const j = await res.json();
        const addr = j.address||{};
        const st = addr.state || addr.province || "";
        const ct = addr.city || addr.town || addr.village || "";
        setState(st); setCity(ct);
        setStatus(`✓ ${ct}, ${st} • ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        if (onChange) onChange({ state: st, city: ct, lat: latitude, lng: longitude });
        // Persist to UserPreference if logged in
        fetch("/api/preferences",{ method:"PATCH", headers:{ "Content-Type":"application/json"}, body: JSON.stringify({ browsingState: st, browsingCity: ct, browsingLat: latitude, browsingLng: longitude }) }).catch(()=>{});
        // Also update URL
        const url = new URL(window.location.href);
        if (st) url.searchParams.set("state", st);
        if (ct) url.searchParams.set("city", ct);
        url.searchParams.set("lat", String(latitude));
        url.searchParams.set("lng", String(longitude));
        window.history.pushState({}, "", url.toString());
      } catch {
        setStatus(`✓ ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
      setDetecting(false);
    }, err=>{ setStatus(`Denied: ${err.message} — select manually`); setDetecting(false); }, { enableHighAccuracy:true, timeout:8000 });
  };

  const apply = ()=>{
    if (onChange) onChange({ state, city });
    const url = new URL(window.location.href);
    if (state) url.searchParams.set("state", state); else url.searchParams.delete("state");
    if (city) url.searchParams.set("city", city); else url.searchParams.delete("city");
    window.history.pushState({}, "", url.toString());
    window.location.reload();
  };

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-soft space-y-3">
      <div className="flex flex-wrap justify-between gap-3 items-center">
        <div className="text-sm"><span className="font-semibold">Showing results near:</span> <span className="px-3 py-1 rounded-full bg-midnight text-white text-xs ml-2">{city || state || "All Nigeria"} {city && `• ${state}`}</span> <button onClick={()=>{const el=document.getElementById("loc-picker"); el?.scrollIntoView({behavior:"smooth"});}} className="ml-2 text-xs underline text-plum">Change Location</button></div>
        <button onClick={detect} disabled={detecting} className="px-4 py-2 rounded-full bg-midnight text-white text-xs hover:bg-plum disabled:opacity-50">📍 Detect My Location</button>
      </div>
      {status && <div className="text-xs px-3 py-2 rounded-xl bg-ivory border">{status}</div>}
      <div id="loc-picker" className="grid md:grid-cols-3 gap-3">
        <label className="space-y-1 text-sm"><span className="text-xs text-taupe">State / Region</span>
          <select value={state} onChange={e=>{setState(e.target.value); setCity("");}} className="w-full h-10 rounded-xl border bg-white px-3">
            <option value="">— All states —</option>
            {NIGERIA_STATES.map(s=> <option key={s.code} value={s.name}>{s.name} — {s.capital}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm"><span className="text-xs text-taupe">City / Town</span>
          <select value={city} onChange={e=>setCity(e.target.value)} className="w-full h-10 rounded-xl border bg-white px-3">
            <option value="">— All cities —</option>
            {(stateEntry?.cities||[]).map(c=> <option key={c.name} value={c.name}>{c.name}{c.lga?` (${c.lga})`:""}</option>)}
          </select>
        </label>
        <div className="flex items-end"><button onClick={apply} className="w-full h-10 rounded-xl bg-gold text-midnight font-semibold text-sm">Update Results</button></div>
      </div>
      <div className="text-[11px] text-taupe">Anonymous: Detect on click only • Logged-in: uses saved preferred location • Never silently override explicit selection • Manual city/state always allowed (for locations not listed)</div>
    </div>
  );
}
