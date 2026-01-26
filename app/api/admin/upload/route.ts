import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sanitizeSegment(value: string, fallback: string) {
  const cleaned = slugify(value);
  return cleaned || fallback;
}

function resolveExtension(file: Blob) {
  const type = (file as any).type ?? "";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  return "bin";
}

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const postId = String(formData.get("postId") ?? "misc").replace(/[^a-zA-Z0-9_-]/g, "") || "misc";
  const siloSlug = sanitizeSegment(String(formData.get("siloSlug") ?? ""), "silo");
  const postSlug = sanitizeSegment(String(formData.get("postSlug") ?? ""), postId || "post");
  const altRaw = String(formData.get("alt") ?? "");
  const kind = String(formData.get("kind") ?? "body");
  const width = Number(formData.get("width") ?? 0) || null;
  const height = Number(formData.get("height") ?? 0) || null;

  if (!file || typeof (file as any).arrayBuffer !== "function") {
    return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 });
  }

  const blob = file as Blob;
  const contentType = String((blob as any).type ?? "");
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: "Tipo de imagem nao permitido." }, { status: 400 });
  }

  const maxBytes = Math.max(1, Number(process.env.ADMIN_UPLOAD_MAX_MB ?? 6)) * 1024 * 1024;
  if (blob.size > maxBytes) {
    return NextResponse.json({ error: "Arquivo acima do limite." }, { status: 400 });
  }

  const ext = resolveExtension(blob);
  const timestamp = Date.now();
  const altSlug = sanitizeSegment(altRaw, "imagem");
  const fileName =
    kind === "hero"
      ? `hero-${timestamp}.${ext}`
      : `${timestamp}-${altSlug}.${ext}`;
  const path = `${siloSlug}/${postSlug}/${fileName}`;

  const supabase = getAdminSupabase();
  let { error } = await supabase.storage.from("media").upload(path, blob, {
    contentType,
    upsert: false,
  });

  // Auto-create bucket if missing
  if (error && error.message && error.message.includes("Bucket not found")) {
    console.log("Bucket 'media' not found. Attempting to create...");
    const { error: createError } = await supabase.storage.createBucket("media", { public: true });
    if (!createError) {
      // Retry upload
      const retry = await supabase.storage.from("media").upload(path, blob, {
        contentType,
        upsert: false,
      });
      error = retry.error;
    } else {
      console.error("Failed to create bucket:", createError);
    }
  }

  if (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return NextResponse.json({
    url: data.publicUrl,
    fileName,
    width,
    height,
    createdAt: new Date().toISOString(),
  });
}
