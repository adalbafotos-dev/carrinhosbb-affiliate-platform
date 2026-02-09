import Link from "next/link";
import { getPublicSilos, listLatestPublicPosts } from "@/lib/db";
import { JsonLd } from "@/components/seo/JsonLd";
import type { PostWithSilo, Silo } from "@/lib/types";

export const revalidate = 3600;

function sortSilos(silos: Silo[]) {
  return [...silos]
    .filter((silo) => silo.is_active ?? true)
    .sort((a, b) => {
      const byOrder = (a.menu_order ?? 999) - (b.menu_order ?? 999);
      if (byOrder !== 0) return byOrder;
      return a.name.localeCompare(b.name, "pt-BR");
    });
}

function normalize(text: string | null | undefined) {
  return (text ?? "").toLocaleLowerCase("pt-BR");
}

function matchesQuery(post: PostWithSilo, query: string) {
  const needle = normalize(query);
  if (!needle) return true;

  return (
    normalize(post.title).includes(needle) ||
    normalize(post.target_keyword).includes(needle) ||
    normalize(post.meta_description).includes(needle) ||
    normalize(post.silo?.name).includes(needle)
  );
}

function buildMoneyPicks(posts: PostWithSilo[]) {
  const relevant = posts.filter((post) => {
    const intent = normalize(post.intent);
    return Boolean(post.is_featured) || intent === "commercial" || intent === "transactional";
  });

  if (!relevant.length) {
    return posts.slice(0, 4);
  }

  const unique = new Map<string, PostWithSilo>();
  for (const post of relevant) {
    if (!unique.has(post.id)) {
      unique.set(post.id, post);
    }
  }

  return Array.from(unique.values()).slice(0, 4);
}

