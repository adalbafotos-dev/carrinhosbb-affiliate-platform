import { getPublicSupabase } from "@/lib/supabase/public";
import type { Post, PostLink, PostWithSilo, Silo, SiloBatch, SiloBatchPost } from "@/lib/types";

function hasPublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function getAdminSupabaseClient() {
  const { getAdminSupabase } = await import("@/lib/supabase/admin");
  return getAdminSupabase();
}

function getMissingColumnFromError(error: any): string | null {
  if (!error) return null;
  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ");

  const patterns = [
    /column\s+(?:["]?[a-zA-Z0-9_]+["]?\.)*["]?([a-zA-Z0-9_]+)["]?\s+does not exist/i,
    /Could not find the '([a-zA-Z0-9_]+)' column/i,
    /missing column:\s*["']?([a-zA-Z0-9_]+)["']?/i,
  ];

  for (const regex of patterns) {
    const match = regex.exec(message);
    if (match?.[1]) return match[1];
  }

  return null;
}

const REQUIRED_POST_COLUMNS = [
  "meta_title",
  "meta_description",
  "seo_title",
  "schema_type",
  "canonical_path",
  "entities",
  "supporting_keywords",
  "hero_image_url",
  "hero_image_alt",
  "og_image_url",
  "images",
  "cover_image",
  "author_name",
  "expert_name",
  "expert_role",
  "expert_bio",
  "expert_credentials",
  "reviewed_by",
  "reviewed_at",
  "sources",
  "disclaimer",
  "faq_json",
  "howto_json",
  "content_json",
  "content_html",
  "status",
  "published",
  "published_at",
  "scheduled_at",
  "amazon_products",
];

export async function detectMissingPostColumns(): Promise<string[]> {
  const supabase = await getAdminSupabaseClient();
  const missing = new Set<string>();

  for (const col of REQUIRED_POST_COLUMNS) {
    const { error } = await supabase.from("posts").select(col).limit(0);
    if (!error) continue;
    const miss = getMissingColumnFromError(error);
    if (miss) {
      missing.add(miss);
    } else {
      // fallback: assume the requested column is missing if error is ambiguous
      missing.add(col);
    }
  }

  return Array.from(missing);
}

// --- Public (uses anon key, published only) ---

export async function getPublicSilos(): Promise<Silo[]> {
  if (!hasPublicEnv()) return [];
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("silos")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Silo[];
}

export async function getPublicSiloBySlug(slug: string): Promise<Silo | null> {
  if (!hasPublicEnv()) return null;
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("silos")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Silo | null;
}

export async function getPublicPostsBySilo(siloSlug: string): Promise<Post[]> {
  if (!hasPublicEnv()) return [];
  const supabase = getPublicSupabase();
  const silo = await getPublicSiloBySlug(siloSlug);
  if (!silo) return [];

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("silo_id", silo.id)
    .eq("published", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Post[];
}

export async function listLatestPublicPosts(limit = 8): Promise<Array<PostWithSilo>> {
  if (!hasPublicEnv()) return [];
  const supabase = getPublicSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select("*, silos: silo_id (slug, name)")
    .eq("published", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...(row as Post),
    silo: row.silos ? { slug: row.silos.slug, name: row.silos.name } : null,
  })) as Array<PostWithSilo>;
}

