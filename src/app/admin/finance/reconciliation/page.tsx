import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { AdminReconciliationPanel } from "@/components/payments/AdminReconciliationPanel";

export default async function AdminReconciliationPage() {
  await requireRole(["ADMIN"]);
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-2xl">Paystack reconciliation</h1><p className="text-sm text-muted-foreground">Import provider statement rows and compare them with local verified charges, refunds and transfers.</p></div><Link href="/admin/finance" className="text-sm underline">Finance controls</Link></div><AdminReconciliationPanel /></div>;
}
