import { DashboardShell } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  return (
    <DashboardShell role="ADMIN" title="Administration" nav={[
      { href: "/admin", label: "Overview" },
      { href: "/admin/users", label: "User Management" },
      { href: "/admin/verification", label: "Business Verification" },
      { href: "/admin/moderation", label: "Moderation" },
      { href: "/admin/orders", label: "Order Oversight" },
      { href: "/admin/audit", label: "Audit Logs" },
    ]}>
      <div className="space-y-6">
        <h1 className="font-display text-2xl">Admin — Platform Control</h1>
        <p className="text-sm text-muted-foreground">Granular permissions • No public admin registration • Sensitive measurement access requires legitimate reason + audit</p>
        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Pending Verifications</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">11</div><div className="text-xs">6 tailors, 5 sellers</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Open Disputes</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">2</div><div className="text-xs">Requires investigation</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Security Events (24h)</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">14</div><div className="text-xs">Failed logins / rate-limited</div></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-base">Business Verification Queue</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="border rounded-xl p-3 bg-white flex justify-between"><span>Ade Bespoke — Lagos • Agbada specialist • Applied 18 Oct</span><Badge variant="secondary">PENDING</Badge></div>
            <div className="border rounded-xl p-3 bg-white flex justify-between"><span>Lagos Fabrics Hub — Yaba • Ankara & Lace • Applied 19 Oct</span><Badge variant="secondary">PENDING</Badge></div>
            <div className="text-xs text-muted-foreground">Approve/reject records reason + verification history. Suspension revokes sessions.</div>
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Audit Logs — last 5</CardTitle></CardHeader><CardContent className="text-xs font-mono space-y-1"><div>[2025-10-19 12:40] admin@demo • UPDATE • tailorProfile:ade-bespoke • APPROVED</div><div>[2025-10-19 11:12] system • AUTH_FAIL • login • rate-limited 192.168.1.12</div><div className="text-muted-foreground">All privileged ops are audited. Measurement access is redacted from logs.</div></CardContent></Card>
      </div>
    </DashboardShell>
  );
}
