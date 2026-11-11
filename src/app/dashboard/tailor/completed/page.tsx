import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
export default async function CompletedPage(){
  const session= await requireRole(["TAILOR"]);
  const profile= await prisma.tailorProfile.findUnique({ where:{ userId:(session.user as any).id } });
  let bookings:any[]=[]; try { bookings= await prisma.tailoringBooking.findMany({ where:{ tailorId:profile!.id, status:"COMPLETED" }, include:{ customer:{select:{name:true}}, design:{select:{title:true}} }, orderBy:{updatedAt:"desc"}, take:20 }); } catch{}
  return <AdvancedTailorShell title="Completed Orders"><div className="space-y-6"><h1 className="font-display text-2xl">Completed Orders</h1><p className="text-sm text-muted-foreground">Terminal state • Audit logged • Snapshot frozen</p><Card><CardHeader><CardTitle className="text-base">{bookings.length} completed • Archive preserves history</CardTitle></CardHeader><CardContent className="space-y-2">{bookings.length===0?<div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">No completed orders yet — advance READY → COMPLETED in <Link href="/dashboard/tailor/production" className="underline">Production</Link>.</div>: bookings.map((b:any)=><div key={b.id} className="flex justify-between border rounded-xl p-3 bg-white text-sm"><span>{b.reference} • {b.customer.name} • {b.design?.title||"Bespoke"}</span><span className="text-emeraldDeep">COMPLETED</span></div>)}</CardContent></Card></div></AdvancedTailorShell>;
}
