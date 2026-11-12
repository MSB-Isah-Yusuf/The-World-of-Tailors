import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function updatePassword(formData: FormData) {
  "use server";
  await requireRole(["TAILOR"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  const cur = String(formData.get("current") || "");
  const next = String(formData.get("next") || "");
  if (!cur || !next || next.length < 8) return;
  const user: any = await prisma.user.findUnique({ where: { id: uid } });
  const bcrypt = await import("bcryptjs");
  const ok = await bcrypt.compare(cur, user.passwordHash);
  if (!ok) return;
  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: uid }, data: { passwordHash: hash } });
  await prisma.auditLog.create({ data: { userId: uid, action: "TAILOR_CHANGE_PASSWORD", entity: "User", entityId: uid } });
}

async function revokeOtherSessions() {
  "use server";
  await requireRole(["TAILOR"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  await prisma.session.deleteMany({ where: { userId: uid } });
  revalidatePath("/dashboard/tailor/account");
}

export default async function AccountPage() {
  await requireRole(["TAILOR"]);
  const session = await auth();
  const uid = (session as any).user.id;
  let user: any = null, sessions: any[] = [];
  try {
    user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } });
    sessions = await prisma.session.findMany({ where: { userId: uid }, orderBy: { expires: "desc" }, take: 5 });
  } catch {}
  return (
    <AdvancedTailorShell title="Account Settings">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Account Settings</h1><p className="text-sm text-muted-foreground">Profile • Password • Sessions • Preferences (theme EN|HA, dark/light via header)</p></div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader><CardContent className="text-sm space-y-1"><div>Name: {user?.name || (session!.user as any).name}</div><div className="text-xs text-muted-foreground">Email: {user?.email} • Role {user?.role} • {user?.status} • Joined {user ? new Date(user.createdAt).toLocaleDateString() : "—"}</div><div className="text-xs mt-2">Theme & HA persisted via UserPreference. Toggle via header sun/moon & EN|HA.</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Change password</CardTitle></CardHeader><CardContent>
            <form action={updatePassword} className="space-y-2">
              <Input name="current" type="password" placeholder="Current password" className="h-8 bg-white" required/>
              <Input name="next" type="password" placeholder="New password (≥8)" className="h-8 bg-white" required/>
              <Button size="sm" type="submit" className="h-7 text-xs">Update password</Button>
              <div className="text-xs text-muted-foreground">Bcrypt 10 • Audit logged • Sessions not revoked unless requested</div>
            </form>
          </CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-sm">Active sessions ({sessions.length}) • Revoke suspicious</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {sessions.length===0 ? <div className="text-muted-foreground p-4 text-center border rounded-xl bg-white">No active DB sessions — JWT stateless; log out via header to clear cookies.</div> :
            sessions.map((s:any)=><div key={s.id} className="flex justify-between border rounded-xl p-3 bg-white"><span>{s.sessionToken.slice(0,12)}… • expires {new Date(s.expires).toLocaleString()}</span><span className="text-muted-foreground">DB session</span></div>)}
            <form action={revokeOtherSessions}><Button size="sm" variant="outline" className="h-7 text-xs">Revoke all DB sessions</Button></form>
            <div className="text-muted-foreground">JWT 7d + httpOnly Secure SameSite • Admin 15m / Tailor 30m inactivity timeouts configurable via Platform Settings next.</div>
          </CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
