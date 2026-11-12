import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { validateImageUpload, storeImage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "formData required" }, { status: 400 });
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file required (field name=file)" }, { status: 400 });

  const mime = file.type || "image/jpeg";
  const size = file.size;
  try { validateImageUpload({ mime, size }); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await storeImage({ buffer, mime, originalName: (file as any).name || "upload.jpg" });

  return NextResponse.json({ ok: true, url, mime, size, note: "Use url in DesignImage / product image creation; S3/Cloudinary configured via STORAGE_PROVIDER env" });
}