function siloGradient(index: number) {
  const gradients = [
    "linear-gradient(145deg, rgba(241,188,153,0.45), rgba(255,255,255,0.96))",
    "linear-gradient(145deg, rgba(229,209,195,0.72), rgba(255,255,255,0.96))",
    "linear-gradient(145deg, rgba(243,97,65,0.16), rgba(255,255,255,0.96))",
    "linear-gradient(145deg, rgba(166,119,100,0.18), rgba(255,255,255,0.96))",
  ];

  return gradients[index % gradients.length];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [rawSilos, rawPosts] = await Promise.all([getPublicSilos(), listLatestPublicPosts(48)]);

  const silos = sortSilos(rawSilos);
  const searchResults = query ? rawPosts.filter((post) => matchesQuery(post, query)).slice(0, 10) : [];
  const moneyPicks = buildMoneyPicks(rawPosts);
  const latestGuides = rawPosts
    .filter((post) => !moneyPicks.some((item) => item.id === post.id))
    .slice(0, 6);

  const siteUrl = (process.env.SITE_URL ?? "https://lindisse.com.br").replace(/\/$/, "");
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lindisse",
    url: siteUrl,
    description: "Guias e reviews para nail designers, com foco em testes reais e decisões seguras de compra.",
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lindisse",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="space-y-12 page-in">
      <section className="relative overflow-hidden rounded-[2rem] border border-(--border) bg-[linear-gradient(130deg,rgba(241,188,153,0.7),#FFF_52%,#F4ECE7)] p-7 md:p-10">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_20%_20%,rgba(243,97,65,0.16),transparent_50%)] md:block" />
        <p className="text-xs uppercase tracking-[0.16em] text-(--muted-2)">lindisse.com.br</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-5xl">
          O guia definitivo para nail designers comprarem melhor e evoluirem mais rapido.
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-(--muted) md:text-base">
          Reviews tecnicos, testes reais e comparativos claros para voce escolher com mais seguranca e menos tentativa e erro.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="#silos"
            className="rounded-xl border border-(--ink) bg-(--ink) px-4 py-2 text-sm font-semibold text-white transition hover:opacity-92"
          >
            Explorar silos
          </a>
          <a
            href="#melhores"
            className="rounded-xl border border-(--border-strong) bg-white px-4 py-2 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
          >
            Ver melhores do ano
          </a>
        </div>

        <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-(--border) bg-white/85 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-(--muted-2)">Silos ativos</dt>
            <dd className="mt-1 text-xl font-semibold text-(--ink)">{silos.length}</dd>
          </div>
          <div className="rounded-2xl border border-(--border) bg-white/85 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-(--muted-2)">Guias publicados</dt>
            <dd className="mt-1 text-xl font-semibold text-(--ink)">{rawPosts.length}</dd>
          </div>
          <div className="rounded-2xl border border-(--border) bg-white/85 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-(--muted-2)">Atualizacao</dt>
            <dd className="mt-1 text-xl font-semibold text-(--ink)">Semanal</dd>
          </div>
          <div className="rounded-2xl border border-(--border) bg-white/85 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-(--muted-2)">Foco</dt>
            <dd className="mt-1 text-xl font-semibold text-(--ink)">E-E-A-T</dd>
          </div>
        </dl>
      </section>

      {query ? (
        <section className="space-y-4">
          <div className="rounded-3xl border border-(--border) bg-(--paper) p-6">
            <p className="text-xs uppercase tracking-wide text-(--muted-2)">Busca</p>
            <h2 className="mt-2 text-2xl font-semibold text-(--ink)">
              Resultados para &quot;{query}&quot;
            </h2>
            <p className="mt-2 text-sm text-(--muted)">
              {searchResults.length} resultado(s) encontrado(s) nos guias mais recentes.
            </p>
          </div>

          {searchResults.length === 0 ? (
            <div className="rounded-2xl border border-(--border) bg-(--paper) p-5 text-sm text-(--muted)">
              Nenhum resultado por enquanto. Tente termos mais amplos como &quot;cabine&quot;, &quot;gel&quot; ou
              &quot;alongamento&quot;.
            </div>
          ) : (
            <div className="stagger-grid grid gap-4 md:grid-cols-2">
              {searchResults.map((post) => (
                <Link
                  key={post.id}
                  href={post.silo ? `/${post.silo.slug}/${post.slug}` : "#"}
                  className="flex h-full flex-col rounded-2xl border border-(--border) bg-(--paper) p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-(--muted-2)">
                    {post.silo?.name ?? "Conteudo"}
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-(--ink)">{post.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-(--muted)">
                    {post.meta_description || "Abrir artigo para ver detalhes e comparativos."}
                  </p>
                  <span className="mt-4 text-sm font-semibold text-(--brand-hot)">Abrir guia</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section id="silos" className="space-y-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wide text-(--muted-2)">Navegacao visual de silos</p>
          <h2 className="text-2xl font-semibold text-(--ink)">Escolha o tema certo para sua fase</h2>
          <p className="text-sm text-(--muted)">
            Entre direto no assunto que voce precisa e acesse os pilares com guias organizados por hierarquia.
          </p>
        </div>

        {silos.length === 0 ? (
          <div className="rounded-2xl border border-(--border) bg-(--paper) p-6 text-sm text-(--muted)">
            Nenhum silo ativo foi encontrado. Publique um pilar para iniciar a navegacao da home.
          </div>
        ) : (
          <div className="stagger-grid grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {silos.map((silo, index) => (
              <Link
                key={silo.id}
                href={`/${silo.slug}`}
                className="group rounded-3xl border border-(--border) p-5 transition hover:-translate-y-0.5 hover:border-(--border-strong) hover:shadow-sm"
                style={{ background: siloGradient(index) }}
              >
                <div className="inline-flex rounded-full border border-(--border-strong) bg-white px-2.5 py-1 text-[11px] font-semibold tracking-wide text-(--muted-2)">
                  SILO {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-(--ink)">{silo.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-(--muted)">
                  {silo.description || "Pilar com guias tecnicos, reviews e atualizacoes para decisoes de compra."}
                </p>
                <span className="mt-4 inline-flex text-sm font-semibold text-(--brand-hot)">Abrir pilar</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="melhores" className="space-y-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wide text-(--muted-2)">Money content</p>
          <h2 className="text-2xl font-semibold text-(--ink)">Melhores do ano para converter</h2>
          <p className="text-sm text-(--muted)">
            Selecao dos guias mais orientados a compra, priorizando intencao comercial e ranking interno.
          </p>
        </div>

        {moneyPicks.length === 0 ? (
          <div className="rounded-2xl border border-(--border) bg-(--paper) p-6 text-sm text-(--muted)">
            Ainda nao ha guias com foco comercial publicados para exibir nesta area.
          </div>
        ) : (
          <div className="stagger-grid grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {moneyPicks.map((post) => (
              <Link
                key={post.id}
                href={post.silo ? `/${post.silo.slug}/${post.slug}` : "#"}
                className="flex h-full flex-col rounded-2xl border border-(--border) bg-(--paper) p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <p className="text-xs uppercase tracking-wide text-(--muted-2)">
                  {post.silo?.name ?? "Guia"}
                </p>
                <h3 className="mt-2 line-clamp-2 text-base font-semibold text-(--ink)">{post.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-(--muted)">
                  {post.meta_description || "Veja comparativos, prós e contras antes de comprar."}
                </p>
                <span className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-(--brand-hot) px-3 py-2 text-sm font-semibold text-white">
                  Ver preco na Amazon
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-(--border) bg-(--paper) p-6">
          <p className="text-xs uppercase tracking-wide text-(--muted-2)">Recentes</p>
          <h2 className="mt-2 text-2xl font-semibold text-(--ink)">Guias atualizados recentemente</h2>
          {latestGuides.length === 0 ? (
            <p className="mt-4 text-sm text-(--muted)">Publique posts para alimentar este bloco automaticamente.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {latestGuides.map((post) => (
                <Link
                  key={post.id}
                  href={post.silo ? `/${post.silo.slug}/${post.slug}` : "#"}
                  className="rounded-2xl border border-(--border) bg-(--surface-muted) px-4 py-3 text-sm transition hover:border-(--border-strong) hover:bg-white"
                >
                  <p className="text-[11px] uppercase tracking-wide text-(--muted-2)">{post.silo?.name ?? "Guia"}</p>
                  <p className="mt-1 line-clamp-2 font-semibold text-(--ink)">{post.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-(--border) bg-[linear-gradient(165deg,#FFFFFF_0%,rgba(241,188,153,0.25)_100%)] p-6">
          <p className="text-xs uppercase tracking-wide text-(--muted-2)">Prova social / E-E-A-T</p>
          <h2 className="mt-2 text-2xl font-semibold text-(--ink)">Quem somos</h2>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-(--border-strong) bg-white text-xl font-semibold text-(--brand-accent)">
              LD
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-(--ink)">Equipe Lindisse</p>
              <p className="text-sm text-(--muted)">
                Especialistas em unhas de gel e manicure tecnica, com metodologia de analise focada em uso real.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-(--muted)">
            <li>Reviews com criterios tecnicos e contexto de uso.</li>
            <li>Atualizacoes com foco em performance, seguranca e custo-beneficio.</li>
            <li>Links de compra sempre sinalizados como afiliados.</li>
          </ul>
          <Link
            href="/sobre"
            className="mt-5 inline-flex rounded-xl border border-(--border-strong) bg-white px-4 py-2 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
          >
            Conheca nossa metodologia
          </Link>
        </aside>
      </section>

      <JsonLd data={[organizationLd, websiteLd]} />
    </div>
  );
}
