import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { AdminPayoutQueue } from "@/components/payments/AdminPayoutQueue";

export default async function AdminPayoutsPage() {
  await requireRole(["ADMIN"]);
  return <div className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-2xl">Payout approvals</h1><p className="text-sm text-muted-foreground">Review ledger-reserved seller requests; no transfer is initiated before two distinct administrators approve.</p></div><Link href="/admin/finance" className="text-sm underline">Finance controls</Link></div>
    <AdminPayoutQueue />
  </div>;
}
