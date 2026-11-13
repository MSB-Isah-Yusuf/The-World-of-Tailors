"use client";
import * as React from "react";

export type BodyTemplate = "MALE" | "FEMALE";
export type Hotspot = { key:string; labelEn:string; labelHa:string; x:number; y:number; view:"front"|"back"; group?: string; priority?: number };

// PRIORITY ORDER requested: 1 shoulder, 2 neck, 3 arm, 4 chest/bust, 5 shirt length, 6 waist, 7 trouser length
// DESIGN: second image (Agbada dark silhouette) + first image interactive guides (Height, Hat, Crown to cuff, Back Length, Inseam/Outseam)
export const MEASUREMENT_HOTSPOTS: Hotspot[] = [
  // ── PRIORITY 1-7 (user specified order) ──
  { key:"shoulder", labelEn:"Shoulder", labelHa:"Kafada (13.5)", x:50, y:22, view:"front", group:"priority", priority:1 },
  { key:"neck", labelEn:"Neck", labelHa:"Wuya (11)", x:67, y:16.5, view:"front", group:"priority", priority:2 },
  { key:"arm", labelEn:"Arm — Crown to cuff + Sleeve", labelHa:"Hannu — armhole + sleeve (16)", x:18, y:32, view:"front", group:"priority", priority:3 },
  { key:"chest", labelEn:"Chest / Bust", labelHa:"Ƙirji (16)", x:50, y:30.5, view:"front", group:"priority", priority:4 },
  { key:"shirt_length", labelEn:"Shirt / Kaftan length", labelHa:"Tsawon riga SHIRT (30)", x:8, y:50, view:"front", group:"priority", priority:5 },
  { key:"waist", labelEn:"Waist", labelHa:"Kugu", x:50, y:44.5, view:"front", group:"priority", priority:6 },
  { key:"trouser_length", labelEn:"Trouser length", labelHa:"Tsawon wando TROUSER (28)", x:92, y:66, view:"front", group:"priority", priority:7 },
  // ── Secondary from both images ──
  { key:"armhole", labelEn:"Armhole", labelHa:"Kuhun hannu", x:22.5, y:31, view:"front", priority:8 },
  { key:"sleeve_length", labelEn:"Sleeve length", labelHa:"Tsawon hannu", x:32, y:42, view:"front", priority:8 },
  { key:"height", labelEn:"Height (full)", labelHa:"Tsayi gabaɗaya", x:3.5, y:52, view:"front", group:"vertical", priority:9 },
  { key:"hat_size", labelEn:"Hat size", labelHa:"Girman hula", x:50, y:8, view:"front", priority:9 },
  { key:"front_length", labelEn:"Front length", labelHa:"Tsawon gaba", x:50, y:38, view:"front", priority:9 },
  { key:"back_length", labelEn:"Back Length (centre back)", labelHa:"Bayan tsayi", x:50, y:28, view:"back", priority:9 },
  { key:"hip", labelEn:"Hip / widest point", labelHa:"Kugu na ƙasa", x:50, y:52.5, view:"front", priority:10 },
  { key:"waist_to_knee", labelEn:"Waist to knee", labelHa:"Tsawon kugu zuwa gwiwa", x:58, y:62, view:"front", priority:10 },
  { key:"inseam", labelEn:"Inseam", labelHa:"Tsawon ciki", x:46, y:70, view:"front", priority:10 },
  { key:"outseam", labelEn:"Outseam", labelHa:"Tsawon waje", x:54, y:70, view:"front", priority:10 },
  { key:"thigh", labelEn:"Thigh / Lab", labelHa:"Lab", x:36, y:60, view:"front", priority:11 },
  { key:"stamina", labelEn:"Stamina", labelHa:"Stamina", x:64, y:72, view:"front", priority:11 },
  { key:"knee", labelEn:"Knee", labelHa:"Gwiwa", x:36.5, y:73, view:"front", priority:11 },
  { key:"calf", labelEn:"Calf", labelHa:"Ƙafa", x:36, y:81, view:"front", priority:11 },
  { key:"ankle", labelEn:"Ankle", labelHa:"Idon sawu (6)", x:50, y:97, view:"front", priority:11 },
  { key:"agbada_length", labelEn:"Agbada full length", labelHa:"Tsawon agbada", x:8, y:66, view:"front", priority:12 },
  { key:"bicep", labelEn:"Bicep", labelHa:"Tsoka", x:16, y:36, view:"front", priority:12 },
  { key:"wrist", labelEn:"Wrist / Links", labelHa:"Links", x:11, y:58, view:"front", priority:12 },
  { key:"elbow", labelEn:"Elbow", labelHa:"Gwiwar hannu", x:14, y:46, view:"front", priority:12 },
  { key:"dress_length", labelEn:"Dress length", labelHa:"Tsawon riga", x:50, y:65, view:"front", priority:12 },
  { key:"full_length", labelEn:"Full body length", labelHa:"Tsawon jiki", x:62, y:52, view:"front", priority:12 },
];

