"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Upload, Trash2, Check, AlertCircle } from "lucide-react";

export function ProfilePictureUploader({
  initialName,
  initialImage,
  onChanged,
}: {
  initialName: string;
  initialImage?: string | null;
  onChanged?: (newUrl: string | null) => void;
}) {
  const [image, setImage] = React.useState<string | null>(initialImage || null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [success, setSuccess] = React.useState<string>("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSuccess("");
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setError(`Invalid type ${file.type}. Allowed: JPEG, PNG, WebP`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(`File too large ${(file.size / 1024 / 1024).toFixed(1)}MB — max 5MB`);
      return;
    }
    // preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const doUpload = async () => {
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setError("Select a file first");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: fd,
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Upload failed");
      setImage(j.url);
      setPreview(null);
      setSuccess("Profile picture updated — visible everywhere");
      if (input) input.value = "";
      onChanged?.(j.url);
      // Refresh to update header avatars without logout
      // Trigger global event for header avatars to refetch
      window.dispatchEvent(new CustomEvent("twt-avatar-updated", { detail: j.url }));
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const doRemove = async () => {
    if (!confirm("Remove profile picture? You will revert to initials avatar.")) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Removal failed");
      setImage(null);
      setPreview(null);
      setSuccess("Profile picture removed — initials avatar restored");
      onChanged?.(null);
      window.dispatchEvent(new CustomEvent("twt-avatar-updated", { detail: null }));
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      setError(e.message || "Removal failed");
    } finally {
      setUploading(false);
    }
  };

  const cancelPreview = () => {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    setError("");
  };

  const displayUrl = preview || image;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <UserAvatar name={initialName} image={displayUrl} size="xl" className="h-20 w-20 text-xl border-2" />
        <div className="flex-1">
          <div className="text-sm font-semibold">{initialName}</div>
          <div className="text-xs text-muted-foreground dark:text-[#B8B5AE]">
            {preview ? "Preview — confirm to save" : image ? "Current saved picture — visible across marketplace" : "No picture — initials avatar (first + middle name)"}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">JPEG, PNG, WebP • Max 5MB • Circular crop • Dark/Light ready</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFile} className="hidden" id="avatar-file" />
        <label htmlFor="avatar-file" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border bg-white dark:bg-[#292929] dark:border-[#3A3936] dark:text-[#F5F3EF] text-xs font-medium cursor-pointer hover:bg-ivory dark:hover:bg-[#303030]">
          <Upload className="h-3.5 w-3.5" /> {preview ? "Change file" : image ? "Change picture" : "Upload picture"}
        </label>
        {preview && (
          <>
            <Button size="sm" onClick={doUpload} disabled={uploading} className="h-8 text-xs">
              {uploading ? "Saving…" : <><Check className="h-3.5 w-3.5 mr-1" /> Save picture</>}
            </Button>
            <Button size="sm" variant="outline" onClick={cancelPreview} disabled={uploading} className="h-8 text-xs">
              Cancel
            </Button>
          </>
        )}
        {!preview && image && (
          <Button size="sm" variant="outline" onClick={doRemove} disabled={uploading} className="h-8 text-xs text-burgundy border-burgundy/20">
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
          </Button>
        )}
        {!preview && !image && (
          <span className="self-center text-xs text-muted-foreground">Select file → preview → Save</span>
        )}
      </div>

      {preview && (
        <div className="rounded-xl border bg-ivory dark:bg-[#242424] dark:border-[#3A3936] p-3 flex gap-3 items-center">
          <img src={preview} alt="Preview" className="h-16 w-16 rounded-full object-cover border" />
          <div className="text-xs">
            <div className="font-medium">Preview</div>
            <div className="text-muted-foreground dark:text-[#B8B5AE]">Confirm to upload securely. Validates type, size, and content — stores via existing STORAGE_PROVIDER.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-burgundy/20 bg-burgundy/10 px-3 py-2 text-xs text-burgundy flex gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 dark:border-[#49B77A]/30 bg-emerald-50 dark:bg-[#49B77A]/15 px-3 py-2 text-xs text-emerald-900 dark:text-[#6ee7b7] flex gap-2">
          <Check className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}
    </div>
  );
}
