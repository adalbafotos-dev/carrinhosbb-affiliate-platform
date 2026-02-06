"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  adminFindTargetKeywordConflict,
  adminGetPostById,
  adminGetPostLinks,
  adminPublishPost,
  adminReplacePostLinks,
  adminUpdatePost,
  adminUpsertSiloPost,
} from "@/lib/db";
import { requireAdminSession } from "@/lib/admin/auth";

const SaveSchema = z.object({
  id: z.string().uuid(),
  silo_id: z.string().uuid().nullable().optional(),
  silo_role: z.enum(["PILLAR", "SUPPORT", "AUX"]).nullable().optional(),
  silo_position: z.number().int().min(1).max(100).nullable().optional(),
  title: z.string().min(3).max(180),
  seo_title: z.string().max(180).nullable().optional(),
  meta_title: z.string().max(180).nullable().optional(),
  slug: z.string().min(3).max(180),
  target_keyword: z.string().min(2).max(180),
  supporting_keywords: z.array(z.string()).optional(),
  meta_description: z.string().max(800).nullable().optional(),
  canonical_path: z.string().max(220).nullable().optional(),
  entities: z.array(z.string()).optional(),
  schema_type: z.enum(["article", "review", "faq", "howto"]).optional(),
  faq_json: z.any().optional(),
  howto_json: z.any().optional(),
  hero_image_url: z.string().nullable().optional(),
  hero_image_alt: z.string().nullable().optional(),
  og_image_url: z.string().nullable().optional(),
  images: z.any().optional(),
  cover_image: z.string().nullable().optional(),
  author_name: z.string().max(120).nullable().optional(),
  expert_name: z.string().max(120).nullable().optional(),
  expert_role: z.string().max(120).nullable().optional(),
  expert_bio: z.string().max(500).nullable().optional(),
  expert_credentials: z.string().max(240).nullable().optional(),
  reviewed_by: z.string().max(120).nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  sources: z.any().optional(),
  disclaimer: z.string().max(500).nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  status: z.enum(["draft", "review", "scheduled", "published"]).optional(),
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

  const post = await adminGetPostById(data.id);
  if (!post) {
    throw new Error("Post nao encontrado");
  }

  const coverImage =
    typeof data.cover_image === "string" ? (data.cover_image.trim() ? data.cover_image.trim() : null) : undefined;
  const metaDescription =
    typeof data.meta_description === "string"
      ? data.meta_description.trim()
        ? data.meta_description.trim()
        : null
      : undefined;
  const metaTitle =
    typeof data.meta_title === "string" ? (data.meta_title.trim() ? data.meta_title.trim() : null) : undefined;
  const authorName =
    typeof data.author_name === "string" ? (data.author_name.trim() ? data.author_name.trim() : null) : undefined;
  const scheduledAt =
    typeof data.scheduled_at === "string"
      ? data.scheduled_at.trim()
        ? new Date(data.scheduled_at).toISOString()
        : null
      : undefined;
  const reviewedAt =
    typeof data.reviewed_at === "string"
      ? data.reviewed_at.trim()
        ? new Date(data.reviewed_at).toISOString()
        : null
      : undefined;

  await adminUpdatePost({
    id: data.id,
    silo_id: data.silo_id ?? undefined,
    title: data.title,
    seo_title: data.seo_title?.trim() || null,
    meta_title: metaTitle,
    slug: data.slug,
    target_keyword: data.target_keyword,
    supporting_keywords: data.supporting_keywords ?? [],
    meta_description: metaDescription,
    canonical_path: data.canonical_path?.trim() || null,
    entities: data.entities ?? [],
    schema_type: data.schema_type ?? undefined,
    faq_json: data.faq_json ?? null,
    howto_json: data.howto_json ?? null,
    hero_image_url: data.hero_image_url?.trim() || null,
    hero_image_alt: data.hero_image_alt?.trim() || null,
    og_image_url: data.og_image_url?.trim() || null,
    images: data.images ?? [],
    cover_image: coverImage,
    author_name: authorName,
    expert_name: data.expert_name?.trim() || null,
    expert_role: data.expert_role?.trim() || null,
    expert_bio: data.expert_bio?.trim() || null,
    expert_credentials: data.expert_credentials?.trim() || null,
    reviewed_by: data.reviewed_by?.trim() || null,
    reviewed_at: reviewedAt,
    sources: data.sources ?? [],
    disclaimer: data.disclaimer?.trim() || null,
    scheduled_at: scheduledAt,
    status: data.status ?? undefined,
    content_json: data.content_json,
    content_html: data.content_html,
    amazon_products: data.amazon_products ?? null,
  });

  let links: ExtractedLink[] = [];
  try {
    links = extractLinksFromJson(data.content_json, {
      siloSlug: post?.silo?.slug ?? null,
    });
  } catch (error) {
    console.error("Falha ao extrair links do JSON, continuando sem links", error);
    links = [];
  }
  try {
    if (links.length) {
      await adminReplacePostLinks(
        data.id,
        links.map((link) => ({
          target_post_id: link.target_post_id,
          target_url: link.target_url,
          anchor_text: link.anchor_text,
          link_type: link.link_type,
          rel_flags: link.rel_flags,
          is_blank: link.is_blank,
        }))
      );
    } else {
      await adminReplacePostLinks(data.id, []);
    }
  } catch (error) {
    console.error("Nao foi possivel sincronizar post_links, seguindo com o save do post", error);
  }

  // ========================================
  // SYNC LINK OCCURRENCES (SILO V2)
  // ========================================
  const finalSiloId = data.silo_id ?? post.silo_id;
  if (finalSiloId && data.content_html) {
    try {
      const { syncLinkOccurrences } = await import("@/lib/silo/siloService");
      await syncLinkOccurrences(finalSiloId, data.id, data.content_html);
    } catch (error) {
      console.error("Erro ao sincronizar ocorrencias de links (V2):", error);
    }
  }

  // ========================================
  // SALVAR HIERARQUIA DO SILO (role + position)
  // ========================================
  if (data.silo_id && (data.silo_role || typeof data.silo_position === "number")) {
    try {
      // Validação: apenas 1 pilar por silo
      if (data.silo_role === "PILLAR") {
        const { adminGetSiloPostsBySiloId } = await import("@/lib/db");
        const existingPosts = await adminGetSiloPostsBySiloId(data.silo_id);
        const existingPillar = existingPosts.find((sp) => sp.role === "PILLAR" && sp.post_id !== data.id);

        if (existingPillar) {
          throw new Error("Já existe um post Pilar nesse silo. Remova o outro pilar primeiro ou mude o papel.");
        }
      }

      // Validação: posição única dentro do silo
      if (typeof data.silo_position === "number") {
        const { adminGetSiloPostsBySiloId } = await import("@/lib/db");
        const existingPosts = await adminGetSiloPostsBySiloId(data.silo_id);
        const positionConflict = existingPosts.find(
          (sp) => sp.position === data.silo_position && sp.post_id !== data.id
        );

        if (positionConflict) {
          throw new Error(`Posição ${data.silo_position} já está ocupada por outro post neste silo.`);
        }
      }

      // Salvar hierarquia
      const { adminUpsertSiloPost } = await import("@/lib/db");
      await adminUpsertSiloPost({
        silo_id: data.silo_id,
        post_id: data.id,
        role: data.silo_role || undefined,
        position: data.silo_position || undefined,
      });
    } catch (error) {
      console.error("Erro ao salvar hierarquia do silo:", error);
      throw error; // Re-throw para mostrar erro ao usuário
    }
  }



  if ((data.status ?? undefined) === "published") {
    const validation = await validatePostForPublish(data.id, { links, html: data.content_html ?? "", title: data.title, target_keyword: data.target_keyword, meta_description: metaDescription ?? "" });
    if (validation.errors.length) {
      throw new Error(validation.errors.join(" | "));
    }
  }

  await revalidatePostPaths(data.id);
  return { ok: true as const };
}

export async function setEditorPublishState(payload: unknown) {
  await requireAdminSession();
  const data = PublishSchema.parse(payload);

  if (data.published) {
    const validation = await validatePostForPublish(data.id);
    if (validation.errors.length) {
      throw new Error(validation.errors.join(" | "));
    }
  }

  await adminPublishPost({ id: data.id, published: data.published });
  await revalidatePostPaths(data.id);
  return { ok: true as const };
}

type ExtractedLink = {
  target_post_id: string | null;
  target_url: string | null;
  anchor_text: string;
  link_type: "internal" | "external" | "affiliate" | "about" | "mention";
  rel_flags: string[];
  is_blank: boolean;
};

function walkNode(node: any, activeMarks: any[], links: ExtractedLink[], ctx: { siloSlug: string | null }) {
  if (!node) return;

  // mention node
  if (node.type === "mention") {
    try {
      const rawHref = node.attrs?.href;
      if (typeof rawHref !== "string") return;
      const anchor = node.attrs?.label ?? "";
      links.push({
        target_post_id: node.attrs?.id ?? null,
        target_url: rawHref || null,
        anchor_text: anchor,
        link_type: "mention",
        rel_flags: [],
        is_blank: false,
      });
    } catch {
      return;
    }
    return;
  }

  const marks = Array.isArray(node.marks) ? node.marks : activeMarks;
  if (node.type === "text") {
    const linkMark = marks?.find((m: any) => m.type === "link");
    if (linkMark) {
      try {
        const attrs = linkMark.attrs ?? {};
        const rawHref = attrs.href;
        if (typeof rawHref !== "string") return;
        const href = rawHref;
        if (!href) return;
        const rel = String(attrs.rel ?? "");
        const relFlags = rel
          .split(/\s+/)
          .map((r) => r.trim())
          .filter(Boolean);
        const isAffiliate = relFlags.includes("sponsored");
        const linkType: ExtractedLink["link_type"] =
          attrs["data-link-type"] ??
          (attrs["data-entity-type"] === "about" ? "about" : isAffiliate ? "affiliate" : href.startsWith("/") ? "internal" : "external");
        const targetPostId = attrs["data-post-id"] ?? null;
        links.push({
          target_post_id: targetPostId || null,
          target_url: href || null,
          anchor_text: node.text ?? "",
          link_type: linkType,
          rel_flags: relFlags,
          is_blank: attrs.target === "_blank",
        });
      } catch {
        return;
      }
    }
  }

  if (Array.isArray(node.content)) {
    node.content.forEach((child: any) => walkNode(child, marks ?? [], links, ctx));
  }
}

function extractLinksFromJson(json: any, ctx: { siloSlug: string | null }): ExtractedLink[] {
  if (!json) return [];
  const links: ExtractedLink[] = [];
  walkNode(json, [], links, ctx);
  return links;
}

function wordCountFromHtml(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

function extractListItemsFromHtml(html: string, limit = 5) {
  if (!html) return [];
  const items: string[] = [];
  const listMatch = html.match(/<(ol|ul)[^>]*>([\s\S]*?)<\/\1>/i);
  if (!listMatch) return items;
  const listHtml = listMatch[2] ?? "";
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = liRegex.exec(listHtml)) && items.length < limit) {
    const raw = match[1] ?? "";
    const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) items.push(text);
  }
  return items;
}

