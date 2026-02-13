"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  adminAddPostToBatch,
  adminCreatePost,
  adminCreateSilo,
  adminCreateSiloBatch,
  adminGetSiloBySlug,
  adminUpdateSilo,
} from "@/lib/db";

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


const CreateSiloSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
});

export async function createSiloAction(formData: FormData) {
  await requireAdminSession();
  const payload = CreateSiloSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  await adminCreateSilo(payload);
  redirect(`/admin/silos/${payload.slug}`);
}

const UpdateSiloSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  hero_image_url: z.string().optional().nullable(),
  hero_image_alt: z.string().optional().nullable(),
  pillar_content_html: z.string().optional().nullable(),
});

function toNullableText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateSiloAction(formData: FormData) {
  await requireAdminSession();
  const payload = UpdateSiloSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: toNullableText(formData.get("description")),
    meta_title: toNullableText(formData.get("meta_title")),
    meta_description: toNullableText(formData.get("meta_description")),
    hero_image_url: toNullableText(formData.get("hero_image_url")),
    hero_image_alt: toNullableText(formData.get("hero_image_alt")),
    pillar_content_html: toNullableText(formData.get("pillar_content_html")),
  });

  await adminUpdateSilo(payload.id, {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    meta_title: payload.meta_title,
    meta_description: payload.meta_description,
    hero_image_url: payload.hero_image_url,
    hero_image_alt: payload.hero_image_alt,
    pillar_content_html: payload.pillar_content_html,
  });
  redirect(`/admin/silos/${payload.slug}`);
}
