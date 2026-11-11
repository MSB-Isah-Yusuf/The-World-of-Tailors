"use client";
import * as React from "react";
import { NIGERIA_STATES, COUNTRIES } from "@/lib/location-data";

export function LocationPicker({ value, onChange, showDetect=true }: { value:{country?:string; state?:string; city?:string; address?:string; lat?:number; lng?:number}; onChange:(v:any)=>void; showDetect?:boolean }) {
  const [detecting, setDetecting] = React.useState(false);
  const [status, setStatus] = React.useState<string>("");
  const stateEntry = NIGERIA_STATES.find(s=> s.name===value.state);
  const detect = async()=>{
    setDetecting(true); setStatus("Requesting permission…");
    if (!navigator.geolocation) { setStatus("Geolocation not supported"); setDetecting(false); return; }
    navigator.geolocation.getCurrentPosition(async pos=>{
      const { latitude, longitude } = pos.coords;
      setStatus(`Detected ${latitude.toFixed(4)}, ${longitude.toFixed(4)} — reverse-geocoding…`);
      try {
        // OpenStreetMap Nominatim reverse (no key) — fallback to coords only if blocked
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const j = await res.json();
        const addr = j.address||{};
        const country = addr.country || "Nigeria";
        const state = addr.state || addr.province || value.state || "";
        const city = addr.city || addr.town || addr.village || value.city || "";
        onChange({ country, state, city, address: j.display_name || value.address, lat: latitude, lng: longitude });
        setStatus(`✓ ${city}, ${state}, ${country}`);
      } catch {
        onChange({ ...value, lat: latitude, lng: longitude });
        setStatus(`✓ Coordinates saved — adjust manually if needed`);
      }
      setDetecting(false);
    }, err=>{
      setStatus(`Permission denied: ${err.message} — use manual selection below`);
      setDetecting(false);
    }, { enableHighAccuracy:true, timeout: 8000 });
  };

  return (
    <div className="space-y-3 p-3 rounded-xl border bg-white dark:bg-midnight dark:border-white/10">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm flex gap-2 items-center">📍 Business Location</div>
        {showDetect && <button type="button" onClick={detect} disabled={detecting} className="px-3 py-1.5 rounded-full bg-midnight text-white text-xs hover:bg-plum disabled:opacity-50">📍 Detect My Location</button>}
      </div>
      {status && <div className="text-xs px-3 py-2 rounded-xl bg-ivory border">{status}</div>}
      {(value.lat && value.lng) && (
        <div className="rounded-xl overflow-hidden border h-28 bg-ivory grid place-items-center text-xs">
          {/* Lightweight map preview — static OSM iframe, no API key */}
          <iframe title="map" className="w-full h-full border-0" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${value.lng-0.02}%2C${value.lat-0.02}%2C${value.lng+0.02}%2C${value.lat+0.02}&layer=mapnik&marker=${value.lat}%2C${value.lng}`} />
        </div>
      )}
      {value.lat && <div className="text-[11px] text-taupe text-center">Detected: {value.city||"—"}, {value.state||"—"}, {value.country||"Nigeria"} • {value.lat?.toFixed(5)}, {value.lng?.toFixed(5)} <button type="button" onClick={()=>onChange({...value, confirm:true})} className="ml-2 underline">Confirm Location</button></div>}
      <div className="grid md:grid-cols-3 gap-2 text-sm">
        <label className="space-y-1"><span className="text-xs text-taupe">Country</span>
          <select value={value.country||"Nigeria"} onChange={e=>onChange({...value, country:e.target.value})} className="w-full h-9 rounded-xl border bg-white px-3">
            {COUNTRIES.map(c=><option key={c.code} value={c.name}>{c.name} ({c.code})</option>)}
          </select>
        </label>
        <label className="space-y-1"><span className="text-xs text-taupe">State / Region</span>
          <select value={value.state||""} onChange={e=>onChange({...value, state:e.target.value, city:""})} className="w-full h-9 rounded-xl border bg-white px-3">
            <option value="">— Select state —</option>
            {NIGERIA_STATES.map(s=><option key={s.code} value={s.name}>{s.name} — {s.capital}</option>)}
          </select>
        </label>
        <label className="space-y-1"><span className="text-xs text-taupe">City / Town</span>
          <select value={value.city||""} onChange={e=>onChange({...value, city:e.target.value})} className="w-full h-9 rounded-xl border bg-white px-3">
            <option value="">— Select city —</option>
            {(stateEntry?.cities||[]).map(c=><option key={c.name} value={c.name}>{c.name}{c.lga?` (${c.lga})`:""}</option>)}
          </select>
        </label>
      </div>
      <label className="space-y-1 text-sm"><span className="text-xs text-taupe">Street address (editable, private unless published)</span><input value={value.address||""} onChange={e=>onChange({...value, address:e.target.value})} placeholder="14 Allen Avenue, Ikeja" className="w-full h-9 rounded-xl border px-3" /></label>
      <div className="flex gap-2 text-xs">
        <span className="px-3 py-1 rounded-full bg-emeraldDeep text-white">Lat {value.lat?.toFixed(4)||"—"}</span>
        <span className="px-3 py-1 rounded-full bg-emeraldDeep text-white">Lng {value.lng?.toFixed(4)||"—"}</span>
        <span className="text-taupe self-center">Validated server-side • No continuous tracking • Private unless you publish</span>
      </div>
    </div>
  );
}
