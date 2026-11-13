"use client";
import * as React from "react";

export type BodyTemplate = "MALE" | "FEMALE";
export type Hotspot = { key:string; labelEn:string; labelHa:string; x:number; y:number; view:"front"|"back"; group?: string };

// Professional unified hotspots — combines Image 1 (Western anatomical) + Image 2 (Agbada/Nigerian verticals)
// Added: shirt_length (SHIRT 30" in Agbada sheet) + trouser_length (TROUSER 28") as vertical garment heights
// Preserved: neck, shoulder, chest, armhole, sleeve, waist, hip, thigh/lab, stamina/knee, ankle, inseam/outseam
export const MEASUREMENT_HOTSPOTS: Hotspot[] = [
  // upper
  { key:"neck", labelEn:"Neck circumference", labelHa:"Wuya — kewaye", x:62, y:16, view:"front", group:"upper" },
  { key:"shoulder", labelEn:"Shoulder width", labelHa:"Fadin kafada", x:26, y:22, view:"front", group:"upper" },
  { key:"shoulder", labelEn:"Shoulder width", labelHa:"Fadin kafada", x:74, y:22, view:"front", group:"upper" },
  { key:"chest", labelEn:"Chest / Bust", labelHa:"Ƙirji", x:50, y:30, view:"front", group:"upper" },
  { key:"armhole", labelEn:"Armhole", labelHa:"Kuhun hannu (armhole)", x:21, y:31, view:"front", group:"upper" },
  { key:"bicep", labelEn:"Bicep", labelHa:"Tsoka", x:16, y:36, view:"front", group:"upper" },
  { key:"sleeve_length", labelEn:"Sleeve length", labelHa:"Tsawon hannu (SLEEVE 16)", x:30, y:42, view:"front", group:"upper" },
  // front length / shirt height — CRITICAL from Agbada Image 2
  { key:"shirt_length", labelEn:"Shirt / Kaftan length", labelHa:"Tsawon riga (SHIRT 30)", x:8, y:48, view:"front", group:"vertical" },
  { key:"agbada_length", labelEn:"Agbada full length", labelHa:"Tsawon agbada", x:8, y:62, view:"front", group:"vertical" },
  { key:"front_length", labelEn:"Front length", labelHa:"Tsawon gaba", x:50, y:38, view:"front", group:"vertical" },
  { key:"back_width", labelEn:"Back width", labelHa:"Fadin baya", x:50, y:27, view:"back", group:"upper" },
  // waist/hip
  { key:"waist", labelEn:"Waist", labelHa:"Kugu", x:50, y:44, view:"front", group:"core" },
  { key:"hip", labelEn:"Hip", labelHa:"Kugu na ƙasa", x:50, y:52, view:"front", group:"core" },
  { key:"thigh", labelEn:"Thigh / Lab", labelHa:"Lab — cinye", x:36, y:60, view:"front", group:"lower" },
  { key:"stamina", labelEn:"Stamina (knee-height reference)", labelHa:"Stamina", x:65, y:70, view:"front", group:"lower" },
  { key:"knee", labelEn:"Knee", labelHa:"Gwiwa", x:36, y:72, view:"front", group:"lower" },
  { key:"calf", labelEn:"Calf", labelHa:"Ƙaramar ƙafa", x:36, y:80, view:"front", group:"lower" },
  { key:"inseam", labelEn:"Inseam", labelHa:"Tsawon ciki", x:46, y:68, view:"front", group:"lower" },
  { key:"outseam", labelEn:"Outseam", labelHa:"Tsawon waje", x:54, y:68, view:"front", group:"lower" },
  { key:"trouser_length", labelEn:"Trouser length", labelHa:"Tsawon wando (TROUSER 28)", x:92, y:62, view:"front", group:"vertical" },
  { key:"ankle", labelEn:"Ankle", labelHa:"Idon sawu (ANKLE 6)", x:50, y:96, view:"front", group:"lower" },
  // legacy / extended
  { key:"full_length", labelEn:"Full body length", labelHa:"Tsawon jiki gabaɗaya", x:62, y:50, view:"front", group:"vertical" },
  { key:"dress_length", labelEn:"Dress / Gown length", labelHa:"Tsawon riga", x:50, y:64, view:"front", group:"vertical" },
  { key:"wrist", labelEn:"Wrist / Links", labelHa:"Wuyan hannu (LINKS)", x:10, y:58, view:"front", group:"upper" },
  { key:"elbow", labelEn:"Elbow", labelHa:"Gwiwar hannu", x:14, y:46, view:"front", group:"upper" },
];

