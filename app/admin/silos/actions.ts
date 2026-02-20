"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import {
  adminAddPostToBatch,
  adminCreateSiloGroup,
  adminCreatePost,
  adminDeleteSilo,
  adminCreateSilo,
  adminCreateSiloBatch,
  adminGetSiloById,
  adminGetSiloPostsBySiloId,
  adminGetSiloBySlug,
  adminListSiloGroupsBySiloId,
  adminListPostsBySiloId,
  adminUpdateSilo,
  adminUpdateSiloGroups,
  adminUpdatePost,
} from "@/lib/db";
import { isUuid } from "@/lib/uuid";
import { normalizeSiloGroup, normalizeSiloGroupLabel } from "@/lib/silo/groups";

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
  pillar_content_html: z.string().optional().nullable(),
  menu_order: z.number().int().optional().nullable(),
  is_active: z.boolean().optional(),
  show_in_navigation: z.boolean().optional(),
});

export async function createSiloAction(formData: FormData) {
  await requireAdminSession();
  const rawMenuOrder = typeof formData.get("menu_order") === "string" ? String(formData.get("menu_order")) : "";
  const parsedMenuOrder = Number.parseInt(rawMenuOrder, 10);
  const payload = CreateSiloSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: toNullableText(formData.get("description")),
    pillar_content_html: toNullableText(formData.get("pillar_content_html")),
    menu_order: Number.isFinite(parsedMenuOrder) ? parsedMenuOrder : null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "1",
    show_in_navigation: formData.get("show_in_navigation") === "on" || formData.get("show_in_navigation") === "1",
  });

  const created = await adminCreateSilo({
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
  });

  await adminUpdateSilo(created.id, {
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    pillar_content_html: payload.pillar_content_html,
    menu_order: payload.menu_order ?? 0,
    is_active: payload.is_active ?? true,
    show_in_navigation: payload.show_in_navigation ?? true,
  });

  redirect(`/admin/silos/${created.slug}`);
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
  menu_order: z.number().int().optional().nullable(),
  is_active: z.boolean().optional(),
  show_in_navigation: z.boolean().optional(),
});

function toNullableText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateSiloAction(formData: FormData) {
  await requireAdminSession();
  const rawMenuOrder = typeof formData.get("menu_order") === "string" ? String(formData.get("menu_order")) : "";
  const parsedMenuOrder = Number.parseInt(rawMenuOrder, 10);
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
    menu_order: Number.isFinite(parsedMenuOrder) ? parsedMenuOrder : null,
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "1",
    show_in_navigation: formData.get("show_in_navigation") === "on" || formData.get("show_in_navigation") === "1",
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
    menu_order: payload.menu_order ?? 0,
    is_active: payload.is_active ?? true,
    show_in_navigation: payload.show_in_navigation ?? true,
  });
  redirect(`/admin/silos/${payload.slug}`);
}

