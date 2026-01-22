"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { adminGetPostById, adminPublishPost, adminUpdatePost } from "@/lib/db";
import { requireAdminSession } from "@/lib/admin/auth";

const SaveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(180),
  seo_title: z.string().max(180).optional(),
  slug: z.string().min(3).max(180),
  target_keyword: z.string().min(2).max(180),
  supporting_keywords: z.array(z.string()).optional(),
  meta_description: z.string().max(200).optional(),
  cover_image: z.string().optional(),
  author_name: z.string().max(120).optional(),
  scheduled_at: z.string().optional(),
  content_json: z.any(),
  content_html: z.string(),
  amazon_products: z.any().optional(),
});

const PublishSchema = z.object({
  id: z.string().uuid(),
  published: z.boolean(),
});

async function revalidatePostPaths(id: string) {
  const post = await adminGetPostById(id);
  if (!post) return;

  const siloSlug = post.silo?.slug;
  if (siloSlug) {
    revalidatePath(`/${siloSlug}`);
    revalidatePath(`/${siloSlug}/${post.slug}`);
  }

  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

export async function saveEditorPost(payload: unknown) {
  await requireAdminSession();
  const data = SaveSchema.parse(payload);

  const coverImage =
    typeof data.cover_image === "string" ? (data.cover_image.trim() ? data.cover_image.trim() : null) : undefined;
  const metaDescription =
    typeof data.meta_description === "string"
      ? data.meta_description.trim()
        ? data.meta_description.trim()
        : null
      : undefined;
  const authorName =
    typeof data.author_name === "string" ? (data.author_name.trim() ? data.author_name.trim() : null) : undefined;
  const scheduledAt =
    typeof data.scheduled_at === "string"
      ? data.scheduled_at.trim()
        ? new Date(data.scheduled_at).toISOString()
        : null
      : undefined;

  await adminUpdatePost({
    id: data.id,
    title: data.title,
    seo_title: data.seo_title?.trim() || null,
    slug: data.slug,
    target_keyword: data.target_keyword,
    supporting_keywords: data.supporting_keywords ?? [],
    meta_description: metaDescription,
    cover_image: coverImage,
    author_name: authorName,
    scheduled_at: scheduledAt,
    content_json: data.content_json,
    content_html: data.content_html,
    amazon_products: data.amazon_products ?? null,
  });

  await revalidatePostPaths(data.id);
  return { ok: true as const };
}

export async function setEditorPublishState(payload: unknown) {
  await requireAdminSession();
  const data = PublishSchema.parse(payload);

  await adminPublishPost({ id: data.id, published: data.published });
  await revalidatePostPaths(data.id);
  return { ok: true as const };
}
