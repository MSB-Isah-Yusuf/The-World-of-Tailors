"use client";
import * as React from "react";

export type BodyTemplate = "MALE" | "FEMALE";
export type Hotspot = { key:string; labelEn:string; labelHa:string; x:number; y:number; view:"front"|"back" };

export const MEASUREMENT_HOTSPOTS: Hotspot[] = [
  { key:"neck", labelEn:"Neck", labelHa:"Wuya", x:50, y:18, view:"front" },
  { key:"shoulder", labelEn:"Shoulder width", labelHa:"Fadin kafada", x:28, y:24, view:"front" },
  { key:"shoulder", labelEn:"Shoulder width", labelHa:"Fadin kafada", x:72, y:24, view:"front" },
  { key:"chest", labelEn:"Chest/Bust", labelHa:"Ƙirji", x:50, y:31, view:"front" },
  { key:"armhole", labelEn:"Armhole", labelHa:"Kuhun hannu", x:22, y:32, view:"front" },
  { key:"bicep", labelEn:"Bicep", labelHa:"Tsoka", x:18, y:36, view:"front" },
  { key:"elbow", labelEn:"Elbow", labelHa:"Gwiwar hannu", x:14, y:46, view:"front" },
  { key:"wrist", labelEn:"Wrist", labelHa:"Wuyan hannu", x:10, y:58, view:"front" },
  { key:"sleeve_length", labelEn:"Sleeve length", labelHa:"Tsawon hannu", x:32, y:42, view:"front" },
  { key:"back_width", labelEn:"Back width", labelHa:"Fadin baya", x:50, y:28, view:"back" },
  { key:"front_length", labelEn:"Front length", labelHa:"Tsawon gaba", x:50, y:38, view:"front" },
  { key:"waist", labelEn:"Waist", labelHa:"Kugu", x:50, y:44, view:"front" },
  { key:"hip", labelEn:"Hip", labelHa:"Kugu na ƙasa", x:50, y:52, view:"front" },
  { key:"thigh", labelEn:"Thigh", labelHa:"Cinye", x:36, y:60, view:"front" },
  { key:"knee", labelEn:"Knee", labelHa:"Gwiwa", x:36, y:70, view:"front" },
  { key:"calf", labelEn:"Calf", labelHa:"Ƙaramar ƙafa", x:36, y:78, view:"front" },
  { key:"inseam", labelEn:"Inseam", labelHa:"Tsawon ciki", x:46, y:68, view:"front" },
  { key:"outseam", labelEn:"Outseam", labelHa:"Tsawon waje", x:54, y:68, view:"front" },
  { key:"trouser_length", labelEn:"Trouser length", labelHa:"Tsawon wando", x:50, y:86, view:"front" },
  { key:"full_length", labelEn:"Full body length", labelHa:"Tsawon jiki gabaɗaya", x:62, y:50, view:"front" },
  { key:"dress_length", labelEn:"Dress length", labelHa:"Tsawon riga", x:50, y:62, view:"front" },
];

