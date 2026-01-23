"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminCreatePost,
  adminCreateDraftPost,
  adminCreateSilo,
  adminGetPostById,
  adminPublishPost,
  adminUpdatePost,
} from "@/lib/db";
import { requireAdminSession } from "@/lib/admin/auth";

const SaveSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(180),
  slug: z.string().min(3).max(180),
  target_keyword: z.string().min(2).max(180),
  supporting_keywords: z.array(z.string()).optional(),
  meta_description: z.string().max(200).optional(),
  meta_title: z.string().max(180).optional(),
  canonical_path: z.string().max(220).optional(),
  entities: z.array(z.string()).optional(),
  schema_type: z.enum(["article", "review", "faq", "howto"]).optional(),
  status: z.enum(["draft", "review", "scheduled", "published"]).optional(),
  scheduled_at: z.string().optional(),
  content_json: z.any(),
  content_html: z.string(),
  amazon_products: z.any().optional(),
});

const PublishSchema = z.object({
  id: z.string().uuid(),
  published: z.boolean(),
});

const ScheduleSchema = z.object({
  id: z.string().uuid(),
  scheduled_at: z.string().optional(),
});

const CreateSchema = z.object({
  silo_id: z.string().uuid(),
  title: z.string().min(3).max(180),
  slug: z.string().min(3).max(180),
  target_keyword: z.string().min(2).max(180),
  supporting_keywords: z.array(z.string()).optional(),
  meta_description: z.string().max(200).optional(),
  entities: z.array(z.string()).optional(),
});

const CreateSiloSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  description: z.string().max(240).optional(),
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

export async function saveDraft(payload: unknown) {
  await requireAdminSession();
  const data = SaveSchema.parse(payload);

  await adminUpdatePost({
    id: data.id,
    title: data.title,
    slug: data.slug,
    target_keyword: data.target_keyword,
    supporting_keywords: data.supporting_keywords ?? [],
    meta_description: data.meta_description ?? null,
    meta_title: data.meta_title ?? null,
    canonical_path: data.canonical_path ?? null,
    entities: data.entities ?? [],
    schema_type: data.schema_type ?? undefined,
    status: data.status ?? undefined,
    scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString() : undefined,
    content_json: data.content_json,
    content_html: data.content_html,
    amazon_products: data.amazon_products ?? null,
  });

  await revalidatePostPaths(data.id);

  return { ok: true as const };
}

export async function setPublishState(payload: unknown | FormData) {
  await requireAdminSession();

  const raw =
    payload instanceof FormData
      ? {
          id: payload.get("id"),
          published: payload.get("published"),
        }
      : payload;

  const data = PublishSchema.parse({
    id: (raw as any)?.id,
    published:
      (raw as any)?.published === "true"
        ? true
        : (raw as any)?.published === "false"
          ? false
          : (raw as any)?.published,
  });

  await adminPublishPost({ id: data.id, published: data.published });
  await revalidatePostPaths(data.id);

  return { ok: true as const };
}

export async function schedulePost(formData: FormData) {
  await requireAdminSession();

  const payload = {
    id: String(formData.get("id") ?? ""),
    scheduled_at: String(formData.get("scheduled_at") ?? ""),
  };

  const data = ScheduleSchema.parse(payload);
  const scheduledAt = data.scheduled_at.trim()
    ? new Date(data.scheduled_at).toISOString()
    : null;

  await adminUpdatePost({
    id: data.id,
    status: scheduledAt ? "scheduled" : "draft",
    scheduled_at: scheduledAt,
  });

  await revalidatePostPaths(data.id);
  return { ok: true as const };
}

export async function createPost(formData: FormData) {
  await requireAdminSession();

  const supporting = String(formData.get("supporting_keywords") ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const entities = String(formData.get("entities") ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const payload = {
    silo_id: String(formData.get("silo_id") ?? ""),
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    target_keyword: String(formData.get("target_keyword") ?? ""),
    supporting_keywords: supporting,
    meta_description: String(formData.get("meta_description") ?? "").trim() || undefined,
    entities,
  };

  const data = CreateSchema.parse(payload);
  const post = await adminCreateDraftPost({
    silo_id: data.silo_id,
    title: data.title,
    slug: data.slug,
    target_keyword: data.target_keyword,
    supporting_keywords: data.supporting_keywords ?? [],
    meta_description: data.meta_description ?? null,
    entities: data.entities ?? [],
  });

  redirect(`/admin/editor/${post.id}`);
}

export async function createSilo(formData: FormData) {
  await requireAdminSession();

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
  };

  const data = CreateSiloSchema.parse(payload);
  await adminCreateSilo({
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
  });

  redirect("/admin/editor/new");
}
