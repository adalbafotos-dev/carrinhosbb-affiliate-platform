import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const SILO_SLUG = "mobilidade-e-passeio";

const POST_ASSIGNMENTS = [
  {
    slug: "preco-carrinho-de-bebe",
    role: "PILLAR",
    group: "preco_oportunidade",
    order: 1,
    showInMenu: true,
  },
  {
    slug: "carrinho-de-bebe-ate-300-reais",
    role: "SUPPORT",
    group: "preco_oportunidade",
    order: 2,
    showInMenu: true,
  },
  {
    slug: "onde-comprar-carrinho-de-bebe-barato",
    role: "SUPPORT",
    group: "preco_oportunidade",
    order: 3,
    showInMenu: true,
  },
  {
    slug: "carrinho-de-bebe-promocao",
    role: "SUPPORT",
    group: "preco_oportunidade",
    order: 4,
    showInMenu: false,
  },
  {
    slug: "carrinho-reversivel",
    role: "AUX",
    group: "recursos",
    order: 1,
    showInMenu: false,
  },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: schemaCheck, error: schemaError } = await supabase
    .from("posts")
    .select("id,silo_role,silo_group,silo_order,silo_group_order,show_in_silo_menu")
    .limit(1);

  if (schemaError) {
    const raw = String(schemaError.message || "");
    if (raw.toLowerCase().includes("does not exist")) {
      throw new Error(
        "Posts schema is missing silo organization columns. Run pending migrations in supabase/migrations first."
      );
    }
    throw schemaError;
  }

  void schemaCheck;

  const { data: silo, error: siloError } = await supabase
    .from("silos")
    .select("id,name,slug")
    .eq("slug", SILO_SLUG)
    .maybeSingle();
  if (siloError) throw siloError;
  if (!silo) throw new Error(`Silo not found: ${SILO_SLUG}`);

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id,title,slug")
    .eq("silo_id", silo.id)
    .in(
      "slug",
      POST_ASSIGNMENTS.map((item) => item.slug)
    );
  if (postsError) throw postsError;

  const postBySlug = new Map((posts ?? []).map((post) => [post.slug, post]));

  const missing = POST_ASSIGNMENTS.filter((item) => !postBySlug.has(item.slug));
  if (missing.length) {
    throw new Error(`Missing target posts in silo ${SILO_SLUG}: ${missing.map((item) => item.slug).join(", ")}`);
  }

  for (const item of POST_ASSIGNMENTS) {
    const post = postBySlug.get(item.slug);
    if (!post) continue;

    const { error: updatePostError } = await supabase
      .from("posts")
      .update({
        silo_role: item.role,
        silo_group: item.group,
        silo_order: item.order,
        silo_group_order: item.order,
        show_in_silo_menu: item.showInMenu,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);
    if (updatePostError) throw updatePostError;

    const { error: upsertHierarchyError } = await supabase.from("silo_posts").upsert(
      {
        silo_id: silo.id,
        post_id: post.id,
        role: item.role,
        position: item.order,
      },
      {
        onConflict: "silo_id,post_id",
      }
    );
    if (upsertHierarchyError && upsertHierarchyError.code !== "42P01") throw upsertHierarchyError;
  }

  const { data: verification, error: verificationError } = await supabase
    .from("posts")
    .select("title,slug,silo_role,silo_group,silo_order,show_in_silo_menu")
    .eq("silo_id", silo.id)
    .in(
      "slug",
      POST_ASSIGNMENTS.map((item) => item.slug)
    )
    .order("silo_order", { ascending: true });
  if (verificationError) throw verificationError;

  console.log(`Seed complete for silo: ${silo.name} (${silo.slug})`);
  console.table(
    (verification ?? []).map((post) => ({
      slug: post.slug,
      title: post.title,
      role: post.silo_role,
      group: post.silo_group,
      order: post.silo_order,
      show: post.show_in_silo_menu,
    }))
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

