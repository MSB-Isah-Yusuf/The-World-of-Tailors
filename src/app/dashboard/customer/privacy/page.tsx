import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/rbac";

export default async function PrivacyPage(){
  await requireRole(["CUSTOMER"]);
  return (
    <AdvancedCustomerShell title="Privacy & Security">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Privacy & Security</h1><p className="text-sm text-muted-foreground">Measurements never in URLs/logs/emails • Only authorized tailor sees snapshot • HTTPS everywhere</p></div>
        <Card><CardHeader><CardTitle className="text-sm">What is private</CardTitle></CardHeader><CardContent className="text-xs space-y-2"><div>• Measurements are private to you + authorized tailor per booking snapshot. Sellers have no access. Admin sees only with legitimate need + audit.</div><div>• Addresses are per-user, never public. Favorite tailors not exposed.</div><div>• Payments via Paystack — card numbers never stored; webhook HMAC verified.</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Your rights</CardTitle></CardHeader><CardContent className="text-xs space-y-2"><div>• Request data export at /api/tailor/measurements/{'{id}'}/export (own profiles only).</div><div>• Delete account: contact admin — measurements archived, not hard-deleted to preserve booking history.</div><div>• Session: JWT 7d max, 30m inactivity (configurable per Platform Settings). Logout revokes.</div></CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
