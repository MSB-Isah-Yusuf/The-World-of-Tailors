// Master measurement list — 25 seed definitions + Agbada extras (shirt/agbada/trouser verticals)
// Used by booking customer form + tailor measurement form — single source of truth
export type MeasurementField = { key:string; labelEn:string; labelHa:string; category:string; required?:boolean; placeholder?:string };

export const MEASUREMENT_FIELDS: MeasurementField[] = [
  // Required six per master spec (simplified dialog)
  { key:"shoulder", labelEn:"Shoulder", labelHa:"Fadin kafada", category:"upper_body", required:true, placeholder:"13.5" },
  { key:"sleeve_length", labelEn:"Sleeve / Arm Length", labelHa:"Tsawon hannu", category:"upper_body", required:true, placeholder:"16" },
  { key:"chest", labelEn:"Chest", labelHa:"Ƙirji", category:"upper_body", required:true, placeholder:"42" },
  { key:"shirt_length", labelEn:"Shirt", labelHa:"Tsawon riga SHIRT", category:"other", required:true, placeholder:"30" },
  { key:"trouser_length", labelEn:"Trouser", labelHa:"Tsawon wando TROUSER", category:"lower_body", required:true, placeholder:"28" },
  { key:"ankle", labelEn:"Ankle", labelHa:"Idon sawu", category:"lower_body", required:true, placeholder:"6" },
  // Optional — all other fields (preserved, not required)
  { key:"neck", labelEn:"Neck (11)", labelHa:"Wuya", category:"upper_body", required:false, placeholder:"11" },
  { key:"armhole", labelEn:"Armhole", labelHa:"Kuhun hannu", category:"upper_body", required:false, placeholder:"18" },
  { key:"bicep", labelEn:"Bicep", labelHa:"Tsoka", category:"upper_body", required:false, placeholder:"12" },
  { key:"elbow", labelEn:"Elbow", labelHa:"Gwiwar hannu", category:"upper_body", required:false, placeholder:"10" },
  { key:"wrist", labelEn:"Wrist / Links", labelHa:"Wuyan hannu", category:"upper_body", required:false, placeholder:"7" },
  { key:"upper_chest", labelEn:"Upper chest", labelHa:"Ƙasan ƙirji", category:"upper_body", required:false, placeholder:"38" },
  { key:"under_bust", labelEn:"Under bust", labelHa:"Ƙarƙashin ƙirji", category:"upper_body", required:false, placeholder:"34" },
  { key:"back_width", labelEn:"Back width", labelHa:"Fadin baya", category:"upper_body", required:false, placeholder:"18" },
  { key:"front_length", labelEn:"Front length", labelHa:"Tsawon gaba", category:"upper_body", required:false, placeholder:"18" },
  { key:"back_length", labelEn:"Back length", labelHa:"Tsawon baya", category:"upper_body", required:false, placeholder:"18" },
  { key:"waist", labelEn:"Waist", labelHa:"Kugu", category:"waist_torso", required:false, placeholder:"36" },
  { key:"hip", labelEn:"Hip / Bottom widest (Kugu na ƙasa)", labelHa:"Cikakken kugu", category:"waist_torso", required:false, placeholder:"40" },
  { key:"full_hip", labelEn:"Full hip", labelHa:"Cikakken kwankwasa", category:"waist_torso", required:false, placeholder:"42" },
  { key:"shoulder_to_waist", labelEn:"Shoulder to waist", labelHa:"Kafada zuwa kugu", category:"waist_torso", required:false, placeholder:"18" },
  { key:"agbada_length", labelEn:"Agbada full length", labelHa:"Tsawon agbada", category:"other", required:false, placeholder:"42" },
  { key:"dress_length", labelEn:"Dress / Gown length", labelHa:"Tsawon riga", category:"other", required:false, placeholder:"40" },
  { key:"full_length", labelEn:"Full body length / Height", labelHa:"Tsawon jiki gabaɗaya", category:"other", required:false, placeholder:"68" },
  { key:"thigh", labelEn:"Thigh / Lab", labelHa:"Lab — Cinye", category:"lower_body", required:false, placeholder:"24" },
  { key:"knee", labelEn:"Knee / Stamina", labelHa:"Gwiwa / Stamina", category:"lower_body", required:false, placeholder:"16" },
  { key:"calf", labelEn:"Calf", labelHa:"Ƙaramar ƙafa", category:"lower_body", required:false, placeholder:"14" },
  { key:"inseam", labelEn:"Inseam", labelHa:"Tsawon ciki", category:"lower_body", required:false, placeholder:"30" },
  { key:"outseam", labelEn:"Outseam", labelHa:"Tsawon waje", category:"lower_body", required:false, placeholder:"32" },
  { key:"hat_size", labelEn:"Hat size", labelHa:"Girman hula", category:"other", required:false, placeholder:"22" },
];

export const PRIORITY_KEYS = ["shoulder","sleeve_length","chest","shirt_length","trouser_length","ankle"];

export function getField(key:string){ return MEASUREMENT_FIELDS.find(f=>f.key===key); }
