import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const defs = [
  { key:"neck", labelEn:"Neck", labelHa:"Wuya", category:"upper_body", sortOrder:1, helpEn:"Around the base of the neck", helpHa:"Kewaye wuyan" },
  { key:"shoulder", labelEn:"Shoulder width", labelHa:"Fadin kafada", category:"upper_body", sortOrder:2 },
  { key:"chest", labelEn:"Chest/Bust", labelHa:"Ƙirji", category:"upper_body", sortOrder:3 },
  { key:"upper_chest", labelEn:"Upper chest", labelHa:"Ƙasan ƙirji", category:"upper_body", sortOrder:4 },
  { key:"under_bust", labelEn:"Under bust", labelHa:"Ƙarƙashin ƙirji", category:"upper_body", sortOrder:5, gender:"FEMALE" },
  { key:"armhole", labelEn:"Armhole", labelHa:"Kuhun hannu", category:"upper_body", sortOrder:6 },
  { key:"bicep", labelEn:"Bicep", labelHa:"Tsoka", category:"upper_body", sortOrder:7 },
  { key:"elbow", labelEn:"Elbow", labelHa:"Gwiwar hannu", category:"upper_body", sortOrder:8 },
  { key:"wrist", labelEn:"Wrist", labelHa:"Wuyan hannu", category:"upper_body", sortOrder:9 },
  { key:"sleeve_length", labelEn:"Sleeve length", labelHa:"Tsawon hannu", category:"upper_body", sortOrder:10 },
  { key:"back_width", labelEn:"Back width", labelHa:"Fadin baya", category:"upper_body", sortOrder:11 },
  { key:"front_length", labelEn:"Front length", labelHa:"Tsawon gaba", category:"upper_body", sortOrder:12 },
  { key:"back_length", labelEn:"Back length", labelHa:"Tsawon baya", category:"upper_body", sortOrder:13 },
  { key:"waist", labelEn:"Waist", labelHa:"Kugu", category:"waist_torso", sortOrder:14 },
  { key:"hip", labelEn:"Hip", labelHa:"Kugu na ƙasa", category:"waist_torso", sortOrder:15 },
  { key:"full_hip", labelEn:"Full hip", labelHa:"Cikakken kugu", category:"waist_torso", sortOrder:16 },
  { key:"thigh", labelEn:"Thigh", labelHa:"Cinye", category:"lower_body", sortOrder:17 },
  { key:"knee", labelEn:"Knee", labelHa:"Gwiwa", category:"lower_body", sortOrder:18 },
  { key:"calf", labelEn:"Calf", labelHa:"Ƙaramar ƙafa", category:"lower_body", sortOrder:19 },
  { key:"inseam", labelEn:"Inseam", labelHa:"Tsawon ciki", category:"lower_body", sortOrder:20 },
  { key:"outseam", labelEn:"Outseam", labelHa:"Tsawon waje", category:"lower_body", sortOrder:21 },
  { key:"trouser_length", labelEn:"Trouser length", labelHa:"Tsawon wando", category:"lower_body", sortOrder:22 },
  { key:"full_length", labelEn:"Full body length", labelHa:"Tsawon jiki", category:"other", sortOrder:23 },
  { key:"dress_length", labelEn:"Dress length", labelHa:"Tsawon riga", category:"other", sortOrder:24 },
  { key:"shoulder_to_waist", labelEn:"Shoulder to waist", labelHa:"Kafada zuwa kugu", category:"other", sortOrder:25 },
];

export async function seedMeasurementDefinitions() {
  for (const d of defs) {
    await prisma.measurementDefinition.upsert({ where:{ key:d.key }, update:{ labelEn:d.labelEn, labelHa:d.labelHa }, create:{ key:d.key, labelEn:d.labelEn, labelHa:d.labelHa, category:d.category, sortOrder:d.sortOrder, helpEn:(d as any).helpEn, helpHa:(d as any).helpHa, gender: (d as any).gender || undefined } });
  }
  console.log(`[seed] ${defs.length} measurement definitions`);
}

if (require.main===module) seedMeasurementDefinitions().then(()=>prisma.$disconnect());
