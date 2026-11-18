"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ProfilePictureUploader } from "./ProfilePictureUploader";
import { Check, AlertCircle } from "lucide-react";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  createdAt: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  tailorProfile?: { businessName: string; city?: string | null; state?: string | null; businessStatus: string; isPublished: boolean; slug: string } | null;
  sellerProfile?: { businessName: string; city?: string | null; state?: string | null; businessStatus: string; isPublished: boolean; slug: string } | null;
  customerProfile?: { bio?: string | null } | null;
};

export function ProfileEditor({ initialUser }: { initialUser?: ProfileUser | null }) {
  const [user, setUser] = React.useState<ProfileUser | null>(initialUser || null);
  const [firstName, setFirstName] = React.useState("");
  const [middleName, setMiddleName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        const u = j.user as ProfileUser;
        setUser(u);
        setFirstName(u.firstName || "");
        setMiddleName(u.middleName || "");
        setLastName(u.lastName || "");
        setPhone(u.phone || "");
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setFirstName(initialUser.firstName || "");
      setMiddleName(initialUser.middleName || "");
      setLastName(initialUser.lastName || "");
      setPhone(initialUser.phone || "");
    } else {
      load();
    }
  }, [initialUser, load]);

  const handleAvatarChanged = (newUrl: string | null) => {
    setUser((prev) => (prev ? { ...prev, image: newUrl } : prev));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, middleName, lastName, phone }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      setSuccess("Profile updated — initials and avatar refreshed everywhere");
      setUser((prev) => (prev ? { ...prev, name: [firstName, middleName, lastName].filter(Boolean).join(" "), phone } : prev));
      // Notify header avatars
      window.dispatchEvent(new CustomEvent("twt-profile-updated"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading profile…</CardContent>
      </Card>
    );
  }

  const business = user.tailorProfile || user.sellerProfile;
  const location = business ? [business.city, business.state].filter(Boolean).join(", ") : "";

  return (
    <div className="space-y-6">
      <Card className="dark:bg-[#292929] dark:border-[#3A3936]">
        <CardHeader>
          <CardTitle className="text-base dark:text-[#F5F3EF]">Profile Picture</CardTitle>
          <p className="text-xs text-muted-foreground dark:text-[#B8B5AE]">Visible in header, dashboard, and marketplace identity (design/fabric cards). Updates instantly without re-login.</p>
        </CardHeader>
        <CardContent>
          <ProfilePictureUploader initialName={user.name} initialImage={user.image} onChanged={handleAvatarChanged} />
        </CardContent>
      </Card>

      <Card className="dark:bg-[#292929] dark:border-[#3A3936]">
        <CardHeader>
          <CardTitle className="text-base dark:text-[#F5F3EF]">Profile Information</CardTitle>
          <p className="text-xs text-muted-foreground dark:text-[#B8B5AE]">Edit permitted fields. Role, verification, and admin records are protected.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>First name *</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required className="h-9" />
              </div>
              <div>
                <Label>Middle name</Label>
                <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Michael (optional)" className="h-9" />
                <div className="text-[11px] text-muted-foreground">For JM initials (first + middle)</div>
              </div>
              <div>
                <Label>Last name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" className="h-9" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={user.email} disabled className="h-9 bg-ivory dark:bg-[#242424] dark:border-[#3A3936] opacity-80" />
                <div className="text-[11px] text-muted-foreground">Cannot be changed — contact support</div>
              </div>
              <div>
                <Label>Phone number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="h-9" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border bg-ivory dark:bg-[#242424] dark:border-[#3A3936] p-3">
                <div className="font-semibold">Role</div>
                <div className="text-muted-foreground dark:text-[#B8B5AE]">{user.role}</div>
              </div>
              <div className="rounded-xl border bg-ivory dark:bg-[#242424] dark:border-[#3A3936] p-3">
                <div className="font-semibold">Location</div>
                <div className="text-muted-foreground dark:text-[#B8B5AE]">{location || "—"}</div>
                <div className="text-[11px]">Edit via {user.role === "TAILOR" ? "Tailor Profile" : user.role === "FABRIC_SELLER" ? "Seller Profile" : "Addresses"}</div>
              </div>
              <div className="rounded-xl border bg-ivory dark:bg-[#242424] dark:border-[#3A3936] p-3">
                <div className="font-semibold">Member since</div>
                <div className="text-muted-foreground dark:text-[#B8B5AE]">{new Date(user.createdAt).toLocaleDateString()}</div>
                <div className="text-[11px] capitalize">{user.status?.toLowerCase()}</div>
              </div>
            </div>

            {business && (
              <div className="rounded-xl border bg-amber-50 dark:bg-[#C6A15B]/15 dark:border-[#C6A15B]/30 p-3 text-xs">
                <div className="font-semibold">Business: {business.businessName} • {business.businessStatus}</div>
                <div className="text-muted-foreground dark:text-[#B8B5AE]">{business.isPublished ? `Published at /tailors/${business.slug}` : "Unpublished — pending admin APPROVED"}</div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-burgundy/20 bg-burgundy/10 px-3 py-2 text-xs text-burgundy flex gap-2">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 dark:border-[#49B77A]/30 bg-emerald-50 dark:bg-[#49B77A]/15 px-3 py-2 text-xs text-emerald-900 dark:text-[#6ee7b7] flex gap-2">
                <Check className="h-4 w-4" /> {success}
              </div>
            )}

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save profile — audit logged"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