function detectFaqFromHtml(html: string, limit = 3) {
  if (!html) return [];
  const faqs: Array<{ question: string; answer: string }> = [];
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = h2Regex.exec(html)) && faqs.length < limit) {
    const q = (match[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const a = (match[2] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (q.endsWith("?") && a) {
      faqs.push({ question: q, answer: a });
    }
  }
  return faqs;
}

function detectYouTubeEmbed(html: string) {
  if (!html) return false;
  return /youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\//i.test(html);
}

function anchorWordCount(links: ExtractedLink[]) {
  return links.reduce((acc, link) => {
    const words = (link.anchor_text || "").trim().split(/\s+/).filter(Boolean).length;
    return acc + words;
  }, 0);
}

export async function validatePostForPublish(
  postId: string,
  opts?: { links?: ExtractedLink[]; html?: string; title?: string; target_keyword?: string; meta_description?: string }
) {
  const post = await adminGetPostById(postId);
  if (!post) {
    return { errors: ["Post nao encontrado"], warnings: [] };
  }

  const links = opts?.links ?? extractLinksFromJson(post.content_json, { siloSlug: post.silo?.slug ?? null });
  const html = opts?.html ?? post.content_html ?? "";
  const totalWords = wordCountFromHtml(html);
  const anchorWords = anchorWordCount(links);
  const density = totalWords ? (anchorWords / totalWords) * 100 : 0;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!post.title || !post.slug || !(opts?.target_keyword ?? post.target_keyword)) {
    errors.push("Campos obrigatorios ausentes (titulo, slug ou target keyword)");
  }
  if (!post.meta_description && !(opts?.meta_description)) {
    warnings.push("Meta description ausente");
  }
  if (post.hero_image_url && !post.hero_image_alt) {
    errors.push("Alt text da imagem de capa é obrigatório");
  }

  const siloSlug = post.silo?.slug ?? null;
  if (siloSlug) {
    const hasLinkToSilo = links.some((l) => typeof l.target_url === "string" && l.target_url.startsWith(`/${siloSlug}`));
    if (!hasLinkToSilo) {
      errors.push("Necessario pelo menos um link interno para a pagina do silo");
    }
  }

  const badAffiliate = links.filter((l) => {
    const flags = l.rel_flags ?? [];
    const isAffiliate = l.link_type === "affiliate" || flags.includes("sponsored");
    return isAffiliate && !flags.includes("sponsored");
  });
  if (badAffiliate.length) {
    errors.push("Links de afiliado precisam de rel=sponsored");
  }

  if (density > 4) {
    errors.push("Densidade de ancora acima de 4%");
  } else if (density > 3) {
    warnings.push("Densidade de ancora acima de 3%");
  }

  const targetKw = opts?.target_keyword ?? post.target_keyword;
  if (post.silo_id && targetKw) {
    const conflict = await adminFindTargetKeywordConflict({
      silo_id: post.silo_id,
      target_keyword: targetKw,
      exclude_id: post.id,
    });
    if (conflict) {
      warnings.push("Possivel canibalizacao: target keyword duplicada no silo");
    }
  }

  const storedLinks = await adminGetPostLinks(postId);
  const duplicateAnchors = new Map<string, number>();
  storedLinks.forEach((l) => {
    const anchor = (l.anchor_text ?? "").trim().toLowerCase();
    if (!anchor) return;
    duplicateAnchors.set(anchor, (duplicateAnchors.get(anchor) ?? 0) + 1);
  });
  const repeated = Array.from(duplicateAnchors.entries()).filter(([, count]) => count > 2);
  if (repeated.length) {
    warnings.push("Ancoras repetidas mais de 2x no mesmo post");
  }

  // Schema checklist
  const schemaType = post.schema_type ?? "article";
  if (schemaType === "review") {
    const products = Array.isArray(post.amazon_products) ? post.amazon_products : [];
    if (!products.length) {
      errors.push("Schema Review exige pelo menos 1 produto (amazon_products)");
    }
  }
  if (schemaType === "howto") {
    const steps = Array.isArray(post.howto_json) ? post.howto_json : [];
    if (!steps.length) {
      errors.push("Schema HowTo exige passos (howto_json) ou conteúdo estruturado");
    }
  }
  if (schemaType === "faq") {
    const faq = Array.isArray(post.faq_json) ? post.faq_json : [];
    const detectedFaq = detectFaqFromHtml(html);
    if (!faq.length && !detectedFaq.length) {
      errors.push("Schema FAQ exige perguntas e respostas (faq_json ou H2 + parágrafo)");
    }
  }

  const title = opts?.title ?? post.title ?? "";
  const isTopList = /top|melhor|melhores|lista|ranking/i.test(title);
  if (isTopList) {
    const listItems = extractListItemsFromHtml(html);
    if (listItems.length === 0) {
      warnings.push("Artigo Top Lista detectado, mas nenhuma lista <ol>/<ul> foi encontrada");
    }
  }

  const mentionsVideo = /video|vídeo/i.test(title);
  if (mentionsVideo && !detectYouTubeEmbed(html)) {
    warnings.push("Artigo com vídeo no título, mas nenhum embed do YouTube foi detectado");
  }

  return { errors, warnings };
}
