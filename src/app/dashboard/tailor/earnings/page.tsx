import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
export default async function EarningsPage(){
  await requireRole(["TAILOR"]);
  const session= await (await import("@/lib/auth")).auth(); const profile= await prisma.tailorProfile.findUnique({ where:{ userId:(session!.user as any).id } });
  let bookings:any[]=[]; try { bookings= await prisma.tailoringBooking.findMany({ where:{ tailorId: profile!.id, paymentStatus:"PAID" }, select:{ agreedPrice:true, status:true } }); } catch{}
  const total = bookings.reduce((s,b)=> s+(b.agreedPrice||0),0);
  return <AdvancedTailorShell title="Earnings & Payments"><div className="space-y-6"><h1 className="font-display text-2xl">Earnings & Payments</h1><p className="text-sm text-muted-foreground">Paystack integration ready • Commission tracked via payments</p><div className="grid md:grid-cols-3 gap-4"><Card><CardHeader><CardTitle className="text-sm">Total Paid</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">₦{total.toLocaleString()}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">PAID bookings</CardTitle></CardHeader><CardContent><div className="text-xl font-semibold">{bookings.length}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Provider</CardTitle></CardHeader><CardContent><div className="text-sm">Paystack • Webhook at /api/webhooks/paystack (verified)</div></CardContent></Card></div><Card><CardContent className="text-xs text-muted-foreground p-4">Earnings derive from TailoringBooking.agreedPrice where paymentStatus=PAID. Payout schedule configured in admin. Taxes/fees itemized per booking.</CardContent></Card></div></AdvancedTailorShell>;
}
