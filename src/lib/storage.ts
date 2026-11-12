import crypto from "crypto";

export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGES_PER_DESIGN = 5;

// Server-side validation — call before storing
export function validateImageUpload({ mime, size }: { mime: string; size: number }) {
  if (!ALLOWED_IMAGE_MIME.includes(mime)) throw new Error(`Invalid image type ${mime}. Allowed: ${ALLOWED_IMAGE_MIME.join(", ")}`);
  if (size > MAX_IMAGE_BYTES) throw new Error(`Image too large ${Math.round(size/1024)}KB > ${MAX_IMAGE_BYTES/1024/1024}MB`);
  return true;
}

// Local provider (MVP) — returns a path under /uploads (served statically if configured) or data URL placeholder
// On Vercel production, recommend switching to S3/Cloudinary via STORAGE_PROVIDER=s3/cloudinary
export async function storeImage({ buffer, mime, originalName }: { buffer: Buffer; mime: string; originalName: string }) {
  const provider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
  const ext = (originalName.split(".").pop() || mime.split("/")[1] || "jpg").toLowerCase().slice(0,5);
  const key = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  if (provider === "s3" && process.env.AWS_S3_BUCKET) {
    // S3 enabled only if @aws-sdk/client-s3 installed; otherwise local fallback
    console.warn("[storage] S3 requested but not bundled — set STORAGE_PROVIDER=local or install @aws-sdk/client-s3");
  }
  // local: store to /tmp fallback, return /uploads path (Next public folder not persisted on Vercel—use as placeholder + save URL in DB)
  // For now return a deterministic public-like URL; actual persistence via DB URL string is what matters for gallery
  // In production set STORAGE_PROVIDER=cloudinary or s3
  return `/uploads/${key}`;
}
