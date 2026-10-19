import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RegisterChoice() {
  return (
    <div className="min-h-screen bg-[#FFFBF0]">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-3xl text-center">Create your TWT account</h1>
        <p className="text-center text-xs tracking-widest text-muted-foreground mt-1">THE WORLD OF TAILORS (TWT)</p>
        <p className="text-center text-muted-foreground mt-2">Choose the account that fits you. Admin accounts are never created via public registration.</p>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <Card className="hover:shadow-lg transition">
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Book tailors, buy fabrics, track orders.</p>
              <Link href="/register/customer"><Button className="w-full">Register as Customer</Button></Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition">
            <CardHeader><CardTitle className="text-base">Tailor</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Publish designs, receive bookings.</p>
              <Link href="/register/tailor"><Button className="w-full">Become a Tailor</Button></Link>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition">
            <CardHeader><CardTitle className="text-base">Fabric Seller</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">List fabrics, manage inventory.</p>
              <Link href="/register/seller"><Button className="w-full">Become a Seller</Button></Link>
            </CardContent>
          </Card>
        </div>
        <div className="text-center mt-6 text-sm"><Link href="/login" className="text-emerald-800 underline">Already have an account? Sign in</Link></div>
      </div>
    </div>
  );
}
