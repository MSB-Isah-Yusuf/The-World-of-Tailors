import { AdvancedSellerShell } from "@/components/dashboard/AdvancedSellerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
export default async function AccountPage(){
  await requireRole(["FABRIC_SELLER"]);
  const session= await auth();
  return <AdvancedSellerShell title="Account Settings"><div className="space-y-6 max-w-2xl"><h1 className="font-display text-2xl">Account Settings</h1><Card><CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader><CardContent className="text-sm"><div>{(session!.user as any).name} • {(session!.user as any).email}</div><div className="text-xs text-muted-foreground">Role {(session!.user as any).role} • Theme/language toggles in header persist via UserPreference</div></CardContent></Card></div></AdvancedSellerShell>;
}
