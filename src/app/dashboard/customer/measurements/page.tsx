import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
export default async function CustomerMeasurements(){
  const session= await requireRole(["CUSTOMER"]);
  let profiles:any[]=[];
  try { profiles= await prisma.measurementProfile.findMany({ where:{ userId:(session.user as any).id }, include:{ values:true }, orderBy:{ updatedAt:"desc" } }); } catch {}
  return <AdvancedCustomerShell title="Measurements"><div className="space-y-6"><h1 className="font-display text-2xl">Your Measurement Profiles</h1><p className="text-sm text-muted-foreground">Read-only view of tailor-recorded measurements (with consent) + your own saved profiles. Walk-in records of other customers never visible.</p><Card><CardHeader><CardTitle className="text-base">{profiles.length} profiles • Consent-based access</CardTitle></CardHeader><CardContent className="space-y-3">{profiles.length===0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No measurements yet — tailors will record via mannequin after you book. You can also create a profile at booking.</div> : profiles.map((p:any)=><div key={p.id} className="border rounded-xl p-3 bg-white text-sm"><div className="font-medium flex justify-between"><span>{p.name} • {p.garmentType} • {p.bodyTemplate} • {p.unit}</span><span className="text-xs px-2 py-1 rounded-full bg-ivory border">{p.status} • {new Date(p.updatedAt).toLocaleDateString()}</span></div><div className="text-xs text-muted-foreground mt-1">{p.values.map((v:any)=> `${v.key}:${v.value}${v.unit}`).join(" • ") || "No values"}</div><div className="text-xs text-taupe mt-1">Snapshot preserved per booking — profile edits don't alter old orders.</div></div>)}</CardContent></Card></div></AdvancedCustomerShell>;
}
