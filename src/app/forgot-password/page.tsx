import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export default function ForgotPassword() {
  return (<div className="min-h-screen bg-[#FFFBF0]"><SiteHeader /><div className="mx-auto max-w-md px-6 py-12"><Card><CardHeader><CardTitle>Reset password</CardTitle><p className="text-sm text-muted-foreground">Single-use token with expiry • server-validated • rate-limited</p></CardHeader><CardContent className="space-y-4"><div><Label>Email</Label><Input type="email" placeholder="you@example.com" /></div><Button className="w-full">Send reset link</Button><p className="text-xs text-muted-foreground">Email delivery via configured provider (Resend/SendGrid). In dev, check console (EMAIL_PROVIDER=console).</p></CardContent></Card></div></div>);
}
