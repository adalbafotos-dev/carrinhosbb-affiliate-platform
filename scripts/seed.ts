import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { AMAZON_AFFILIATE_DISCLOSURE } from "../lib/site";

type SeedPost = {
  h1: string;
  slug: string;
  kgr_keyword: string;
  supporting: string[];
  meta_title: string;
  meta_description: string;
  content_type: "informativo" | "comparativo" | "top lista";
  intent: "informational" | "commercial" | "transactional";
  schema_type: "article" | "review" | "faq" | "howto";
  is_featured: boolean;
  pillar_rank: number;
};

type SeedSilo = {
  silo_name: string;
  slug: string;
  description?: string;
  meta_title?: string;
  meta_description?: string;
  menu_order?: number;
  is_active?: boolean;
  show_in_navigation?: boolean;
  pillar_content_html?: string;
  posts: SeedPost[];
};

type Seed = SeedSilo[];

const DEFAULT_AUTHOR = "Equipe Bebê na Rota";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: false });
loadEnv({ path: resolve(process.cwd(), ".env"), override: false });

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Env ausente: ${name}`);
  return value;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const service = required("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, service, { auth: { persistSession: false } });

function makeDoc(args: { title: string; keyword: string; contentType: SeedPost["content_type"] }) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: `Resumo direto: ${args.keyword}.` }],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Como avaliar antes de comprar" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Segurança e estrutura" }] }],
          },
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Peso e praticidade de uso" }] }],
          },
          {
            type: "listItem",
            content: [{ type: "paragraph", content: [{ type: "text", text: "Custo-benefício real" }] }],
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Tabela comparativa inicial" }],
      },
      {
        type: "table",
        attrs: {
          renderMode: "table",
          renderModeMobile: "scroll",
          wrapCells: true,
          hiddenColumns: "",
          columnWidths: [],
          visibleDesktop: true,
          visibleTablet: true,
          visibleMobile: true,
        },
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Modelo" }] }] },
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Faixa de preço" }] }] },
              { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Perfil de uso" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Exemplo A" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Entrada" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Uso ocasional" }] }] },
            ],
          },
          {
            type: "tableRow",
            content: [
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Exemplo B" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Intermediário" }] }] },
              { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Uso diário" }] }] },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: `Tipo de conteúdo: ${args.contentType}. Este texto é um placeholder para edição no painel.`,
          },
        ],
      },
    ],
  };
}

function makeHtml(args: { keyword: string; contentType: SeedPost["content_type"] }) {
  return `
    <p><strong>Resumo direto:</strong> ${args.keyword}.</p>
    <h2>Como avaliar antes de comprar</h2>
    <ul>
      <li>Segurança e estrutura</li>
      <li>Peso e praticidade de uso</li>
      <li>Custo-benefício real</li>
    </ul>
    <h2>Tabela comparativa inicial</h2>
    <table>
      <thead>
        <tr><th>Modelo</th><th>Faixa de preço</th><th>Perfil de uso</th></tr>
      </thead>
      <tbody>
        <tr><td>Exemplo A</td><td>Entrada</td><td>Uso ocasional</td></tr>
        <tr><td>Exemplo B</td><td>Intermediário</td><td>Uso diário</td></tr>
      </tbody>
    </table>
    <p>Tipo de conteúdo: ${args.contentType}. Edite este conteúdo em <a href="/admin">/admin</a>.</p>
  `.trim();
}

async function upsertSilo(silo: SeedSilo) {
  const { data, error } = await supabase
    .from("silos")
    .upsert(
      {
        name: silo.silo_name,
        slug: silo.slug,
        description: silo.description ?? null,
        meta_title: silo.meta_title ?? null,
        meta_description: silo.meta_description ?? null,
        menu_order: silo.menu_order ?? 1,
        is_active: silo.is_active ?? true,
        show_in_navigation: silo.show_in_navigation ?? true,
        pillar_content_html: silo.pillar_content_html ?? null,
      },
      { onConflict: "slug" }
    )
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Falha ao criar/atualizar silo ${silo.slug}`);
  return data as { id: string; slug: string };
}

async function upsertPost(args: {
  siloId: string;
  siloSlug: string;
  post: SeedPost;
}) {
  const now = new Date().toISOString();
  const doc = makeDoc({
    title: args.post.h1,
    keyword: args.post.kgr_keyword,
    contentType: args.post.content_type,
  });
  const html = makeHtml({
    keyword: args.post.kgr_keyword,
    contentType: args.post.content_type,
  });

  const payload = {
    silo_id: args.siloId,
    title: args.post.h1,
    slug: args.post.slug,
    target_keyword: args.post.kgr_keyword,
    supporting_keywords: args.post.supporting,
    meta_title: args.post.meta_title,
    seo_title: args.post.meta_title,
    meta_description: args.post.meta_description,
    canonical_path: `/${args.siloSlug}/${args.post.slug}`,
    content_json: doc,
    content_html: html,
    intent: args.post.intent,
    schema_type: args.post.schema_type,
    is_featured: args.post.is_featured,
    pillar_rank: args.post.pillar_rank,
    author_name: DEFAULT_AUTHOR,
    expert_name: DEFAULT_AUTHOR,
    expert_role: "Equipe editorial de Bebê e Puericultura",
    reviewed_by: DEFAULT_AUTHOR,
    disclaimer: AMAZON_AFFILIATE_DISCLOSURE,
    status: "published",
    published: true,
    published_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from("posts").upsert(payload, { onConflict: "slug" });
  if (error) throw error;
}

async function deactivateLegacySilos(targetSlugs: string[]) {
  const { data: allSilos, error: loadSilosError } = await supabase.from("silos").select("id,slug");
  if (loadSilosError) throw loadSilosError;

  const target = new Set(targetSlugs);
  const legacy = (allSilos ?? []).filter((silo: any) => !target.has(String(silo.slug)));

  for (const silo of legacy) {
    await supabase
      .from("posts")
      .update({ published: false, status: "draft" })
      .eq("silo_id", silo.id);

    await supabase
      .from("silos")
      .update({ is_active: false, menu_order: 999 })
      .eq("id", silo.id);
  }
}

async function deactivateSiloPostsOutsideSeed(siloId: string, allowedSlugs: string[]) {
  const { data, error } = await supabase.from("posts").select("id,slug").eq("silo_id", siloId);
  if (error) throw error;

  const allowed = new Set(allowedSlugs);
  const legacyIds = (data ?? [])
    .filter((post: any) => !allowed.has(String(post.slug)))
    .map((post: any) => String(post.id));

  if (!legacyIds.length) return;

  const { error: updateError } = await supabase
    .from("posts")
    .update({ published: false, status: "draft" })
    .in("id", legacyIds);

  if (updateError) throw updateError;
}

async function main() {
  const seedPath = resolve(process.cwd(), "supabase", "seed.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf-8")) as Seed;

  if (!Array.isArray(seed) || seed.length === 0) {
    throw new Error("Seed vazio em supabase/seed.json");
  }

  console.log("Iniciando seed do nicho Bebê & Puericultura...");

  await deactivateLegacySilos(seed.map((silo) => silo.slug));

  for (const silo of seed) {
    const siloRow = await upsertSilo(silo);
    const postSlugs = silo.posts.map((post) => post.slug);

    for (const post of silo.posts) {
      await upsertPost({
        siloId: siloRow.id,
        siloSlug: silo.slug,
        post,
      });
    }

    await deactivateSiloPostsOutsideSeed(siloRow.id, postSlugs);
    console.log(`Silo ${silo.slug}: ${silo.posts.length} posts prontos.`);
  }

  console.log("Seed finalizado.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


