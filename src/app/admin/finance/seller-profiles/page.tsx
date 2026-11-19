import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { AdminSellerProfiles } from "@/components/payments/AdminSellerProfiles";

export default async function AdminSellerProfilesPage() {
  await requireRole(["ADMIN"]);
  return <div className="space-y-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="font-display text-2xl">Seller payment profiles</h1><p className="text-sm text-muted-foreground">Review verified account destinations and explicitly authorize a settlement route.</p></div><Link href="/admin/finance" className="text-sm underline">Finance controls</Link></div>
    <AdminSellerProfiles />
  </div>;
}
