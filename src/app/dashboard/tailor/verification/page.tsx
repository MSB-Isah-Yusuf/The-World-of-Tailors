import { AdvancedTailorShell } from "@/components/dashboard/AdvancedShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";

export default async function VerificationStatus() {
  const session = await requireRole(["TAILOR"]);
  const profile: any = await prisma.tailorProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!profile) return <AdvancedTailorShell title="Verification"><div className="p-6">No profile</div></AdvancedTailorShell>;
  const steps = [
    { k: "PENDING", label: "Submitted — awaiting review", done: true },
    { k: "UNDER_REVIEW", label: "Admin reviewing", done: ["UNDER_REVIEW","APPROVED","REJECTED","SUSPENDED"].includes(profile.businessStatus) },
    { k: "APPROVED", label: "Approved — published & searchable", done: profile.businessStatus === "APPROVED" },
  ];
  const isApproved = profile.businessStatus === "APPROVED";
  return (
    <AdvancedTailorShell title="Verification Status">
      <div className="space-y-6 max-w-3xl">
        <div><h1 className="font-display text-2xl">Verification Status</h1><p className="text-sm text-muted-foreground">Your business verification — status live, no fabrication</p></div>
        <Card><CardHeader><CardTitle className="text-sm">Current: <Badge variant={isApproved?"success":profile.businessStatus==="PENDING"?"warning":"burgundy"}>{profile.businessStatus}</Badge> {profile.isPublished ? <Badge variant="gold" className="ml-2">Published on /tailors</Badge> : <Badge variant="secondary" className="ml-2">Unpublished — no public visibility</Badge>}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {steps.map((s:any) => <div key={s.k} className={`flex gap-3 p-3 rounded-xl border ${s.done?"bg-white border-emeraldDeep/20":"bg-ivory/50"}`}><span className={`h-6 w-6 rounded-full grid place-items-center text-xs shrink-0 ${s.done?"bg-emeraldDeep text-white":"bg-amber-100"}`}>{s.done?"✓":"•"}</span><div><div className="text-sm font-medium">{s.k}</div><div className="text-xs text-muted-foreground">{s.label}</div></div></div>)}
            <div className="text-xs text-muted-foreground">Business: {profile.businessName} • {profile.city}, {profile.state} • {profile.slug} • Applied {new Date(profile.createdAt).toLocaleDateString()}</div>
            {profile.businessStatus === "REJECTED" && <div className="rounded-xl bg-burgundy/10 border border-burgundy/20 p-3 text-xs text-burgundy">Rejected — check admin notes, fix and request resubmission at /dashboard/tailor/profile.</div>}
            {profile.businessStatus === "SUSPENDED" && <div className="rounded-xl bg-burgundy/10 border border-burgundy/20 p-3 text-xs text-burgundy">Suspended — contact support.</div>}
            {isApproved ? <Link href={`/tailors/${profile.slug}`} className="inline-block text-xs underline text-plum mt-2">View public portfolio /tailors/{profile.slug} →</Link> : <div className="text-xs text-muted-foreground">Publish blocked until APPROVED — designs save as draft.</div>}
          </CardContent></Card>
        <Card><CardContent className="text-xs text-muted-foreground p-4">Admin actions are audit-logged (APPROVE_TAILOR etc.). You will be notified on status change.</CardContent></Card>
      </div>
    </AdvancedTailorShell>
  );
}
