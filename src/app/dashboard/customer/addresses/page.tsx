import { AdvancedCustomerShell } from "@/components/dashboard/AdvancedCustomerShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function addAddress(formData:FormData){
  "use server";
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  const label = String(formData.get("label")||"Home").trim();
  const fullName = String(formData.get("fullName")||"").trim();
  const phone = String(formData.get("phone")||"").trim();
  const state = String(formData.get("state")||"Lagos").trim();
  const city = String(formData.get("city")||"Yaba").trim();
  const street = String(formData.get("street")||"").trim();
  if(!fullName||!phone||!street) return;
  const isDefault = formData.get("isDefault")==="on";
  if(isDefault) await prisma.customerAddress.updateMany({ where:{ userId: uid, isDefault:true }, data:{ isDefault:false } });
  await prisma.customerAddress.create({ data:{ userId: uid, label, fullName, phone, state, city, street, isDefault } });
  await prisma.auditLog.create({ data:{ userId: uid, action:"CREATE_ADDRESS", entity:"CustomerAddress", entityId: uid } });
  revalidatePath("/dashboard/customer/addresses");
}

export default async function CustomerAddresses(){
  await requireRole(["CUSTOMER"]);
  const session = await (await import("@/lib/auth")).auth();
  const uid = (session as any).user.id;
  let addresses:any[]=[];
  try { addresses = await prisma.customerAddress.findMany({ where:{ userId: uid }, orderBy:{ createdAt:"desc" } }); } catch{}
  return (
    <AdvancedCustomerShell title="Addresses">
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-display text-2xl">Delivery Addresses — {addresses.length}</h1>
        <Card><CardHeader><CardTitle className="text-sm">Used at checkout • Default pre-filled • TO_CUSTOMER vs TO_TAILOR toggle at checkout</CardTitle></CardHeader><CardContent className="space-y-3">
          {addresses.length===0 ? <div className="p-6 text-center text-sm text-muted-foreground border rounded-xl bg-white">No addresses — add one below. Shown at /checkout.</div>
          : addresses.map((a:any)=><div key={a.id} className="border rounded-xl p-3 bg-white text-sm"><div className="flex justify-between"><span className="font-medium">{a.label} • {a.fullName} • {a.phone} {a.isDefault && <Badge variant="gold">Default</Badge>}</span><span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span></div><div className="text-xs text-muted-foreground">{a.street}, {a.city}, {a.state}, {a.country}</div></div>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Add address</CardTitle></CardHeader><CardContent>
          <form action={addAddress} className="space-y-3 text-sm">
            <div className="grid md:grid-cols-2 gap-3"><label>Label<input name="label" placeholder="Home/Office" defaultValue="Home" className="w-full h-9 rounded-xl border px-3 mt-1"/></label><label>Full name<input name="fullName" required className="w-full h-9 rounded-xl border px-3 mt-1"/></label></div>
            <div className="grid md:grid-cols-2 gap-3"><label>Phone<input name="phone" required className="w-full h-9 rounded-xl border px-3 mt-1"/></label><label>State<input name="state" defaultValue="Lagos" className="w-full h-9 rounded-xl border px-3 mt-1"/></label></div>
            <div className="grid md:grid-cols-2 gap-3"><label>City<input name="city" defaultValue="Yaba" className="w-full h-9 rounded-xl border px-3 mt-1"/></label><label>Street address<input name="street" required placeholder="No. 12 Allen Ave" className="w-full h-9 rounded-xl border px-3 mt-1"/></label></div>
            <label className="flex gap-2 items-center"><input type="checkbox" name="isDefault"/> Set as default</label>
            <button type="submit" className="w-full h-9 rounded-xl bg-midnight text-white">Save address — audited</button>
          </form>
        </CardContent></Card>
      </div>
    </AdvancedCustomerShell>
  );
}
