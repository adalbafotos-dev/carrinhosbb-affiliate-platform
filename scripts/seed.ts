import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

type Seed = Array<{
  silo_name: string;
  slug: string;
  description?: string;
  posts: Array<{
    h1: string;
    slug: string;
    kgr_keyword: string;
    supporting: string[];
  }>;
}>;

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Env ausente: ${name}`);
  return v;
}

const url = required("NEXT_PUBLIC_SUPABASE_URL");
const service = required("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, service, { auth: { persistSession: false } });

function makeDoc(k: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: `Vamos direto ao ponto: ${k}.` },
        ],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "O que você precisa saber antes de comprar" }],
      },
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Para quem é (iniciante vs. profissional)" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "O que muda entre modelos e potência" }] }] },
          { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Erros comuns que fazem você gastar duas vezes" }] }] },
        ],
      },
      {
        type: "affiliateProduct",
        attrs: {
          title: "Produto exemplo (troque no editor)",
          image: "",
          price: "",
          rating: 0,
          features: ["Feature 1", "Feature 2", "Feature 3"],
          href: "",
        },
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Edite este conteúdo em /admin e publique quando estiver pronto." },
        ],
      },
    ],
  };
}

function makeHtml(k: string) {
  return `
    <p><strong>Vamos direto ao ponto:</strong> ${k}.</p>
    <h2>O que você precisa saber antes de comprar</h2>
    <ul>
      <li>Para quem é (iniciante vs. profissional)</li>
      <li>O que muda entre modelos e potência</li>
      <li>Erros comuns que fazem você gastar duas vezes</li>
    </ul>
    <p>Edite este conteúdo em <a href="/admin">/admin</a> e publique quando estiver pronto.</p>
  `.trim();
}

async function upsertSilo(name: string, slug: string, description?: string) {
  const { data, error } = await supabase
    .from("silos")
    .upsert({ name, slug, description: description ?? null }, { onConflict: "slug" })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Falha ao criar/atualizar silo.");
  return data as { id: string };
}

async function upsertPost(args: {
  silo_id: string;
  title: string;
  slug: string;
  target_keyword: string;
  supporting_keywords: string[];
  published: boolean;
}) {
  const doc = makeDoc(args.target_keyword);
  const html = makeHtml(args.target_keyword);

  const { error } = await supabase
    .from("posts")
    .upsert(
      {
        silo_id: args.silo_id,
        title: args.title,
        slug: args.slug,
        target_keyword: args.target_keyword,
        supporting_keywords: args.supporting_keywords,
        meta_description: `Guia prático sobre ${args.target_keyword}: como escolher, o que olhar e quais erros evitar.`,
        content_json: doc,
        content_html: html,
        published: args.published,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );

  if (error) throw error;
}

async function main() {
  const seedPath = resolve(process.cwd(), "supabase", "seed.json");
  const seed = JSON.parse(readFileSync(seedPath, "utf-8")) as Seed;

  console.log("Iniciando seed…");

  const postsToSeed: Array<{
    silo_id: string;
    title: string;
    slug: string;
    target_keyword: string;
    supporting_keywords: string[];
  }> = [];

  for (const silo of seed) {
    const siloRow = await upsertSilo(silo.silo_name, silo.slug, silo.description);

    for (const post of silo.posts) {
      postsToSeed.push({
        silo_id: siloRow.id,
        title: post.h1,
        slug: post.slug,
        target_keyword: post.kgr_keyword,
        supporting_keywords: post.supporting,
      });
    }
  }

  const targetPosts = postsToSeed.slice(0, 3);
  const total = targetPosts.length;

  for (const [idx, post] of targetPosts.entries()) {
    const published = total === 1 ? true : idx === total - 1;
    await upsertPost({ ...post, published });
  }

  console.log("Seed finalizado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



