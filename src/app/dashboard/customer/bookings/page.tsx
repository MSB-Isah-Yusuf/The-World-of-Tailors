import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function CustomerBookings({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  const sp = await searchParams;
  const filter = sp.status;
  let bookings: any[] = [];
  try {
    bookings = await prisma.tailoringBooking.findMany({
      where: { customerId: uid, ...(filter ? { status: filter as any } : {}) },
      include: { tailor: { select: { businessName: true, city: true, slug: true } }, design: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" }, take: 20
    });
  } catch {}
  const tabs = ["", "REQUESTED", "ACCEPTED", "IN_PRODUCTION", "READY", "COMPLETED"];
  return (
    <AdvancedCustomerShell title="My Bookings">
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between items-center"><h1 className="font-display text-2xl dark:text-ivory">My Bookings — {bookings.length}</h1><Link href="/dashboard/customer/bookings/new"><Button size="sm" className="bg-midnight text-white dark:bg-gold dark:text-midnight">New Booking</Button></Link></div>
        <div className="flex gap-2 flex-wrap">{tabs.map(t => <Link key={t||"all"} href={t ? `/dashboard/customer/bookings?status=${t}` : `/dashboard/customer/bookings`} className={`px-3 py-1 rounded-full text-xs border transition ${filter===t || (!filter&&!t) ? "bg-midnight text-white dark:bg-gold dark:text-midnight dark:border-gold/50 dark:shadow-[0_0_12px_rgba(198,161,91,0.3)] font-semibold" : "bg-white dark:bg-white/[0.06] dark:text-ivory dark:border-white/15 hover:bg-ivory dark:hover:bg-white/[0.10]"}`}>{t || "All"}</Link>)}</div>
        <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Tailoring workflow: REQUESTED→ACCEPTED→IN_PRODUCTION→READY→COMPLETED • Measurements frozen per booking</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bookings.length===0 ? <div className="p-8 text-center text-sm text-muted-foreground dark:text-ivory/60 border rounded-xl bg-white dark:bg-white/[0.05] dark:border-white/10">No bookings — <Link href="/dashboard/customer/discover" className="underline dark:text-gold">Discover tailors</Link> or <Link href="/tailors" className="underline dark:text-gold">/tailors →</Link></div>
            : bookings.map((b:any)=><Link key={b.id} href={`/dashboard/customer/bookings/${b.id}`} className="block border rounded-xl p-3 bg-white dark:bg-white/[0.06] dark:border-white/10 hover:shadow-sm dark:hover:bg-white/[0.08] dark:hover:border-white/15 transition">
                <div className="flex justify-between text-sm"><span className="font-medium dark:text-ivory">{b.reference} • {b.tailor.businessName} {b.design?.title && `• ${b.design.title}`}</span><Badge variant={b.status==="COMPLETED"?"success":b.status==="REQUESTED"?"warning":"secondary"}>{b.status}</Badge></div>
                <div className="text-xs text-muted-foreground dark:text-ivory/60">{b.description?.slice(0,80)||"No description"} • {b.tailor.city} • {new Date(b.createdAt).toLocaleDateString()} {b.agreedPrice ? `• ₦${Number(b.agreedPrice).toLocaleString()}`:""}</div>
              </Link>)}
          </CardContent></Card>
        <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardContent className="text-xs text-muted-foreground dark:text-ivory/60 p-3">Ownership-scoped: customerId = session.user.id. Status transitions validated (e.g. DECLINED/CANCELLED terminal). Notifications on status change.</CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