export function MannequinSVG({ template, selectedKey, onSelect, values, view, setView }: { template: BodyTemplate; selectedKey?: string; onSelect: (k:string)=>void; values: Record<string,number|undefined>; view:"front"|"back"; setView:(v:"front"|"back")=>void }) {
  const filtered = MEASUREMENT_HOTSPOTS.filter(h=> h.view===view);
  const isFemale = template==="FEMALE";
  return (
    <div className="rounded-2xl border bg-white dark:bg-midnight dark:border-white/10 p-3 shadow-soft">
      <div className="flex justify-between items-center mb-2 text-xs">
        <div className="flex gap-2">
          <button onClick={()=>setView("front")} className={`px-3 py-1 rounded-full border ${view==="front"?"bg-midnight text-white dark:bg-gold dark:text-midnight":"bg-ivory"}`}>Front</button>
          <button onClick={()=>setView("back")} className={`px-3 py-1 rounded-full border ${view==="back"?"bg-midnight text-white dark:bg-gold dark:text-midnight":"bg-ivory"}`}>Back</button>
        </div>
        <span className="px-2 py-1 rounded-full bg-champagne text-xs">{template} • {isFemale?"Mataye":"Namiji"}</span>
      </div>
      <div className="relative aspect-[3/5] w-full max-w-[320px] mx-auto bg-gradient-to-b from-ivory to-champagne/40 dark:from-midnight dark:to-navy rounded-xl overflow-hidden border">
        <svg viewBox="0 0 100 120" className="absolute inset-0 w-full h-full" role="img" aria-label={`${template} mannequin ${view} view`}>
          {/* head */}
          <ellipse cx="50" cy="12" rx="7" ry="8" fill={isFemale?"#E8D8BB":"#D9C7A5"} stroke="#8B8178" strokeWidth="0.6" />
          {/* neck */}
          <rect x="46" y="19" width="8" height="5" rx="2" fill={isFemale?"#E9D9BE":"#DbC9AA"} />
          {/* torso */}
          {isFemale ? (
            <path d="M34 23 Q50 19 66 23 L62 45 Q50 48 38 45 Z" fill="#F3E7CF" stroke="#8B8178" strokeWidth="0.6" />
          ) : (
            <path d="M31 23 L69 23 L66 44 L34 44 Z" fill="#EFE1C6" stroke="#8B8178" strokeWidth="0.6" />
          )}
          {/* arms */}
          <path d="M31 24 L14 42 L12 58 L18 59 L28 32 Z" fill={isFemale?"#F3E7CF":"#EFE1C6"} stroke="#8B8178" strokeWidth="0.5" />
          <path d="M69 24 L86 42 L88 58 L82 59 L72 32 Z" fill={isFemale?"#F3E7CF":"#EFE1C6"} stroke="#8B8178" strokeWidth="0.5" />
          {/* waist to hips */}
          <path d="M38 45 L62 45 L60 58 L40 58 Z" fill={isFemale?"#E9D9BE":"#EAE0C5"} stroke="#8B8178" strokeWidth="0.5" />
          {/* legs */}
          <path d="M40 58 L46 92 L44 98 L38 98 L36 58 Z" fill={isFemale?"#F3E7CF":"#EFE1C6"} stroke="#8B8178" strokeWidth="0.5" />
          <path d="M60 58 L64 58 L62 98 L56 98 L54 92 Z" fill={isFemale?"#F3E7CF":"#EFE1C6"} stroke="#8B8178" strokeWidth="0.5" />
          {/* back view differentiation */}
          {view==="back" && <path d="M34 26 Q50 30 66 26" fill="none" stroke="#C6A15B" strokeDasharray="1.5 1.5" strokeWidth="0.6" />}
        </svg>
        {/* hotspots */}
        {filtered.map(h=>{
          const val = values[h.key];
          const isSelected = selectedKey===h.key;
          const hasVal = val!=null && !isNaN(val as number);
          return (
            <button
              key={`${h.key}-${h.x}-${h.y}`}
              onClick={()=>onSelect(h.key)}
              aria-label={`${h.labelEn} ${val?`: ${val}`:""}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition
                ${isSelected ? "bg-burgundy text-white border-burgundy scale-110 shadow-gold" : hasVal ? "bg-emeraldDeep text-white border-emeraldDeep" : "bg-white/90 text-midnight border-gold hover:bg-gold/20"}
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}
              style={{ left: `${h.x}%`, top: `${h.y}%`, width: "22px", height: "22px" }}
            >
              {hasVal ? "●" : "+"}
            </button>
          );
        })}
        {/* legend */}
        <div className="absolute bottom-2 left-2 right-2 flex gap-2 text-[9px] justify-center flex-wrap">
          <span className="px-2 py-0.5 rounded-full bg-white/90 border">● recorded</span>
          <span className="px-2 py-0.5 rounded-full bg-burgundy text-white">● selected</span>
          <span className="px-2 py-0.5 rounded-full bg-white/90 border">+ empty</span>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-taupe text-center">Tap a body part to enter measurement • Pinch/zoom supported • Front/Back toggle</div>
    </div>
  );
}
