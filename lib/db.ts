import { getPublicSupabase } from "@/lib/supabase/public";
import type { Post, PostWithSilo, Silo } from "@/lib/types";

function hasPublicEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

async function getAdminSupabaseClient() {
  const { getAdminSupabase } = await import("@/lib/supabase/admin");
  return getAdminSupabase();
}

// --- Public (uses anon key, published only) ---

export async function getPublicSilos(): Promise<Silo[]> {
  if (!hasPublicEnv()) return [];
  const supabase = getPublicSupabase();
  const { data, error } = await supabase.from("silos").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Silo[];
}

export async function getPublicSiloBySlug(slug: string): Promise<Silo | null> {
  if (!hasPublicEnv()) return null;
  const supabase = getPublicSupabase();
  const { data, error } = await supabase.from("silos").select("*").eq("slug", slug).maybeSingle();
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

export async function adminListPosts(args: { published?: boolean | null } = {}): Promise<Array<PostWithSilo>> {
  const supabase = await getAdminSupabaseClient();
  let query = supabase
    .from("posts")
    .select("*, silos: silo_id (slug, name)")
    .order("updated_at", { ascending: false });

  if (typeof args.published === "boolean") {
    query = query.eq("published", args.published);
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

export async function adminCreatePost(args: {
  silo_id: string;
  title: string;
  seo_title?: string | null;
  slug: string;
  target_keyword: string;
  supporting_keywords?: string[] | null;
  meta_description?: string | null;
  cover_image?: string | null;
  author_name?: string | null;
  scheduled_at?: string | null;
}): Promise<PostWithSilo> {
  const supabase = await getAdminSupabaseClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("posts")
    .insert({
      silo_id: args.silo_id,
      title: args.title,
      seo_title: args.seo_title ?? null,
      slug: args.slug,
      target_keyword: args.target_keyword,
      supporting_keywords: args.supporting_keywords ?? [],
      meta_description: args.meta_description ?? null,
      cover_image: args.cover_image ?? null,
      author_name: args.author_name ?? null,
      scheduled_at: args.scheduled_at ?? null,
      published: false,
      updated_at: now,
    })
    .select("*, silos: silo_id (slug, name)")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Falha ao criar o post.");

  const row: any = data;
  return {
    ...(row as Post),
    silo: row.silos ? { slug: row.silos.slug, name: row.silos.name } : null,
  } as PostWithSilo;
}

export async function adminUpdatePost(args: {
  id: string;
  title?: string;
  seo_title?: string | null;
  slug?: string;
  target_keyword?: string;
  supporting_keywords?: string[] | null;
  meta_description?: string | null;
  cover_image?: string | null;
  author_name?: string | null;
  scheduled_at?: string | null;
  content_json: any;
  content_html: string;
  amazon_products?: any;
}): Promise<void> {
  const supabase = await getAdminSupabaseClient();

  const update: Record<string, any> = {
    content_json: args.content_json,
    content_html: args.content_html,
    updated_at: new Date().toISOString(),
  };

  if (typeof args.title !== "undefined") update.title = args.title;
  if (typeof args.seo_title !== "undefined") update.seo_title = args.seo_title;
  if (typeof args.slug !== "undefined") update.slug = args.slug;
  if (typeof args.target_keyword !== "undefined") update.target_keyword = args.target_keyword;
  if (typeof args.supporting_keywords !== "undefined") update.supporting_keywords = args.supporting_keywords;
  if (typeof args.meta_description !== "undefined") update.meta_description = args.meta_description;
  if (typeof args.cover_image !== "undefined") update.cover_image = args.cover_image;
  if (typeof args.author_name !== "undefined") update.author_name = args.author_name;
  if (typeof args.scheduled_at !== "undefined") update.scheduled_at = args.scheduled_at;
  if (typeof args.amazon_products !== "undefined") update.amazon_products = args.amazon_products;

  const { error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", args.id);

  if (error) throw error;
}

export async function adminPublishPost(args: { id: string; published: boolean }): Promise<void> {
  const supabase = await getAdminSupabaseClient();
  const { error } = await supabase
    .from("posts")
    .update({ published: args.published, updated_at: new Date().toISOString() })
    .eq("id", args.id);

  if (error) throw error;
}

export async function adminListSilos(): Promise<Silo[]> {
  const supabase = await getAdminSupabaseClient();
  const { data, error } = await supabase.from("silos").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Silo[];
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
