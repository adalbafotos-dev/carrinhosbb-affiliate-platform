import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { authenticateWpRequest } from "@/lib/wp/auth";
import { getOrCreateWpIdByUuid } from "@/lib/wp/id-map";
import { slugify } from "@/lib/wp/slugify";
import { wpError } from "@/lib/wp/response";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function resolveExtension(file: Blob) {
  const type = (file as any).type ?? "";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  return "bin";
}

export async function POST(req: Request) {
  const auth = await authenticateWpRequest(req);
  if (!auth.ok) {
    return wpError(auth.status, auth.message, auth.code);
  }

  const formData = await req.formData();
  const file = (formData.get("file") ?? formData.get("media")) as File | null;

  if (!file || typeof (file as any).arrayBuffer !== "function") {
    return wpError(400, "File is required", "rest_invalid_param");
  }

  const contentType = String((file as any).type ?? "");
  if (!ALLOWED_TYPES.has(contentType)) {
    return wpError(400, "Unsupported media type", "rest_invalid_param");
  }

  const altTextRaw = String(formData.get("alt_text") ?? "");
  const titleRaw = String(formData.get("title") ?? "");
  const fileNameRaw = (file as any).name ? String((file as any).name) : "";
  const baseName = slugify(titleRaw || fileNameRaw || "imagem");

  const ext = resolveExtension(file);
  const timestamp = Date.now();
  const fileName = `${timestamp}-${baseName}.${ext}`;
  const path = `contentor/${fileName}`;

  const supabase = getAdminSupabase();
  let { error } = await supabase.storage.from("media").upload(path, file, {
    contentType,
    upsert: false,
  });

  if (error && error.message && error.message.includes("Bucket not found")) {
    const { error: createError } = await supabase.storage.createBucket("media", { public: true });
    if (!createError) {
      const retry = await supabase.storage.from("media").upload(path, file, {
        contentType,
        upsert: false,
      });
      error = retry.error;
    }
  }

  if (error) {
    return wpError(500, error.message || "Upload failed", "rest_upload_error");
  }

  const { data: publicData } = supabase.storage.from("media").getPublicUrl(path);
  const sourceUrl = publicData?.publicUrl ?? "";

  const { data: mediaRow, error: mediaError } = await supabase
    .from("wp_media")
    .insert({
      url: sourceUrl,
      alt_text: altTextRaw || null,
      title: titleRaw || null,
    })
    .select("id, url, alt_text, title")
    .maybeSingle();

  if (mediaError || !mediaRow) {
    return wpError(500, mediaError?.message ?? "Failed to save media", "rest_upload_error");
  }

  const wpId = await getOrCreateWpIdByUuid("media", mediaRow.id);

  return NextResponse.json({
    id: wpId,
    source_url: mediaRow.url,
    alt_text: mediaRow.alt_text ?? "",
    title: { rendered: mediaRow.title ?? baseName },
  });
}