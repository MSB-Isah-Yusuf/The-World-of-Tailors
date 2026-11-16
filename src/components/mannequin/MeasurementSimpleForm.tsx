"use client";
import * as React from "react";
import { MEASUREMENT_FIELDS } from "@/lib/measurements";

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
      setFeedback("✓ Saved — "+payload.length+"/"+MEASUREMENT_FIELDS.length+" values • snapshot frozen on booking");
    } catch(e:any){ setFeedback("✗ "+(e.message||"failed")); }
    setSaving(false);
  };

  const grouped = {
    upper_body: MEASUREMENT_FIELDS.filter(f=>f.category==="upper_body"),
    waist_torso: MEASUREMENT_FIELDS.filter(f=>f.category==="waist_torso"),
    lower_body: MEASUREMENT_FIELDS.filter(f=>f.category==="lower_body"),
    other: MEASUREMENT_FIELDS.filter(f=>f.category==="other"),
  };

  const renderGroup = (title:string, fields: typeof MEASUREMENT_FIELDS) => (
    <div className="space-y-2">
      <div className="font-semibold text-xs tracking-wide text-midnight dark:text-ivory">{title} • {fields.length}</div>
      <div className="grid md:grid-cols-3 gap-2">
        {fields.map(f=>{
          const isPriority = ["shoulder","neck","armhole","chest","shirt_length","waist","trouser_length"].includes(f.key);
          return (
            <label key={f.key} className={`space-y-1 block text-sm border rounded-xl p-2.5 ${isPriority?"bg-gold/10 border-gold/30 dark:bg-gold/10":"bg-ivory dark:bg-midnight/40 border-midnight/10 dark:border-white/10"}`}>
              <div className="flex justify-between items-center"><span className={`text-xs font-semibold ${isPriority?"text-midnight dark:text-gold":"text-foreground"}`}>{f.labelEn} {f.required&&<span className="text-burgundy">*</span>}</span>{isPriority && <span className="text-[8px] px-1 py-0.5 rounded-full bg-gold text-midnight font-bold">priority</span>}</div>
              <div className="text-[10px] text-muted-foreground">{f.labelHa} • {f.key}</div>
              <input value={values[f.key]||""} onChange={e=>setValues({...values, [f.key]: e.target.value})} placeholder={f.placeholder} type="number" step="0.1" className="w-full h-8 rounded-lg border px-2 bg-white dark:bg-midnight text-sm dark:text-ivory" />
              <div className="text-[10px] text-muted-foreground">{values[f.key] ? `${values[f.key]} ${unit} ✓` : "Not recorded"}</div>
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border bg-white dark:bg-midnight p-4 shadow-soft space-y-4">
      <div className="flex justify-between items-center">
        <div><div className="font-semibold text-sm">Measurements — {profile.bodyTemplate} • {profile.garmentType} • {MEASUREMENT_FIELDS.length} master fields</div><div className="text-xs text-muted-foreground">Priority 1-7 gold: Shoulder → Neck → Arm → Chest → Shirt → Waist → Trouser • All fields from master update</div></div>
        <select value={unit} onChange={e=>setUnit(e.target.value)} className="h-8 rounded-full border px-3 text-xs bg-ivory dark:bg-midnight dark:text-ivory"><option value="cm">cm</option><option value="in">inches</option></select>
      </div>
      {renderGroup("Upper body", grouped.upper_body)}
      {renderGroup("Waist / Hip", grouped.waist_torso)}
      {renderGroup("Lower body", grouped.lower_body)}
      {renderGroup("Lengths / Other", grouped.other)}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="flex-1 h-9 rounded-xl bg-midnight text-white text-sm disabled:opacity-50 dark:bg-gold dark:text-midnight">{saving?"Saving…":"Save all measurements • "+MEASUREMENT_FIELDS.length+" fields"}</button>
        <button onClick={()=>setValues({})} className="px-4 h-9 rounded-xl border bg-white dark:bg-midnight dark:text-ivory text-sm">Clear</button>
      </div>
      {feedback && <div className="text-xs px-3 py-2 rounded-xl bg-ivory dark:bg-midnight/40 border dark:border-white/10">{feedback}</div>}
      <div className="text-[11px] text-taupe text-center">Mannequin removed — full master list restored. Tailor can now capture every definition (neck 11, shoulder 13.5, chest 16 etc) + vertical shirt 30 / trouser 28.</div>
    </div>
  );
}
