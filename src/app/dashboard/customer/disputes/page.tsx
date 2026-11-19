import { requireRole } from "@/lib/rbac";
import { CustomerFinanceHistory } from "@/components/payments/CustomerFinanceHistory";

export default async function CustomerDisputesPage() {
  await requireRole(["CUSTOMER"]);
  return <div className="space-y-4"><div><h1 className="font-display text-2xl">Payment disputes</h1><p className="text-sm text-muted-foreground">Track your payment issues and administrator resolutions.</p></div><CustomerFinanceHistory kind="disputes" /></div>;
}
