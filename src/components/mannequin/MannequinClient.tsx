"use client";
import * as React from "react";
import { MannequinSVG, MEASUREMENT_HOTSPOTS } from "./Mannequin";

type Props = { profile: { id:string; bodyTemplate:"MALE"|"FEMALE"; unit:string; status:string; garmentType:string; values: { key:string; value:number; unit:string }[] }; isEdit?:boolean };

export function MannequinClient({ profile, isEdit }: Props){
  const [selected, setSelected] = React.useState<string>(MEASUREMENT_HOTSPOTS[0]?.key || "shoulder");
  const [view, setView] = React.useState<"front"|"back">("front");
  const [unit, setUnit] = React.useState(profile.unit || "cm");
  const [values, setValues] = React.useState<Record<string,number|undefined>>(()=>{ const m:Record<string,number|undefined>={}; profile.values.forEach(v=> m[v.key]=v.value); return m; });
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string>("");
  const defs = MEASUREMENT_HOTSPOTS;

  const selectedDef = defs.find(d=> d.key===selected) || defs[0];
  const currentVal = values[selected];

  const save = async()=>{
    setSaving(true); setFeedback("");
    try {
      const payload = Object.entries(values).filter(([_,v])=> v!=null).map(([k,v])=> ({ key:k, value:Number(v), unit }));
      const res = await fetch(`/api/tailor/measurements/${profile.id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ values: payload, unit, status: "COMPLETED" }) });
      if (!res.ok) throw new Error(await res.text());
      setFeedback("✓ Saved — measurement snapshot will be frozen on any linked booking");
    } catch(e:any){ setFeedback("✗ Save failed: "+(e.message||"unknown")); }
    setSaving(false);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <MannequinSVG template={profile.bodyTemplate} selectedKey={selected} onSelect={setSelected} values={values} view={view} setView={setView} />
      <div className="space-y-4">
        <div className="rounded-2xl border bg-white dark:bg-midnight dark:border-white/10 p-4 shadow-soft">
          <div className="flex justify-between items-center mb-3">
            <div><div className="font-semibold text-sm">{selectedDef?.labelEn} <span className="text-xs text-taupe">/ {selectedDef?.labelHa}</span></div><div className="text-xs text-muted-foreground">{selectedDef?.key} • {currentVal!=null? `${currentVal} ${unit}` : "Not recorded"} • Garment: {profile.garmentType}</div></div>
            <select value={unit} onChange={e=>setUnit(e.target.value)} className="h-8 rounded-full border px-3 text-xs bg-ivory"><option value="cm">cm</option><option value="in">inches</option></select>
          </div>
          <div className="space-y-3">
            <label className="space-y-1 block text-sm"><span className="text-xs text-taupe">Value for {selectedDef?.labelEn} ({unit})</span>
              <input type="number" step="0.1" value={currentVal ?? ""} onChange={e=> setValues({...values, [selected]: e.target.value===""? undefined: Number(e.target.value)})} placeholder="e.g. 17.5" className="w-full h-10 rounded-xl border px-3 bg-white dark:bg-midnight" />
            </label>
            <div className="text-xs flex gap-2">{currentVal!=null ? <span className="px-2 py-1 rounded-full bg-emeraldDeep text-white">● Recorded: {currentVal} {unit}</span> : <span className="px-2 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800">○ Unrecorded</span>}{selected && <span className="px-2 py-1 rounded-full bg-burgundy text-white">● Selected</span>}</div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving} className="flex-1 h-9 rounded-xl bg-midnight text-white text-sm hover:bg-plum disabled:opacity-50">{saving?"Saving…": isEdit ? "Update Measurements" : "Save Measurements"}</button>
              <button onClick={()=> setValues({})} className="px-4 h-9 rounded-xl border bg-white text-sm">Clear unsaved</button>
            </div>
            {feedback && <div className="text-xs px-3 py-2 rounded-xl bg-ivory border">{feedback}</div>}
            <div className="text-xs text-taupe">Garment-filtered: only relevant points shown for {profile.garmentType}. Validation enforces min/max per definition; unit stored explicitly per value.</div>
          </div>
        </div>
        <div className="rounded-xl border bg-white dark:bg-midnight p-3 text-xs space-y-2">
          <div className="font-semibold">All measurements ({Object.keys(values).length} recorded)</div>
          <div className="flex flex-wrap gap-2">{Object.entries(values).map(([k,v])=> v!=null && <button key={k} onClick={()=>setSelected(k)} className={`px-2 py-1 rounded-full border text-xs ${selected===k?"bg-burgundy text-white border-burgundy":"bg-ivory"}`}>{k}: {v} {unit}</button>)}</div>
          <div className="flex gap-2"><button onClick={()=>{ const q=prompt("Duplicate as new profile name?","Copy of "+profile.id); if(q) fetch(`/api/tailor/measurements/${profile.id}/duplicate`,{method:"POST", body: JSON.stringify({ name:q })}).then(()=>location.reload()); }} className="text-xs underline">Duplicate profile</button><a href="#" onClick={e=>{e.preventDefault(); window.print()}} className="text-xs underline">Print sheet</a><a href={`/api/tailor/measurements/${profile.id}/export`} className="text-xs underline">Export JSON</a></div>
        </div>
      </div>
    </div>
  );
}