export function MannequinSVG({ template, selectedKey, onSelect, values, view, setView }: { template: BodyTemplate; selectedKey?: string; onSelect: (k:string)=>void; values: Record<string,number|undefined>; view:"front"|"back"; setView:(v:"front"|"back")=>void }) {
  const filtered = MEASUREMENT_HOTSPOTS.filter(h=> h.view===view);
  const isFemale = template==="FEMALE";
  // priority first 7 for visual emphasis
  const priorityKeys = new Set(["shoulder","neck","arm","chest","shirt_length","waist","trouser_length"]);
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

      <div className="relative aspect-[3/5.6] w-full max-w-[360px] mx-auto bg-gradient-to-b from-ivory to-champagne/20 dark:from-midnight dark:to-navy rounded-xl overflow-hidden border">
        <svg viewBox="0 0 100 168" className="absolute inset-0 w-full h-full" role="img" aria-label={`${template} mannequin — priority shoulder, neck, arm, chest/bust, shirt length, waist, trouser length`}>
          {/* ── Guides from FIRST image (line drawing) — adapted to dark silhouette ── */}
          {/* Height full vertical leftmost */}
          <line x1="3.2" y1="4" x2="3.2" y2="102" stroke="#8B8178" strokeWidth="0.45" strokeDasharray="1.4 1.4" />
          <path d="M1.5 4 L3.2 2.2 L4.9 4" fill="none" stroke="#8B8178" strokeWidth="0.65" />
          <path d="M1.5 102 L3.2 103.8 L4.9 102" fill="none" stroke="#8B8178" strokeWidth="0.65" />
          <text x="3.2" y="108" textAnchor="middle" fontSize="3" fill="#6B5B4F" fontWeight="600">HEIGHT</text>

          {/* Shirt length left side (from AGBADA second image: SHIRT 30) */}
          <line x1="7" y1="22.5" x2="7" y2="80" stroke="#8B8178" strokeWidth="0.5" strokeDasharray="1.2 1.2" />
          <path d="M5.2 22.5 L7 20.7 L8.8 22.5" fill="none" stroke="#B9975B" strokeWidth="0.65" />
          <path d="M5.2 80 L7 81.8 L8.8 80" fill="none" stroke="#B9975B" strokeWidth="0.65" />
          <text x="7" y="15.5" textAnchor="middle" fontSize="3.1" fill="#8B5A2B" fontWeight="700">SHIRT 30</text>

          {/* Trouser length right side (TROUSER 28) */}
          <line x1="93.5" y1="45" x2="93.5" y2="99.5" stroke="#8B8178" strokeWidth="0.5" strokeDasharray="1.2 1.2" />
          <path d="M91.7 45 L93.5 43.2 L95.3 45" fill="none" stroke="#B9975B" strokeWidth="0.65" />
          <path d="M91.7 99.5 L93.5 101.3 L95.3 99.5" fill="none" stroke="#B9975B" strokeWidth="0.65" />
          <text x="93.5" y="115" textAnchor="middle" fontSize="3.1" fill="#8B5A2B" fontWeight="700">TROUSER 28</text>

          {/* Back Length centre back (first image) */}
          {view==="back" && (
            <>
              <line x1="50" y1="14" x2="50" y2="45" stroke="#B9975B" strokeWidth="0.5" strokeDasharray="1.3 1.3" />
              <circle cx="50" cy="14" r="0.9" fill="#B9975B" />
              <circle cx="50" cy="45" r="0.9" fill="#B9975B" />
              <text x="54" y="30" fontSize="2.8" fill="#6B5B4F">Back Length</text>
            </>
          )}

          {/* Crown to cuff diagonal (first image) — front view */}
          {view==="front" && (
            <>
              <path d="M50 7.5 C 52 10, 58 14, 68 24, 78 38, 86 54, 88 57" fill="none" stroke="#B9975B" strokeWidth="0.45" strokeDasharray="1.2 1.2" />
              <circle cx="50" cy="7.5" r="0.8" fill="#B9975B" />
              <circle cx="88" cy="57" r="0.8" fill="#B9975B" />
              <text x="74" y="22" fontSize="2.6" fill="#6B5B4F">Crown to cuff</text>
            </>
          )}

          {/* Horizontal chest/bust, waist, hip dotted (both images) */}
          <line x1="31" y1="30.5" x2="69" y2="30.5" stroke="#C6A15B" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.95" />
          <line x1="34" y1="44.5" x2="66" y2="44.5" stroke="#C6A15B" strokeWidth="0.4" strokeDasharray="1.5 1.5" opacity="0.95" />
          <line x1="32" y1="52.5" x2="68" y2="52.5" stroke="#C6A15B" strokeWidth="0.35" strokeDasharray="1.4 1.4" opacity="0.9" />

          {/* Inseam / Outseam / Waist to knee (first image) */}
          <line x1="50" y1="62" x2="43" y2="97" stroke="#B9975B" strokeWidth="0.35" strokeDasharray="1.1 1.1" opacity="0.8" />
          <text x="42" y="82" fontSize="2.5" fill="#6B5B4F" textAnchor="middle">Inseam</text>
          <line x1="61" y1="45" x2="61" y2="99" stroke="#8B8178" strokeWidth="0.35" strokeDasharray="1.2 1.2" opacity="0.9" />
          <text x="64.5" y="75" fontSize="2.5" fill="#6B5B4F">Outseam</text>
          <line x1="54" y1="45" x2="54" y2="62" stroke="#C6A15B" strokeWidth="0.35" strokeDasharray="1 1" opacity="0.7" />
          <text x="56.5" y="55" fontSize="2.3" fill="#6B5B4F">Waist→knee</text>

          {/* ── BODY — DARK silhouette like SECOND image (Agbada) ── */}
          {/* Head — hat size ellipse dotted */}
          <ellipse cx="50" cy="9.8" rx="7.2" ry="6" fill="none" stroke="#B9975B" strokeWidth="0.4" strokeDasharray="1.2 1.2" />
          <text x="28" y="7" fontSize="2.6" fill="#6B5B4F">Hat size</text>
          <ellipse cx="50" cy="11.5" rx="6.6" ry="7.8" fill="#2F2E2C" stroke="#1A1A1A" strokeWidth="0.7" />
          <ellipse cx="50" cy="12.6" rx="4.2" ry="4.8" fill="#3A3935" opacity="0.9" />
          {/* neck — dotted NECK 11 */}
          <ellipse cx="50" cy="16.8" rx="5.2" ry="1.3" fill="none" stroke="#E8D8BB" strokeWidth="0.4" strokeDasharray="0.8 0.8" />
          <text x="68" y="16.8" fontSize="2.7" fill="#E8D8BB" fontWeight="600">neck</text>

          {/* Torso dark */}
          {isFemale ? (
            <path d="M35.5 23.2 C33 24.2 31.5 26 30 28.8 L29 32.2 L32 45 Q34 47 37.5 45.5 L40.5 44 Q43 41.2 50 41.2 Q57 41.2 59.5 44 L62.5 45.5 Q66 47 68 45 L71 32.2 C70 28.8 68.5 24.2 65.5 23.2 L58.5 24 Q50 25.6 41.5 24 Z" fill="#2F2E2C" stroke="#1A1A1A" strokeWidth="0.7" />
          ) : (
            <path d="M29.5 23.2 L31.5 26.2 L29 32.8 L32 45.5 Q33.8 47 37.5 46.2 L41.5 44.8 L58.5 44.8 L62.5 46.2 Q66.2 47 68 45.5 L71 32.8 L68.5 26.2 L70.5 23.2 Q50 20.2 29.5 23.2 Z" fill="#2F2E2C" stroke="#1A1A1A" strokeWidth="0.7" />
          )}
          {/* chest/bust horizontal emphasis */}
          <path d="M30.5 30.5 Q50 32.5 69.5 30.5" fill="none" stroke="#E8D8BB" strokeWidth="0.35" opacity="0.6" />
          {isFemale && <path d="M39 43.2 Q50 42 61 43.2" fill="none" stroke="#8B8178" strokeWidth="0.35" opacity="0.7" />}

          {/* Arms dark */}
          <path d={isFemale ? "M30 24.8 L13.5 39.5 L10.5 55.5 L13 58 L17 56.2 L28.5 33.5 Z" : "M29.5 23.8 L12.5 39.8 L9.2 57.2 L12.5 58.8 L17.5 56.8 L28.8 32.8 Z"} fill="#2F2E2C" stroke="#1A1A1A" strokeWidth="0.6" />
          <path d={isFemale ? "M70 24.8 L86.5 39.5 L89.5 55.5 L87 58 L83 56.2 L71.5 33.5 Z" : "M70.5 23.8 L87.5 39.8 L90.8 57.2 L87.5 58.8 L82.5 56.8 L71.2 32.8 Z"} fill="#2F2E2C" stroke="#1A1A1A" strokeWidth="0.6" />
          {/* armhole highlight */}
          <path d={isFemale ? "M30 27.5 C27.5 29.5 26 31.5 26.8 35" : "M29.5 27 C27 29 25.5 31.5 25.8 35"} fill="none" stroke="#E8D8BB" strokeWidth="0.4" opacity="0.8" />
          <path d={isFemale ? "M70 27.5 C72.5 29.5 74 31.5 73.2 35" : "M70.5 27 C73 29 74.5 31.5 74.2 35"} fill="none" stroke="#E8D8BB" strokeWidth="0.4" opacity="0.8" />

          {/* Hip/thigh dark */}
          <path d={isFemale ? "M37 45.5 L63 45.5 L65.2 58.2 L61.8 61.8 L38.2 61.8 L34.8 58.2 Z" : "M37 45.8 L63 45.8 L64 58.8 L61 62 L39 62 L36 58.8 Z"} fill="#3A3935" stroke="#1A1A1A" strokeWidth="0.55" />
          {/* Legs dark */}
          <path d={isFemale ? "M38.5 61.8 L45.2 91.5 L43.5 100.2 L37.5 100.8 L35.5 61.2 Z" : "M39.2 62 L45.5 92 L43.5 100.5 L37.2 100.8 L35.5 61.2 Z"} fill="#2F2E2C" stroke="#1A1A1A" strokeWidth="0.6" />
          <path d={isFemale ? "M61.5 61.8 L64.5 61.2 L61.5 100.8 L56 100.2 L54.8 91.5 Z" : "M60.8 62 L64.5 61.2 L61.5 100.8 L55.8 100.5 L54.5 92 Z"} fill="#2F2E2C" stroke="#1A1A1A" strokeWidth="0.6" />
          {/* ankle points */}
          <circle cx="41.5" cy="99.6" r="1.1" fill="#E8D8BB" stroke="#B9975B" strokeWidth="0.4" />
          <circle cx="58.5" cy="99.6" r="1.1" fill="#E8D8BB" stroke="#B9975B" strokeWidth="0.4" />

          {/* View label */}
          {view==="back" ? <text x="50" y="19.5" textAnchor="middle" fontSize="2.8" fill="#E8D8BB" fontWeight="700">BACK</text> : <text x="50" y="19.5" textAnchor="middle" fontSize="2.8" fill="#E8D8BB" fontWeight="700">FRONT</text>}
        </svg>

        {/* Hotspots — priority 1-7 gold emphasis, rest muted */}
        {filtered.map(h=>{
          const val = values[h.key];
          const isSelected = selectedKey===h.key;
          const hasVal = val!=null && !isNaN(val as number);
          const isPriority = priorityKeys.has(h.key);
          return (
            <button
              key={`${h.key}-${h.x}-${h.y}`}
              onClick={()=>onSelect(h.key)}
              aria-label={`${h.labelEn} ${val?`: ${val}`:""}`}
              title={`${h.labelEn} (${h.labelHa})`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all
                ${isSelected ? "bg-burgundy text-white border-burgundy scale-110 shadow-gold z-10" : hasVal ? "bg-emeraldDeep text-white border-emeraldDeep shadow" : isPriority ? "bg-gold text-midnight border-gold hover:bg-gold/80 shadow" : "bg-white/95 text-midnight border-gold/60 hover:bg-gold/20"}
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}
              style={{ left: `${h.x}%`, top: `${h.y}%`, width: isPriority ? "22px" : "18px", height: isPriority ? "22px" : "18px" }}
            >
              {hasVal ? "✓" : isPriority ? "●" : "+"}
            </button>
          );
        })}

        {/* Priority badges */}
        <div className="absolute left-0.5 top-[22%] bg-gold text-midnight text-[6px] font-bold px-1 py-0.5 rounded-full hidden md:flex">1 SHOULDER</div>
        <div className="absolute right-0.5 top-[16%] bg-gold text-midnight text-[6px] font-bold px-1 py-0.5 rounded-full hidden md:flex">2 NECK</div>
        <div className="absolute left-0.5 top-[31%] bg-gold text-midnight text-[6px] font-bold px-1 py-0.5 rounded-full hidden md:flex">3 ARM</div>

        {/* Legend */}
        <div className="absolute bottom-1 left-1 right-1 flex gap-1 text-[7px] justify-center flex-wrap">
          <span className="px-1.5 py-0.5 rounded-full bg-gold text-midnight font-bold">● priority 1-7</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/95 border">+ other</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emeraldDeep text-white">✓ recorded</span>
          <span className="px-1.5 py-0.5 rounded-full bg-burgundy text-white">● selected</span>
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <div className="text-[10px] text-taupe">Order: <b>1 Shoulder → 2 Neck → 3 Arm → 4 Chest/Bust → 5 Shirt (30) → 6 Waist → 7 Trouser (28)</b> • Dark Agbada silhouette • First-image guides (Height/Hat/Crown-to-cuff/Back Length)</div>
        <div className="text-[10px] text-taupe">{filtered.length} pts • {view}</div>
      </div>
    </div>
  );
}
