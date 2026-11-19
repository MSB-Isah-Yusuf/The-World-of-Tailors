import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { AdminRefundQueue } from "@/components/payments/AdminRefundQueue";

export default async function AdminRefundsPage() {
  await requireRole(["ADMIN"]);
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-2xl">Refund requests</h1><p className="text-sm text-muted-foreground">Customer-submitted requests, independent provider verification and immutable refund journals.</p></div><Link href="/admin/finance" className="text-sm underline">Finance controls</Link></div><AdminRefundQueue /></div>;
}
