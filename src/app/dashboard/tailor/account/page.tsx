import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
export default async function AccountPage(){
  await requireRole(["TAILOR"]);
  const session= await auth();
  return <AdvancedTailorShell title="Account Settings"><div className="space-y-6 max-w-2xl"><h1 className="font-display text-2xl">Account Settings</h1><Card><CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader><CardContent className="text-sm"><div>Name: {(session!.user as any).name || (session!.user as any).email}</div><div className="text-xs text-muted-foreground">Email: {(session!.user as any).email} • Role: {(session!.user as any).role}</div><div className="mt-2 text-xs">Theme & language persisted via UserPreference + localStorage. Change via header sun/moon & EN|HA toggles. Password change via /forgot-password (bcrypt 10, ownership checked).</div></CardContent></Card><Card><CardContent className="text-xs text-muted-foreground p-4">Least-privilege RBAC • Audit logged • Session JWT 7d • Pending: 2FA toggle (next iteration).</CardContent></Card></div></AdvancedTailorShell>;
}
