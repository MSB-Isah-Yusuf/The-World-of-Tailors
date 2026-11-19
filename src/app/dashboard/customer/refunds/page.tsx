import { requireRole } from "@/lib/rbac";
import { CustomerFinanceHistory } from "@/components/payments/CustomerFinanceHistory";

export default async function CustomerRefundsPage() {
  await requireRole(["CUSTOMER"]);
  return <div className="space-y-4"><div><h1 className="font-display text-2xl">Refund requests</h1><p className="text-sm text-muted-foreground">Requests require administrator review and provider verification; status changes only after the provider confirms.</p></div><CustomerFinanceHistory kind="refunds" /></div>;
}