export async function getPublicPostBySlug(siloSlug: string, postSlug: string): Promise<PostWithSilo | null> {
  if (!hasPublicEnv()) return null;
  const supabase = getPublicSupabase();
  const silo = await getPublicSiloBySlug(siloSlug);
  if (!silo) return null;

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", postSlug)
    .eq("silo_id", silo.id)
    .eq("published", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { ...(data as Post), silo: { slug: silo.slug, name: silo.name } };
}

export async function listAllSiloSlugs(): Promise<string[]> {
  const silos = await getPublicSilos();
  return silos.map((s) => s.slug);
}

export async function listAllPostParams(): Promise<Array<{ silo: string; slug: string }>> {
  if (!hasPublicEnv()) return [];
  const supabase = getPublicSupabase();

  const { data: posts, error: postError } = await supabase
    .from("posts")
    .select("slug,silo_id")
    .eq("published", true);

  if (postError) throw postError;

  const { data: silos, error: siloError } = await supabase.from("silos").select("id,slug");
  if (siloError) throw siloError;

  const siloMap = new Map<string, string>((silos ?? []).map((s: any) => [s.id, s.slug]));
  return (posts ?? [])
    .map((p: any) => ({ silo: siloMap.get(p.silo_id) ?? "", slug: p.slug }))
    .filter((x: any) => Boolean(x.silo && x.slug));
}

// --- Admin (server-only; uses Service Role) ---

export async function adminListPosts(args: { published?: boolean | null; status?: string | null; query?: string | null } = {}): Promise<Array<PostWithSilo>> {
  const supabase = await getAdminSupabaseClient();
  let query = supabase
    .from("posts")
    .select("*, silos: silo_id (slug, name)")
    .order("updated_at", { ascending: false });

  if (args.status) {
    query = query.eq("status", args.status);
  } else if (typeof args.published === "boolean") {
    query = query.eq("published", args.published);
  }

  if (args.query) {
    const term = args.query.trim();
    if (term) {
      query = query.or(`title.ilike.%${term}%,slug.ilike.%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...(row as Post),
    silo: row.silos ? { slug: row.silos.slug, name: row.silos.name } : null,
  })) as Array<PostWithSilo>;
}

export async function adminGetPostById(id: string): Promise<PostWithSilo | null> {
  const supabase = await getAdminSupabaseClient();

  const { data, error } = await supabase
    .from("posts")
    .select("*, silos: silo_id (slug, name)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row: any = data;
  return {
    ...(row as Post),
    silo: row.silos ? { slug: row.silos.slug, name: row.silos.name } : null,
  } as PostWithSilo;
}

export async function adminGetPostBySlug(siloSlug: string, postSlug: string): Promise<PostWithSilo | null> {
  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*, silos: silo_id (slug, name)")
    .eq("slug", postSlug)
    .eq("silos.slug", siloSlug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as Post),
    silo: (data as any).silos ? { slug: (data as any).silos.slug, name: (data as any).silos.name } : null,
  } as PostWithSilo;
}

export async function adminDeletePosts(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase.from("posts").delete().in("id", ids);
  if (error) throw error;
}

export async function adminCreatePost(args: {
  silo_id: string | null;
  title: string;
  seo_title?: string | null;
  meta_title?: string | null;
  slug: string;
  target_keyword: string;
  supporting_keywords?: string[] | null;
  meta_description?: string | null;
  canonical_path?: string | null;
  entities?: string[] | null;
  schema_type?: "article" | "review" | "faq" | "howto" | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  og_image_url?: string | null;
  images?: any[] | null;
  cover_image?: string | null;
  author_name?: string | null;
  expert_name?: string | null;
  expert_role?: string | null;
  expert_bio?: string | null;
  expert_credentials?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  sources?: any[] | null;
  disclaimer?: string | null;
  scheduled_at?: string | null;
  status?: "draft" | "review" | "scheduled" | "published" | null;
  published_at?: string | null;
  faq_json?: any | null;
  howto_json?: any | null;
  amazon_products?: any | null;
  content_json?: any | null;
  content_html?: string | null;
}): Promise<PostWithSilo> {
  const supabase = await getAdminSupabaseClient();
  const now = new Date().toISOString();
  const status = args.status ?? "draft";
  const published = status === "published";
  const defaultDoc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: args.target_keyword ? `Comece falando sobre ${args.target_keyword}.` : "Comece a escrever seu review.",
          },
        ],
      },
    ],
  };

  let body: Record<string, any> = {
    silo_id: args.silo_id ?? null,
    title: args.title,
    seo_title: args.seo_title ?? null,
    meta_title: args.meta_title ?? args.seo_title ?? args.title,
    slug: args.slug,
    target_keyword: args.target_keyword,
    supporting_keywords: args.supporting_keywords ?? [],
    meta_description: args.meta_description ?? null,
    canonical_path: args.canonical_path ?? null,
    entities: args.entities ?? [],
    schema_type: args.schema_type ?? "article",
    hero_image_url: args.hero_image_url ?? null,
    hero_image_alt: args.hero_image_alt ?? null,
    og_image_url: args.og_image_url ?? null,
    images: args.images ?? [],
    cover_image: args.cover_image ?? null,
    author_name: args.author_name ?? null,
    expert_name: args.expert_name ?? null,
    expert_role: args.expert_role ?? null,
    expert_bio: args.expert_bio ?? null,
    expert_credentials: args.expert_credentials ?? null,
    reviewed_by: args.reviewed_by ?? null,
    reviewed_at: args.reviewed_at ?? null,
    sources: args.sources ?? [],
    disclaimer: args.disclaimer ?? null,
    scheduled_at: args.scheduled_at ?? null,
    published,
    published_at: published ? args.published_at ?? now : null,
    status,
    faq_json: args.faq_json ?? [],
    howto_json: args.howto_json ?? [],
    amazon_products: args.amazon_products ?? [],
    content_json: args.content_json ?? defaultDoc,
    content_html: args.content_html ?? "",
    updated_at: now,
  };

  const tryInsert = async (payload: Record<string, any>) =>
    supabase.from("posts").insert(payload).select("*, silos: silo_id (slug, name)").maybeSingle();

  for (let i = 0; i < 5; i++) {
    const { data, error } = await tryInsert(body);
    if (!error) {
      if (!data) throw new Error("Falha ao criar o post.");
      const row: any = data;
      return {
        ...(row as Post),
        silo: row.silos ? { slug: row.silos.slug, name: row.silos.name } : null,
      } as PostWithSilo;
    }

    const missingColumn = getMissingColumnFromError(error);
    if (missingColumn && missingColumn in body) {
      throw new Error(
        `Coluna ausente em posts (${missingColumn}). Rode a migration supabase/migrations/20260122_01_add_post_editor_fields.sql e NOTIFY pgrst, 'reload schema';`
      );
    }

    throw error;
  }

  const { data, error } = await tryInsert(body);
  if (error) throw error;
  if (!data) throw new Error("Falha ao criar o post.");
  const row: any = data;
  return {
    ...(row as Post),
    silo: row.silos ? { slug: row.silos.slug, name: row.silos.name } : null,
  } as PostWithSilo;
}

export async function adminCreateDraftPost(args: {
  silo_id: string;
  title: string;
  slug: string;
  target_keyword: string;
  supporting_keywords?: string[] | null;
  meta_description?: string | null;
  entities?: string[] | null;
}): Promise<PostWithSilo> {
  return adminCreatePost({
    ...args,
    status: "draft",
    published_at: null,
  });
}

export async function adminUpdatePost(args: {
  id: string;
  silo_id?: string | null;
  title?: string;
  seo_title?: string | null;
  meta_title?: string | null;
  slug?: string;
  target_keyword?: string;
  supporting_keywords?: string[] | null;
  meta_description?: string | null;
  canonical_path?: string | null;
  entities?: string[] | null;
  faq_json?: any | null;
  howto_json?: any | null;
  schema_type?: "article" | "review" | "faq" | "howto" | null;
  cover_image?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  og_image_url?: string | null;
  images?: any[] | null;
  author_name?: string | null;
  expert_name?: string | null;
  expert_role?: string | null;
  expert_bio?: string | null;
  expert_credentials?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  sources?: any[] | null;
  disclaimer?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  status?: "draft" | "review" | "scheduled" | "published" | null;
  content_json?: any;
  content_html?: string;
  amazon_products?: any;
}): Promise<void> {
  const supabase = await getAdminSupabaseClient();
  const now = new Date().toISOString();

  const update: Record<string, any> = {
    updated_at: now,
  };

  if (typeof args.silo_id !== "undefined") update.silo_id = args.silo_id;
  if (typeof args.title !== "undefined") update.title = args.title;
  if (typeof args.seo_title !== "undefined") update.seo_title = args.seo_title;
  if (typeof args.meta_title !== "undefined") update.meta_title = args.meta_title;
  if (typeof args.slug !== "undefined") update.slug = args.slug;
  if (typeof args.target_keyword !== "undefined") update.target_keyword = args.target_keyword;
  if (typeof args.supporting_keywords !== "undefined") update.supporting_keywords = args.supporting_keywords ?? [];
  if (typeof args.meta_description !== "undefined") update.meta_description = args.meta_description;
  if (typeof args.canonical_path !== "undefined") update.canonical_path = args.canonical_path;
  if (typeof args.entities !== "undefined") update.entities = args.entities;
  if (typeof args.faq_json !== "undefined") update.faq_json = args.faq_json ?? [];
  if (typeof args.howto_json !== "undefined") update.howto_json = args.howto_json ?? [];
  if (typeof args.schema_type !== "undefined") update.schema_type = args.schema_type;
  if (typeof args.cover_image !== "undefined") update.cover_image = args.cover_image;
  if (typeof args.hero_image_url !== "undefined") update.hero_image_url = args.hero_image_url;
  if (typeof args.hero_image_alt !== "undefined") update.hero_image_alt = args.hero_image_alt;
  if (typeof args.og_image_url !== "undefined") update.og_image_url = args.og_image_url;
  if (typeof args.images !== "undefined") update.images = args.images ?? [];
  if (typeof args.author_name !== "undefined") update.author_name = args.author_name;
  if (typeof args.expert_name !== "undefined") update.expert_name = args.expert_name;
  if (typeof args.expert_role !== "undefined") update.expert_role = args.expert_role;
  if (typeof args.expert_bio !== "undefined") update.expert_bio = args.expert_bio;
  if (typeof args.expert_credentials !== "undefined") update.expert_credentials = args.expert_credentials;
  if (typeof args.reviewed_by !== "undefined") update.reviewed_by = args.reviewed_by;
  if (typeof args.reviewed_at !== "undefined") update.reviewed_at = args.reviewed_at;
  if (typeof args.sources !== "undefined") update.sources = args.sources ?? [];
  if (typeof args.disclaimer !== "undefined") update.disclaimer = args.disclaimer;
  if (typeof args.scheduled_at !== "undefined") update.scheduled_at = args.scheduled_at;
  if (typeof args.published_at !== "undefined") update.published_at = args.published_at;
  if (typeof args.status !== "undefined") {
    update.status = args.status;
    update.published = args.status === "published";
    if (args.status === "published") {
      update.published_at = args.published_at ?? now;
    } else {
      update.published_at = null;
    }
  }
  if (typeof args.content_json !== "undefined") update.content_json = args.content_json;
  if (typeof args.content_html !== "undefined") update.content_html = args.content_html;
  if (typeof args.amazon_products !== "undefined") update.amazon_products = args.amazon_products ?? [];

  const { error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", args.id);

  if (error) {
    const missingColumn = getMissingColumnFromError(error);
    if (missingColumn && missingColumn in update) {
      const { [missingColumn]: _, ...rest } = update;
      const { error: retryError } = await supabase.from("posts").update(rest).eq("id", args.id);
      if (retryError) throw retryError;
      return;
    }
    throw error;
  }
}

export async function adminPublishPost(args: { id: string; published: boolean }): Promise<void> {
  const supabase = await getAdminSupabaseClient();
  const now = new Date().toISOString();
  const status = args.published ? "published" : "draft";
  const { error } = await supabase
    .from("posts")
    .update({
      published: args.published,
      status,
      published_at: args.published ? now : null,
      updated_at: now,
    })
    .eq("id", args.id);

  if (error) throw error;
}

export async function adminListSilos(): Promise<Silo[]> {
  const supabase = await getAdminSupabaseClient();
  const baseQuery = () => supabase.from("silos").select("*").order("created_at", { ascending: true });

  const { data, error } = await baseQuery().order("menu_order", { ascending: true });
  const missingColumn = getMissingColumnFromError(error);
  if (missingColumn) {
    const { data: fallback, error: fallbackError } = await baseQuery();
    if (fallbackError) throw fallbackError;
    return (fallback ?? []) as Silo[];
  }
  if (error) throw error;
  return (data ?? []) as Silo[];
}

export async function adminGetSiloBySlug(slug: string): Promise<Silo | null> {
  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase.from("silos").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Silo | null;
}

export async function adminGetSiloById(id: string): Promise<Silo | null> {
  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase.from("silos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Silo | null;
}

export async function adminCreateSilo(args: {
  name: string;
  slug: string;
  description?: string | null;
}): Promise<Silo> {
  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("silos")
    .insert({
      name: args.name,
      slug: args.slug,
      description: args.description ?? null,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Falha ao criar o silo.");
  return data as Silo;
}

export async function adminUpdateSilo(id: string, patch: Partial<Silo>): Promise<Silo> {
  const supabase = await getAdminSupabaseClient();
  const tryUpdate = async (body: Record<string, any>) =>
    supabase.from("silos").update(body).eq("id", id).select("*").maybeSingle();

  let body: Record<string, any> = { ...patch };

  for (let i = 0; i < 5; i++) {
    const { data, error } = await tryUpdate(body);
    if (!error) {
      if (!data) throw new Error("Falha ao atualizar silo");
      return data as Silo;
    }

    const missingColumn = getMissingColumnFromError(error);
    if (missingColumn) {
      if (missingColumn in body) {
        // Remove o campo ausente para manter compatibilidade com bases nao migradas.
        const { [missingColumn]: _, ...rest } = body;
        body = rest;
        if (Object.keys(body).length === 0) break;
        continue;
      }

      const minimal: Record<string, any> = {};
      if (typeof patch.name !== "undefined") minimal.name = patch.name;
      if (typeof patch.slug !== "undefined") minimal.slug = patch.slug;
      if (typeof patch.description !== "undefined") minimal.description = patch.description;
      if (Object.keys(minimal).length === 0) throw error;
      body = minimal;
      continue;
    }

    throw error;
  }

  const { data, error } = await tryUpdate(body);
  if (error) throw error;
  if (!data) throw new Error("Falha ao atualizar silo");
  return data as Silo;
}

export async function adminSearchPostsByTitle(query: string, limit = 10): Promise<Array<{ id: string; title: string; slug: string; silo_slug: string }>> {
  const supabase = await getAdminSupabaseClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id,title,slug,silo_id")
    .ilike("title", `%${query}%`)
    .limit(limit);

  if (error) throw error;

  const siloIds = Array.from(new Set((data ?? []).map((p: any) => p.silo_id).filter(Boolean)));
  const { data: silos, error: siloError } = await supabase.from("silos").select("id,slug").in("id", siloIds);
  if (siloError) throw siloError;
  const siloMap = new Map<string, string>((silos ?? []).map((s: any) => [s.id, s.slug]));

  return (data ?? [])
    .map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      silo_slug: siloMap.get(p.silo_id) ?? "",
    }))
    .filter((p: any) => Boolean(p.silo_slug));
}

export async function adminFindTargetKeywordConflict(args: {
  silo_id: string | null;
  target_keyword: string;
  exclude_id?: string;
}): Promise<Post | null> {
  const supabase = await getAdminSupabaseClient();
  let query = supabase.from("posts").select("*").eq("target_keyword", args.target_keyword);
  if (args.silo_id) {
    query = query.eq("silo_id", args.silo_id);
  }
  if (args.exclude_id) {
    query = query.neq("id", args.exclude_id);
  }
  const { data, error } = await query.limit(1);
  if (error) throw error;
  return data && data.length ? (data[0] as Post) : null;
}

// --- Guardian do Silo ---

export async function adminCreateSiloBatch(args: {
  silo_id: string;
  name: string;
  status?: "draft" | "review" | "scheduled" | "published";
}): Promise<SiloBatch> {
  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("silo_batches")
    .insert({
      silo_id: args.silo_id,
      name: args.name,
      status: args.status ?? "draft",
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Falha ao criar batch");
  return data as SiloBatch;
}

export async function adminAddPostToBatch(args: { batch_id: string; post_id: string; position?: number }) {
  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase.from("silo_batch_posts").insert({
    batch_id: args.batch_id,
    post_id: args.post_id,
    position: args.position ?? 1,
  });
  if (error) throw error;
}

export async function adminListBatchPosts(batchId: string): Promise<Array<SiloBatchPost & { post: PostWithSilo }>> {
  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase
    .from("silo_batch_posts")
    .select("*, posts: post_id (*, silos: silo_id (slug, name))")
    .eq("batch_id", batchId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    batch_id: row.batch_id,
    post_id: row.post_id,
    position: row.position,
    created_at: row.created_at,
    post: row.posts
      ? {
          ...(row.posts as Post),
          silo: row.posts.silos ? { slug: row.posts.silos.slug, name: row.posts.silos.name } : null,
        }
      : (null as any),
  }));
}

export async function adminReplacePostLinks(postId: string, links: Array<Omit<PostLink, "id" | "source_post_id" | "created_at">>) {
  const supabase = await getAdminSupabaseClient();
  const { error: delError } = await supabase.from("post_links").delete().eq("source_post_id", postId);
  if (delError) throw delError;

  if (!links.length) return;

  const deduped = (() => {
    const seen = new Set<string>();
    const result: typeof links = [];
    for (const link of links) {
      const key = [
        link.target_post_id ?? "",
        link.target_url ?? "",
        link.anchor_text ?? "",
        link.link_type ?? "",
        (link.rel_flags ?? []).join(","),
        link.is_blank ? "1" : "0",
      ].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(link);
    }
    return result;
  })();

  for (const link of deduped) {
    const payload = {
      source_post_id: postId,
      target_post_id: link.target_post_id ?? null,
      target_url: link.target_url ?? null,
      anchor_text: link.anchor_text ?? null,
      link_type: link.link_type,
      rel_flags: link.rel_flags ?? [],
      is_blank: Boolean(link.is_blank),
    };
    const { error } = await supabase.from("post_links").insert(payload);
    if (error && error.code !== "23505") {
      console.error("Failed to insert post_link", { postId, payload, error });
      throw error;
    }
  }
}

export async function adminListPostLinksBySilo(siloId: string) {
  const supabase = await getAdminSupabaseClient();
  const { data: posts, error: postError } = await supabase.from("posts").select("id").eq("silo_id", siloId);
  if (postError) throw postError;
  const ids = (posts ?? []).map((p: any) => p.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("post_links")
    .select("*, source: source_post_id (id, title, slug, silo_id), target: target_post_id (id, title, slug, silo_id)")
    .in("source_post_id", ids);
  if (error) throw error;
  return data as any[];
}

export async function adminGetPostLinks(postId: string): Promise<PostLink[]> {
  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase.from("post_links").select("*").eq("source_post_id", postId);
  if (error) throw error;
  return (data ?? []) as PostLink[];
}
