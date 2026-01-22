import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { isAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const postIdRaw = String(formData.get("postId") ?? "misc");
  const postId = postIdRaw.replace(/[^a-zA-Z0-9_-]/g, "") || "misc";

  if (!file || typeof (file as any).arrayBuffer !== "function") {
    return NextResponse.json({ error: "Arquivo invalido." }, { status: 400 });
  }

  const blob = file as Blob;
  const contentType = (blob as any).type ?? "application/octet-stream";
  if (!String(contentType).startsWith("image/")) {
    return NextResponse.json({ error: "Somente imagens são permitidas." }, { status: 400 });
  }

  const filename = "name" in (blob as any) ? sanitizeFileName((blob as any).name) : `image-${Date.now()}`;
  const path = `${postId}/${Date.now()}-${filename}`;

  const supabase = getAdminSupabase();
  const { error } = await supabase.storage.from("blog-assets").upload(path, blob, {
    contentType,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("blog-assets").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