export function MannequinSVG({ template, selectedKey, onSelect, values, view, setView }: { template: BodyTemplate; selectedKey?: string; onSelect: (k:string)=>void; values: Record<string,number|undefined>; view:"front"|"back"; setView:(v:"front"|"back")=>void }) {
  const filtered = MEASUREMENT_HOTSPOTS.filter(h=> h.view===view);
  const isFemale = template==="FEMALE";
  return (
    <div className="rounded-2xl border bg-white dark:bg-midnight dark:border-white/10 p-3 shadow-soft">
      <div className="flex justify-between items-center mb-2 text-xs">
        <div className="flex gap-2">
          <button onClick={()=>setView("front")} className={`px-3 py-1 rounded-full border text-xs transition ${view==="front"?"bg-midnight text-white dark:bg-gold dark:text-midnight font-semibold":"bg-ivory hover:bg-champagne"}`}>Front</button>
          <button onClick={()=>setView("back")} className={`px-3 py-1 rounded-full border text-xs transition ${view==="back"?"bg-midnight text-white dark:bg-gold dark:text-midnight font-semibold":"bg-ivory hover:bg-champagne"}`}>Back</button>
        </div>
        <span className="px-2 py-1 rounded-full bg-champagne text-xs font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emeraldDeep inline-block" /> {template} • {isFemale?"Mataye":"Namiji"} • {view}
        </span>
      </div>

      {/* Professional mannequin canvas — 3:5 vertical with garment-length guides */}
      <div className="relative aspect-[3/5.4] w-full max-w-[340px] mx-auto bg-gradient-to-b from-ivory to-champagne/30 dark:from-midnight dark:to-navy rounded-xl overflow-hidden border">
        <svg viewBox="0 0 100 160" className="absolute inset-0 w-full h-full" role="img" aria-label={`${template} mannequin ${view} view — includes shirt and trouser height`}>
          {/* SHIRT height guide — left side vertical (from Image 2: SHIRT 30) */}
          <line x1="6" y1="22" x2="6" y2="78" stroke="#8B8178" strokeWidth="0.45" strokeDasharray="1.2 1.2" />
          <path d="M4 22 L6 20 L8 22" fill="none" stroke="#8B8178" strokeWidth="0.6" />
          <path d="M4 78 L6 80 L8 78" fill="none" stroke="#8B8178" strokeWidth="0.6" />
          <text x="6" y="12" textAnchor="middle" fontSize="3.2" fill="#6B5B4F" fontFamily="sans-serif">SHIRT</text>

          {/* TROUSER height guide — right side vertical (from Image 2: TROUSER 28) */}
          <line x1="94" y1="44" x2="94" y2="98" stroke="#8B8178" strokeWidth="0.45" strokeDasharray="1.2 1.2" />
          <path d="M92 44 L94 42 L96 44" fill="none" stroke="#8B8178" strokeWidth="0.6" />
          <path d="M92 98 L94 100 L96 98" fill="none" stroke="#8B8178" strokeWidth="0.6" />
          <text x="94" y="112" textAnchor="middle" fontSize="3.2" fill="#6B5B4F">TROUSER</text>

          {/* Center chest/waist/hip horizontal guides (from Image 1: dotted lines) */}
          <line x1="32" y1="30" x2="68" y2="30" stroke="#C6A15B" strokeWidth="0.35" strokeDasharray="1.5 1.5" opacity="0.9" />
          <line x1="35" y1="44" x2="65" y2="44" stroke="#C6A15B" strokeWidth="0.35" strokeDasharray="1.5 1.5" opacity="0.9" />
          <line x1="33" y1="53" x2="67" y2="53" stroke="#C6A15B" strokeWidth="0.35" strokeDasharray="1.5 1.5" opacity="0.9" />

          {/* HEAD — detailed */}
          <ellipse cx="50" cy="11.5" rx="6.8" ry="8.2" fill={isFemale?"#EADCC0":"#DCCFB0"} stroke="#8B8178" strokeWidth="0.6" />
          <ellipse cx="50" cy="12.8" rx="4.5" ry="5" fill={isFemale?"#EFE1C6":"#E5D8BA"} opacity="0.6" />
          {/* neck — AGBADA Image 2 NECK 11 */}
          <path d="M46.2 19.5 L45.4 23.2 L54.6 23.2 L53.8 19.5 Z" fill={isFemale?"#E9D9BE":"#DbC9AA"} stroke="#8B8178" strokeWidth="0.5" />
          <ellipse cx="50" cy="23.2" rx="4.6" ry="1.1" fill="#D9C7A5" stroke="#8B8178" strokeWidth="0.4" opacity="0.7" />

          {/* TORSO — gender-differentiated professional cut */}
          {isFemale ? (
            <>
              {/* Female: bust, cinched waist, flared hip — elegant */}
              <path d="M36.5 23.5 C34 24.5 32.2 26 31 28.5 L30.2 32 L32.5 44.5 Q34.5 46 37 44.8 L39.5 43.5 Q42 41 50 41 Q58 41 60.5 43.5 L63 44.8 Q65.5 46 67.5 44.5 L69.8 32 C68.6 26 66.8 24.5 63.5 23.5 L58 24.2 Q50 25.5 42 24.2 Z" fill="#F6ECD2" stroke="#8B8178" strokeWidth="0.65" />
              {/* bust line */}
              <path d="M31.5 33 Q50 35 68.5 33" fill="none" stroke="#8B8178" strokeWidth="0.35" strokeDasharray="1 1.2" opacity="0.7" />
              {/* waist cinch */}
              <path d="M39.5 43.5 Q50 42 60.5 43.5" fill="none" stroke="#8B8178" strokeWidth="0.4" />
            </>
          ) : (
            <>
              {/* Male: broad shoulders, straight chest, subtle waist — tailoring block */}
              <path d="M30.5 23.2 L32 26 L30 32.5 L32.8 45 Q34 46.5 37.5 45.8 L41 44.5 L59 44.5 L62.5 45.8 Q66 46.5 67.2 45 L70 32.5 L68 26 L69.5 23.2 Q50 20.5 30.5 23.2 Z" fill="#F0E0BC" stroke="#8B8178" strokeWidth="0.65" />
              {/* chest pocket line (AGBADA detail) */}
              <path d="M41 34 L41 38 L45 38 L45 34" fill="none" stroke="#8B8178" strokeWidth="0.3" opacity="0.5" />
            </>
          )}

          {/* Arms — with armhole definition (Image 2 ARM HOLE) */}
          {/* Left arm */}
          <path d={isFemale ? "M30.5 24.5 L14.5 39 L11.5 55 L13.5 57.5 L17.5 56 L28.5 33 Z" : "M30 23.8 L13 39.5 L10 57 L13.2 58.5 L18 56.5 L29 32.8 Z"} fill={isFemale?"#F6ECD2":"#F0E0BC"} stroke="#8B8178" strokeWidth="0.55" />
          {/* Right arm */}
          <path d={isFemale ? "M69.5 24.5 L85.5 39 L88.5 55 L86.5 57.5 L82.5 56 L71.5 33 Z" : "M70 23.8 L87 39.5 L90 57 L86.8 58.5 L82 56.5 L71 32.8 Z"} fill={isFemale?"#F6ECD2":"#F0E0BC"} stroke="#8B8178" strokeWidth="0.55" />
          {/* armhole arc */}
          <path d={isFemale ? "M30.2 28 C28.5 30 27 32 27.5 34.5" : "M30.5 27.5 C27.8 29.5 26.2 31.5 26.5 35"} fill="none" stroke="#C6A15B" strokeWidth="0.45" strokeDasharray="1 1" />
          <path d={isFemale ? "M69.8 28 C71.5 30 73 32 72.5 34.5" : "M69.5 27.5 C72.2 29.5 73.8 31.5 73.5 35"} fill="none" stroke="#C6A15B" strokeWidth="0.45" strokeDasharray="1 1" />
          {/* sleeve line */}
          <line x1={isFemale? "18" : "15"} y1="38" x2={isFemale? "25" : "22"} y2="45" stroke="#8B8178" strokeWidth="0.35" opacity="0.6" />

          {/* Lower torso — hip to thigh / LAB */}
          <path d={isFemale ? "M37 45.5 L63 45.5 L65 58 L61.5 61.5 L38.5 61.5 L35 58 Z" : "M38 45.5 L62 45.5 L63.2 58.5 L60.5 61.8 L39.5 61.8 L36.8 58.5 Z"} fill={isFemale?"#EADCC0":"#E5D8B8"} stroke="#8B8178" strokeWidth="0.5" />

          {/* Legs — trouser draped (Image 2 TROUSER) */}
          <path d={isFemale ? "M38.8 61.5 L45.5 92 L44.2 100 L38.5 100.5 L36.2 60.5 Z" : "M39.8 61.8 L46 92.5 L44.5 100.2 L38.2 100.5 L36 61 Z"} fill={isFemale?"#F6ECD2":"#F0E0BC"} stroke="#8B8178" strokeWidth="0.5" />
          <path d={isFemale ? "M61.2 61.5 L63.8 60.5 L62 100.5 L56.2 100 L54.5 92 Z" : "M60.2 61.8 L64 61 L62 100.5 L55.5 100.2 L54 92.5 Z"} fill={isFemale?"#F6ECD2":"#F0E0BC"} stroke="#8B8178" strokeWidth="0.5" />
          {/* inseam line */}
          <line x1="50" y1="61.5" x2="50" y2="92" stroke="#C6A15B" strokeWidth="0.3" strokeDasharray="1 1.2" opacity="0.6" />
          {/* outseam */}
          <path d={isFemale ? "M38.2 61.5 L38.2 100" : "M39.5 61.8 L39.5 100.2"} fill="none" stroke="#8B8178" strokeWidth="0.35" strokeDasharray="1.2 1.2" opacity="0.8" />

          {/* Ankle detail */}
          <ellipse cx="42" cy="99.5" rx="3.5" ry="1.2" fill="#D9C7A5" stroke="#8B8178" strokeWidth="0.4" opacity="0.6" />
          <ellipse cx="58" cy="99.5" rx="3.5" ry="1.2" fill="#D9C7A5" stroke="#8B8178" strokeWidth="0.4" opacity="0.6" />

          {/* Back view differentiation — center seam */}
          {view==="back" && (
            <>
              <line x1="50" y1="24" x2="50" y2="61" stroke="#C6A15B" strokeWidth="0.4" strokeDasharray="1.2 1.2" />
              <path d="M34 28 Q50 32 66 28" fill="none" stroke="#C6A15B" strokeWidth="0.45" />
              <text x="50" y="20" textAnchor="middle" fontSize="2.8" fill="#6B5B4F">BACK</text>
            </>
          )}
          {view==="front" && <text x="50" y="20" textAnchor="middle" fontSize="2.8" fill="#6B5B4F">FRONT</text>}
        </svg>

        {/* Hotspots — interactive */}
        {filtered.map(h=>{
          const val = values[h.key];
          const isSelected = selectedKey===h.key;
          const hasVal = val!=null && !isNaN(val as number);
          return (
            <button
              key={`${h.key}-${h.x}-${h.y}`}
              onClick={()=>onSelect(h.key)}
              aria-label={`${h.labelEn} ${val?`: ${val}`:""}`}
              title={`${h.labelEn} (${h.labelHa})`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all
                ${isSelected ? "bg-burgundy text-white border-burgundy scale-110 shadow-gold z-10" : hasVal ? "bg-emeraldDeep text-white border-emeraldDeep shadow" : "bg-white/95 text-midnight border-gold hover:bg-gold/20 hover:scale-105"}
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}
              style={{ left: `${h.x}%`, top: `${h.y}%`, width: "21px", height: "21px" }}
            >
              {hasVal ? "✓" : "+"}
            </button>
          );
        })}

        {/* Vertical garment height badges */}
        <div className="absolute left-1 top-[22%] -translate-y-1/2 bg-midnight text-white text-[7px] px-1 py-0.5 rounded-full rotate-0 hidden md:flex">{values["shirt_length"] ? `${values["shirt_length"]} • Shirt/Agbada` : "Shirt length"}</div>
        <div className="absolute right-1 top-[52%] bg-midnight text-white text-[7px] px-1 py-0.5 rounded-full hidden md:flex">{values["trouser_length"] ? `${values["trouser_length"]} • Trouser` : "Trouser"}</div>

        {/* Legend */}
        <div className="absolute bottom-1 left-1 right-1 flex gap-1 text-[8px] justify-center flex-wrap">
          <span className="px-1.5 py-0.5 rounded-full bg-white/95 border shadow">✓ recorded</span>
          <span className="px-1.5 py-0.5 rounded-full bg-burgundy text-white shadow">● selected</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/95 border">+ empty</span>
          <span className="px-1.5 py-0.5 rounded-full bg-champagne border">— shirt/trouser guides</span>
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <div className="text-[10px] text-taupe">Tap body part • Shirt/Trouser vertical guides mirror Agbada sheet (30" / 28")</div>
        <div className="text-[10px] text-taupe">{filtered.length} points • {view}</div>
      </div>
    </div>
  );
}
