"use client";
import * as React from "react";

// Simple table form — no mannequin SVG, prioritized order user requested
const FIELDS = [
  { key:"shoulder", label:"Shoulder (13.5)", ha:"Kafada", placeholder:"13.5" },
  { key:"neck", label:"Neck (11)", ha:"Wuya", placeholder:"11" },
  { key:"armhole", label:"Arm / Armhole", ha:"Hannu", placeholder:"18" },
  { key:"sleeve_length", label:"Sleeve (16)", ha:"Tsawon hannu", placeholder:"16" },
  { key:"chest", label:"Chest / Bust (16)", ha:"Ƙirji", placeholder:"16" },
  { key:"shirt_length", label:"Shirt / Agbada length (30)", ha:"Tsawon riga", placeholder:"30" },
  { key:"waist", label:"Waist", ha:"Kugu", placeholder:"32" },
  { key:"trouser_length", label:"Trouser length (28)", ha:"Tsawon wando", placeholder:"28" },
  { key:"hip", label:"Hip / Lab", ha:"Lab", placeholder:"40" },
  { key:"thigh", label:"Thigh", ha:"Cinye", placeholder:"24" },
  { key:"stamina", label:"Stamina", ha:"Stamina", placeholder:"18" },
  { key:"knee", label:"Knee", ha:"Gwiwa", placeholder:"16" },
  { key:"calf", label:"Calf", ha:"Ƙafa", placeholder:"14" },
  { key:"ankle", label:"Ankle (6)", ha:"Idon sawu", placeholder:"6" },
  { key:"inseam", label:"Inseam", ha:"Tsawon ciki", placeholder:"30" },
  { key:"outseam", label:"Outseam", ha:"Tsawon waje", placeholder:"32" },
  { key:"height", label:"Height (full)", ha:"Tsayi", placeholder:"68" },
  { key:"wrist", label:"Wrist / Links", ha:"Links", placeholder:"7" },
];

type Props = { profile: { id:string; bodyTemplate:"MALE"|"FEMALE"; unit:string; garmentType:string; values: { key:string; value:number; unit:string }[] } };

export function MeasurementSimpleForm({ profile }: Props){
  const [unit, setUnit] = React.useState(profile.unit || "cm");
  const [values, setValues] = React.useState<Record<string,string>>(()=>{
    const m:Record<string,string>={};
    profile.values.forEach(v=> m[v.key]= String(v.value));
    return m;
  });
  const [saving, setSaving]=React.useState(false);
  const [feedback, setFeedback]=React.useState("");

  const save = async()=>{
    setSaving(true); setFeedback("");
    try{
      const payload = Object.entries(values).filter(([_,v])=> v!=="" && v!=null).map(([k,v])=> ({ key:k, value:Number(v), unit }));
      const res = await fetch(`/api/tailor/measurements/${profile.id}`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ values: payload, unit, status:"COMPLETED" }) });
      if (!res.ok) throw new Error(await res.text());
      setFeedback("✓ Saved — "+payload.length+" values • snapshot will be frozen on booking");
    } catch(e:any){ setFeedback("✗ "+(e.message||"failed")); }
    setSaving(false);
  };

  return (
    <div className="rounded-2xl border bg-white dark:bg-midnight p-4 shadow-soft">
      <div className="flex justify-between items-center mb-3">
        <div><div className="font-semibold text-sm">Measurements — {profile.bodyTemplate} • {profile.garmentType}</div><div className="text-xs text-muted-foreground">Priority: Shoulder → Neck → Arm → Chest/Bust → Shirt → Waist → Trouser • Fill in order, save once</div></div>
        <select value={unit} onChange={e=>setUnit(e.target.value)} className="h-8 rounded-full border px-3 text-xs bg-ivory"><option value="cm">cm</option><option value="in">inches</option></select>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {FIELDS.map(f=>{
          const isPriority = ["shoulder","neck","armhole","chest","shirt_length","waist","trouser_length"].includes(f.key);
          return (
            <label key={f.key} className={`space-y-1 block text-sm border rounded-xl p-3 ${isPriority?"bg-gold/10 border-gold/30":"bg-ivory border-midnight/10"}`}>
              <div className="flex justify-between"><span className={`text-xs font-semibold ${isPriority?"text-midnight":"text-taupe"}`}>{f.label} <span className="font-normal">/ {f.ha}</span></span>{isPriority && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold text-midnight">priority</span>}</div>
              <input value={values[f.key]||""} onChange={e=>setValues({...values, [f.key]: e.target.value})} placeholder={f.placeholder} type="number" step="0.1" className="w-full h-9 rounded-lg border px-3 bg-white dark:bg-midnight text-sm" />
              <div className="text-[10px] text-muted-foreground">{f.key} • {values[f.key] ? `${values[f.key]} ${unit} ✓` : "Not recorded"}</div>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={save} disabled={saving} className="flex-1 h-9 rounded-xl bg-midnight text-white text-sm disabled:opacity-50">{saving?"Saving…":"Save measurements"}</button>
        <button onClick={()=>setValues({})} className="px-4 h-9 rounded-xl border bg-white text-sm">Clear</button>
      </div>
      {feedback && <div className="mt-2 text-xs px-3 py-2 rounded-xl bg-ivory border">{feedback}</div>}
      <div className="mt-2 text-[11px] text-taupe text-center">Mannequin removed — clean table form. Tailor will add new visual later if needed. All values stored per key with unit, validated server-side.</div>
    </div>
  );
}
