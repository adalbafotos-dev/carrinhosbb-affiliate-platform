"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminAddPostToBatch, adminCreatePost, adminCreateSiloBatch, adminGetSiloBySlug } from "@/lib/db";

const CreateBatchSchema = z.object({
  siloSlug: z.string().min(1),
  name: z.string().min(3),
  count: z.number().min(3).max(10),
});

export async function createBatchWithPosts(formData: FormData) {
  await requireAdminSession();
  const siloSlug = String(formData.get("siloSlug") ?? "");
  const name = String(formData.get("name") ?? "").trim() || `Batch ${new Date().toISOString().slice(0, 10)}`;
  const count = Number(formData.get("count") ?? 5);

  const payload = CreateBatchSchema.parse({ siloSlug, name, count });
  const silo = await adminGetSiloBySlug(payload.siloSlug);
  if (!silo) {
    throw new Error("Silo nao encontrado");
  }

  const batch = await adminCreateSiloBatch({ silo_id: silo.id, name: payload.name, status: "draft" });

  for (let i = 0; i < payload.count; i++) {
    const title = `Post de teste ${i + 1}`;
    const slug = `${silo.slug}-draft-${Date.now()}-${i + 1}`;
    const post = await adminCreatePost({
      silo_id: silo.id,
      title,
      slug,
      target_keyword: `keyword-${i + 1}`,
      supporting_keywords: [],
      meta_description: null,
      entities: [],
    });
    await adminAddPostToBatch({ batch_id: batch.id, post_id: post.id, position: i + 1 });
  }

  redirect(`/admin/silos/${silo.slug}/batch/${batch.id}`);
}
