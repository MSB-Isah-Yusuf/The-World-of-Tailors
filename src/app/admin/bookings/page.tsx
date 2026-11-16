import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string; q?: string }> }) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const status = sp?.status || "";
  const q = (sp?.q || "").toLowerCase().trim();
  const page = Math.max(1, parseInt(sp?.page || "1") || 1);
  const take = 20;
  let where: any = {};
  if (status) where.status = status as any;
  if (q) where.OR = [{ reference: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }];
  let bookings: any[] = [], total = 0, stats: any = {};
  try {
    total = await prisma.tailoringBooking.count({ where });
    bookings = await prisma.tailoringBooking.findMany({ where, include: { customer: { select: { name: true, email: true } }, tailor: { select: { businessName: true, slug: true } }, design: { select: { title: true } } }, orderBy: { updatedAt: "desc" }, skip: (page-1)*take, take });
    const groups: any[] = await (prisma.tailoringBooking as any).groupBy({ by: ["status"], _count: true });
    stats = Object.fromEntries(groups.map(g => [g.status, g._count]));
  } catch { bookings = []; }
  return (
    <div className="min-h-screen bg-ivory dark:bg-midnight p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl dark:text-ivory">Tailoring Bookings Oversight</h1><p className="text-sm text-muted-foreground dark:text-ivory/60">Inspect all bookings • No financial mutation without audit • Read-only for admin</p></div><Link href="/admin" className="text-sm underline dark:text-gold">← Admin</Link></div>
        <div className="flex flex-wrap gap-2 text-xs">{["", "REQUESTED","ACCEPTED","IN_PRODUCTION","READY","COMPLETED","DECLINED","CANCELLED","ON_HOLD"].map(s => <Link key={s||"all"} href={s?`/admin/bookings?status=${s}`:"/admin/bookings"} className={`px-3 py-1.5 rounded-full border transition ${status===s?"bg-midnight text-white dark:bg-gold dark:text-midnight dark:border-gold/50 font-semibold":"bg-white dark:bg-white/[0.06] dark:text-ivory dark:border-white/15"}`}>{s||"ALL"} {stats[s]?`(${stats[s]})`:""}</Link>)}<span className="text-xs text-muted-foreground dark:text-ivory/60 self-center ml-2">{total} bookings</span></div>
        <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardContent className="p-4">
          <form className="flex gap-2"><input name="q" defaultValue={sp?.q||""} placeholder="Search reference/description" className="h-9 rounded-xl border px-3 text-sm bg-white dark:bg-white/[0.06] dark:border-white/15 dark:text-ivory dark:placeholder:text-ivory/40 w-64"/><button className="px-4 h-9 rounded-full bg-midnight dark:bg-gold dark:text-midnight text-white text-xs">Search</button></form>
        </CardContent></Card>
        <Card className="dark:bg-white/[0.04] dark:border-white/10"><CardHeader><CardTitle className="text-sm dark:text-ivory">Bookings • {bookings.length} on page — admin cannot change status without documented op (future)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bookings.length===0 ? <div className="text-sm text-muted-foreground dark:text-ivory/60 p-6 text-center border rounded-xl bg-white dark:bg-white/[0.05] dark:border-white/10">No bookings for filter.</div> :
            bookings.map((b:any)=><div key={b.id} className="border rounded-xl p-3 bg-white dark:bg-white/[0.06] dark:border-white/10">
              <div className="flex justify-between gap-2"><span className="text-sm font-medium dark:text-ivory">{b.reference} • {b.tailor?.businessName} • {b.customer?.name} ({b.customer?.email}) <Badge variant={b.status==="COMPLETED"?"success":b.status==="REQUESTED"?"warning":"secondary"} className="ml-2">{b.status}</Badge></span><Badge variant={b.paymentStatus==="PAID"?"success":"muted"}>{b.paymentStatus}</Badge></div>
              <div className="text-xs text-muted-foreground dark:text-ivory/60">{b.design?.title||"Bespoke"} • ₦{b.agreedPrice?Number(b.agreedPrice).toLocaleString():"—"} • Est {b.estimatedCompletion? new Date(b.estimatedCompletion).toLocaleDateString():"TBD"} • Updated {new Date(b.updatedAt).toLocaleString()}</div>
              <div className="text-xs line-clamp-2 dark:text-ivory/80">{b.description?.slice(0,150)||"—"}</div>
            </div>)}
            <div className="flex gap-2 pt-2 text-xs">{page>1 && <Link href={`/admin/bookings?page=${page-1}${status?`&status=${status}`:""}`} className="px-3 py-1 rounded-full border bg-white dark:bg-white/[0.06] dark:text-ivory dark:border-white/15">← Prev</Link>}{bookings.length===take && <Link href={`/admin/bookings?page=${page+1}${status?`&status=${status}`:""}`} className="px-3 py-1 rounded-full border bg-white dark:bg-white/[0.06] dark:text-ivory dark:border-white/15">Next →</Link>}</div>
          </CardContent></Card>
      </div>
    </div>
  );
}
