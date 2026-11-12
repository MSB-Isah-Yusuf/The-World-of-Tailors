import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function PlatformSettingsPage() {
  await requireRole(["ADMIN"]);
  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex justify-between"><div><h1 className="font-display text-2xl">Platform Settings</h1><p className="text-sm text-muted-foreground">Identity • Regions • Categories • Session timeouts • Upload limits • Policies — admin-only, audit logged (env overrides noted)</p></div><Link href="/admin" className="text-sm underline">← Admin</Link></div>
        <div className="grid md:grid-cols-2 gap-4">
          <Card><CardHeader><CardTitle className="text-sm">Identity</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <div><label className="text-xs text-muted-foreground">Platform name</label><Input defaultValue="The World of Tailors" className="h-9 bg-white"/></div>
            <div><label className="text-xs text-muted-foreground">Domain</label><Input defaultValue={process.env.AUTH_URL || "https://twt.ng"} className="h-9 bg-white"/></div>
            <div className="text-xs text-muted-foreground">Stored in .env AUTH_URL + platform_settings table (next iteration DB-backed).</div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Session security</CardTitle></CardHeader><CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2"><div><label className="text-xs">Customer inactivity (min)</label><Input defaultValue="30" className="h-9 bg-white"/></div><div><label className="text-xs">Admin inactivity (min)</label><Input defaultValue="15" className="h-9 bg-white"/></div></div>
            <div className="grid grid-cols-2 gap-2"><div><label className="text-xs">Max session 12h (std)</label><Input defaultValue="720" className="h-9 bg-white"/></div><div><label className="text-xs">Max 8h admin</label><Input defaultValue="480" className="h-9 bg-white"/></div></div>
            <div className="text-xs text-muted-foreground">Prompt §10.3 config — apply via middleware when MAX_SESSION env wired.</div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Supported geography</CardTitle></CardHeader><CardContent className="space-y-2 text-xs"><div><span className="font-medium">Countries:</span> Nigeria (NG), Ghana (GH) • <span className="text-muted-foreground">Add via Country/StateRegion/City tables — seed-locations.ts</span></div><div><span className="font-medium">Regions:</span> 37 NG states + FCT (NIGERIA_STATES in lib/location-data.ts)</div><div><span className="font-medium">Cities:</span> Ikeja, Yaba, Abuja, Port Harcourt… — managed via City table</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Categories & policy</CardTitle></CardHeader><CardContent className="space-y-2 text-xs"><div>FabricCategory: Ankara, Lace, Aso-Oke, Brocade, Adire… (seeded 7)</div><div>DesignCategory: Men's/Women's/Traditional/Corporate/Wedding/Casual/Children (seeded 7)</div><div>Languages: EN/Hausa • Currency NGN • Upload limit 5MB • Verification PENDING→APPROVED</div></CardContent></Card>
        </div>
        <Card><CardContent className="p-4 flex gap-2"><Button className="h-9 text-xs">Save settings (next DB write)</Button><span className="text-xs text-muted-foreground self-center">Settings are currently documentation + env — full DB writes in §10.3 wiring. Audit on save.</span></CardContent></Card>
      </div>
    </div>
  );
}