export async function updateSiloPostsMenuAction(formData: FormData) {
  await requireAdminSession();

  const siloId = String(formData.get("silo_id") ?? "");
  const returnToRaw = String(formData.get("return_to") ?? "/admin/silos");
  const modeRaw = String(formData.get("mode") ?? "save");
  const mode = modeRaw === "auto" ? "auto" : "save";

  if (!isUuid(siloId)) {
    redirect("/admin/silos?error=invalid_silo");
  }

  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin/silos";
  const postIds = formData
    .getAll("post_id")
    .map((value) => String(value))
    .filter((value) => isUuid(value));

  if (postIds.length === 0) {
    redirect(returnTo);
  }

  const posts = await adminListPostsBySiloId(siloId);
  const siloGroups = await adminListSiloGroupsBySiloId(siloId, { ensureDefaults: true });
  const validGroupKeys = new Set(siloGroups.map((group) => group.key));
  const postMap = new Map(posts.map((post) => [post.id, post]));
  const hierarchyRows = await adminGetSiloPostsBySiloId(siloId);
  const hierarchyByPostId = new Map(hierarchyRows.map((row) => [row.post_id, row]));

  const buildRow = (postId: string) => {
    const post = postMap.get(postId);
    const hierarchy = hierarchyByPostId.get(postId);
    const role = String(hierarchy?.role ?? post?.silo_role ?? "SUPPORT").toUpperCase();
    const currentGroup = normalizeSiloGroup(post?.silo_group);
    const currentOrderRaw =
      typeof post?.silo_order === "number" && Number.isFinite(post.silo_order)
        ? post.silo_order
        : typeof post?.silo_group_order === "number" && Number.isFinite(post.silo_group_order)
          ? post.silo_group_order
          : 0;
    const currentOrder = Math.max(0, Math.trunc(currentOrderRaw));

    if (role === "PILLAR") {
      return {
        id: postId,
        title: post?.title ?? "",
        group: null,
        order: 0,
        showInMenu: true,
        role,
        locked: true,
      };
    }

    if (role === "AUX") {
      return {
        id: postId,
        title: post?.title ?? "",
        group: null,
        order: 0,
        showInMenu: false,
        role,
        locked: true,
      };
    }

    const rawGroup = String(formData.get(`silo_group_${postId}`) ?? "");
    const normalizedGroupRaw = normalizeSiloGroup(rawGroup);
    const existingGroup = normalizeSiloGroup(post?.silo_group);
    const normalizedGroup =
      normalizedGroupRaw && (validGroupKeys.has(normalizedGroupRaw) || normalizedGroupRaw === existingGroup)
        ? normalizedGroupRaw
        : null;
    const rawOrder = Number.parseInt(String(formData.get(`silo_group_order_${postId}`) ?? "0"), 10);
    const safeOrder = Number.isFinite(rawOrder) ? Math.max(0, Math.trunc(rawOrder)) : 0;
    const checked = formData.get(`show_in_silo_menu_${postId}`) === "1";
    const showInMenu = checked;

    return {
      id: postId,
      title: post?.title ?? "",
      group: normalizedGroup,
      order: safeOrder,
      showInMenu,
      role,
      locked: false,
    };
  };

  const rows = postIds.map(buildRow);

  if (mode === "auto") {
    const rowsByGroup = new Map<string, typeof rows>();
    rows
      .filter((row) => !row.locked)
      .forEach((row) => {
      const key = row.group ?? "__ungrouped__";
      if (!rowsByGroup.has(key)) rowsByGroup.set(key, []);
      rowsByGroup.get(key)!.push(row);
      });

    rowsByGroup.forEach((items) => {
      items.sort((a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR"));
      items.forEach((item, index) => {
        item.order = index + 1;
      });
    });
  }

  for (const row of rows) {
    await adminUpdatePost({
      id: row.id,
      silo_group: row.group,
      silo_order: row.order,
      silo_group_order: row.order,
      show_in_silo_menu: row.showInMenu,
    });
  }

  const silo = await adminGetSiloById(siloId);
  if (silo?.slug) {
    revalidatePath(`/${silo.slug}`);
    revalidatePath(`/silos/${silo.slug}`);
    revalidatePath(`/admin/silos/${silo.slug}`);
  }
  revalidatePath("/");

  redirect(returnTo);
}

function buildActionErrorRedirectPath(returnTo: string, errorCode: string) {
  const separator = returnTo.includes("?") ? "&" : "?";
  return `${returnTo}${separator}error=${encodeURIComponent(errorCode)}`;
}

export async function saveSiloGroupsAction(formData: FormData) {
  await requireAdminSession();

  const siloId = String(formData.get("silo_id") ?? "");
  const returnToRaw = String(formData.get("return_to") ?? "/admin/silos");
  const modeRaw = String(formData.get("mode") ?? "save");
  const mode: "save" | "create" = modeRaw === "create" ? "create" : "save";

  if (!isUuid(siloId)) {
    redirect("/admin/silos?error=invalid_silo");
  }

  const returnTo = returnToRaw.startsWith("/") ? returnToRaw : "/admin/silos";

  try {
    if (mode === "create") {
      const newGroupLabel = normalizeSiloGroupLabel(formData.get("new_group_label"));
      if (!newGroupLabel) {
        redirect(buildActionErrorRedirectPath(returnTo, "group_label_required"));
      }
      await adminCreateSiloGroup({ silo_id: siloId, label: newGroupLabel });
    } else {
      const groupIds = formData
        .getAll("group_id")
        .map((value) => String(value))
        .filter(Boolean);

      const updates = groupIds
        .map((groupId) => {
          const label = normalizeSiloGroupLabel(formData.get(`group_label_${groupId}`));
          const rawOrder = Number.parseInt(String(formData.get(`group_order_${groupId}`) ?? "0"), 10);
          const menuOrder = Number.isFinite(rawOrder) ? Math.max(0, Math.trunc(rawOrder)) : 0;
          return {
            id: groupId,
            label: label ?? "",
            menu_order: menuOrder,
          };
        })
        .filter((item) => item.label.length > 0);

      if (updates.length > 0) {
        await adminUpdateSiloGroups(siloId, updates);
      }
    }
  } catch (error: any) {
    const message = String(error?.message ?? "");
    const code = String(error?.code ?? "").toUpperCase();
    const details = String(error?.details ?? "");
    const hint = String(error?.hint ?? "");
    const relationMissing =
      code === "42P01" ||
      code === "PGRST205" ||
      [message, details, hint].some((part) => {
        const text = part.toLowerCase();
        return (
          text.includes("could not find the table") ||
          (text.includes("relation") && text.includes("does not exist")) ||
          (text.includes("table") && text.includes("does not exist")) ||
          text.includes("silo_groups")
        );
      });

    if (relationMissing) {
      redirect(buildActionErrorRedirectPath(returnTo, "silo_groups_table_missing"));
    }
    if (message === "SILO_GROUPS_TABLE_MISSING") {
      redirect(buildActionErrorRedirectPath(returnTo, "silo_groups_table_missing"));
    }
    if (message === "SILO_GROUP_LABEL_REQUIRED") {
      redirect(buildActionErrorRedirectPath(returnTo, "group_label_required"));
    }
    if (message === "SILO_GROUP_INVALID_KEY") {
      redirect(buildActionErrorRedirectPath(returnTo, "group_key_invalid"));
    }
    if (message === "SILO_GROUP_CREATE_FAILED") {
      redirect(buildActionErrorRedirectPath(returnTo, "group_create_failed"));
    }
    redirect(buildActionErrorRedirectPath(returnTo, "group_save_failed"));
  }

  const silo = await adminGetSiloById(siloId);
  if (silo?.slug) {
    revalidatePath(`/${silo.slug}`);
    revalidatePath(`/silos/${silo.slug}`);
    revalidatePath(`/admin/silos/${silo.slug}`);
  }
  revalidatePath("/");

  redirect(returnTo);
}

const DeleteSiloSchema = z.object({
  id: z.string().uuid(),
  return_to: z.string().optional(),
  confirm_delete: z.literal("1"),
});

function toSafeReturnPath(path: string | null | undefined) {
  if (!path) return "/admin/silos";
  return path.startsWith("/") ? path : "/admin/silos";
}

export async function deleteSiloAction(formData: FormData) {
  await requireAdminSession();

  const returnTo = toSafeReturnPath(
    typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : undefined
  );

  const parsed = DeleteSiloSchema.safeParse({
    id: formData.get("id"),
    return_to: formData.get("return_to"),
    confirm_delete: formData.get("confirm_delete"),
  });

  if (!parsed.success) {
    redirect(`${returnTo}?error=confirm_required`);
  }

  try {
    await adminDeleteSilo(parsed.data.id);
    redirect("/admin/silos?deleted=1");
  } catch (error: any) {
    const message = String(error?.message || "");
    if (message === "SILO_HAS_POSTS") {
      redirect(`${returnTo}?error=has_posts`);
    }
    if (message === "SILO_HAS_BATCHES") {
      redirect(`${returnTo}?error=has_batches`);
    }
    redirect(`${returnTo}?error=delete_failed`);
  }
}
