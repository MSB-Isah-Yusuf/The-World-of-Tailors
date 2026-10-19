import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
async function createCustomer(formData: FormData) {
  "use server";
  const name = String(formData.get("name")||"");
  const email = String(formData.get("email")||"").toLowerCase();
  const password = String(formData.get("password")||"");
  const phone = String(formData.get("phone")||"");
  if (!email || !password) throw new Error("Missing");
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("exists");
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name, email, passwordHash: hash, role: "CUSTOMER", phone, status: "ACTIVE" } });
  redirect("/login?registered=customer");
}
export default function CustomerRegister() {
  return (
    <div className="min-h-screen bg-[#FFFBF0]"><SiteHeader />
      <div className="mx-auto max-w-md px-6 py-12">
        <Card><CardHeader><CardTitle>Customer Registration</CardTitle></CardHeader>
          <CardContent><form action={createCustomer} className="space-y-4">
            <div><Label>Full name</Label><Input name="name" required /></div>
            <div><Label>Email</Label><Input name="email" type="email" required /></div>
            <div><Label>Phone</Label><Input name="phone" /></div>
            <div><Label>Password</Label><Input name="password" type="password" required /></div>
            <Button type="submit" className="w-full">Create account</Button>
          </form></CardContent></Card>
      </div></div>
  );
}
