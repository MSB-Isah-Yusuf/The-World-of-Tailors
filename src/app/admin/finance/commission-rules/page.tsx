import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { AdminCommissionRules } from "@/components/payments/AdminCommissionRules";

export default async function AdminCommissionRulesPage() {
  await requireRole(["ADMIN"]);
  return <div className="space-y-5"><div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-2xl">Commission rules</h1><p className="text-sm text-muted-foreground">Configure independent tailoring and fabric-seller rates. Past payment obligations are immutable.</p></div><Link href="/admin/finance" className="text-sm underline">Finance controls</Link></div><AdminCommissionRules /></div>;
}
