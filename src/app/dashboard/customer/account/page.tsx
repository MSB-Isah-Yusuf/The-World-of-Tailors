import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

async function updatePassword(formData: FormData){
  "use server";
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  const cur = String(formData.get("current")||"");
  const next = String(formData.get("next")||"");
  if (!cur || !next || next.length<8) return;
  const user: any = await prisma.user.findUnique({ where:{ id:uid } });
  const bcrypt = await import("bcryptjs");
  if (!await bcrypt.compare(cur, user.passwordHash)) return;
  const hash = await bcrypt.hash(next,10);
  await prisma.user.update({ where:{ id:uid }, data:{ passwordHash:hash } });
  await prisma.auditLog.create({ data:{ userId:uid, action:"CUSTOMER_CHANGE_PASSWORD", entity:"User", entityId:uid } });
}
async function revokeSessions(){
  "use server";
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  await prisma.session.deleteMany({ where:{ userId:(session as any).user.id } });
  revalidatePath("/dashboard/customer/account");
}

export default async function CustomerAccount(){
  await requireRole(["CUSTOMER"]);
  const session = await auth();
  const uid = (session as any).user.id;
  let user:any=null, sessions:any[]=[];
  try{ user = await prisma.user.findUnique({ where:{ id:uid }, select:{ name:true, email:true, role:true, status:true, createdAt:true } }); sessions = await prisma.session.findMany({ where:{ userId:uid }, take:5 }); } catch{}
  return (
    <AdvancedCustomerShell title="Account Settings">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Account Settings</h1><p className="text-sm text-muted-foreground">Password • Sessions • Preferences</p></div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Profile</CardTitle></CardHeader><CardContent className="text-sm"><div>{user?.name}</div><div className="text-xs text-muted-foreground">{user?.email} • {user?.role} • {user?.status}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Change password</CardTitle></CardHeader><CardContent><form action={updatePassword} className="space-y-2"><Input name="current" type="password" placeholder="Current" className="h-8 bg-white" required/><Input name="next" type="password" placeholder="New ≥8" className="h-8 bg-white" required/><Button size="sm" className="h-7 text-xs">Update</Button></form></CardContent></Card>
        </div>
        <Card><CardHeader><CardTitle className="text-sm">Active sessions • {sessions.length}</CardTitle></CardHeader><CardContent className="space-y-2 text-xs">{sessions.length? sessions.map((s:any)=><div key={s.id} className="border rounded-xl p-3 bg-white flex justify-between"><span>{s.sessionToken.slice(0,12)}… expires {new Date(s.expires).toLocaleString()}</span></div>) : <div className="text-muted-foreground p-4 text-center border rounded-xl bg-white">No DB sessions — JWT.</div>}<form action={revokeSessions}><Button size="sm" variant="outline" className="h-7 text-xs">Revoke all DB sessions</Button></form></CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
