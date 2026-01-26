import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicPostsBySilo, getPublicSiloBySlug, listAllSiloSlugs } from "@/lib/db";
import type { Post } from "@/lib/types";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await listAllSiloSlugs();
  return slugs.map((slug) => ({ silo: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ silo: string }> }): Promise<Metadata> {
  const { silo } = await params;
  const pillar = await getPublicSiloBySlug(silo);
  if (!pillar) return { title: "Silo" };
  return {
    title: pillar.meta_title || pillar.name,
    description: pillar.meta_description || pillar.description || undefined,
  };
}

function groupPosts(posts: Post[]) {
  const featured = posts.filter((p) => p.is_featured);
  const commercial = posts.filter((p) => p.intent === "commercial" || p.intent === "transactional");
  const latest = posts.filter((p) => !featured.includes(p) && !commercial.includes(p));
  return { featured, commercial, latest };
}

function badge(intent?: string | null) {
  if (!intent) return null;
  const tone =
    intent === "commercial" ? "bg-amber-100 text-amber-700" : intent === "transactional" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700";
  const label =
    intent === "commercial" ? "Comercial" : intent === "transactional" ? "Transacional" : "Informativo";
  return <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>;
}

export default async function PillarPage({ params }: { params: Promise<{ silo: string }> }) {
  const { silo } = await params;
  const pillar = await getPublicSiloBySlug(silo);
  if (!pillar) return notFound();
  const posts = await getPublicPostsBySilo(silo);
  const ordered = [...posts].sort((a, b) => {
    if (Boolean(b.is_featured) !== Boolean(a.is_featured)) return Number(b.is_featured) - Number(a.is_featured);
    if ((a.pillar_rank ?? 0) !== (b.pillar_rank ?? 0)) return (a.pillar_rank ?? 0) - (b.pillar_rank ?? 0);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  const groups = groupPosts(ordered);
  const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: pillar.name,
    description: pillar.meta_description ?? pillar.description ?? undefined,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: ordered.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: post.title,
        url: `${siteUrl}/${pillar.slug}/${post.slug}`,
      })),
    },
  };

  return (
    <div className="space-y-10">
      <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6 md:p-8">
        {pillar.hero_image_url ? (
          <div className="relative mb-5 overflow-hidden rounded-xl border border-[color:var(--border-muted)]">
            <img
              src={pillar.hero_image_url}
              alt={pillar.hero_image_alt || pillar.name}
              className="h-60 w-full object-cover md:h-72"
              loading="lazy"
            />
          </div>
        ) : null}
        <p className="text-xs uppercase tracking-wide text-[color:var(--muted-2)]">Pilar</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-[color:var(--ink)] md:text-4xl">{pillar.name}</h1>
        {pillar.description ? <p className="mt-3 text-sm text-[color:var(--muted)]">{pillar.description}</p> : null}
        {pillar.pillar_content_html ? (
          <div
            className="prose prose-zinc mt-5 max-w-none text-[color:var(--muted)]"
            dangerouslySetInnerHTML={{ __html: pillar.pillar_content_html }}
          />
        ) : null}
      </header>

      {groups.featured.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--ink)]">Destaques</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.featured.map((post) => (
              <PostCard key={post.id} post={post} silo={pillar.slug} />
            ))}
          </div>
        </section>
      ) : null}

      {groups.commercial.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[color:var(--ink)]">Guias / Reviews</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {groups.commercial.map((post) => (
              <PostCard key={post.id} post={post} silo={pillar.slug} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[color:var(--ink)]">Últimos publicados</h2>
          <span className="text-sm text-[color:var(--muted-2)]">{ordered.length} páginas</span>
        </div>
        {ordered.length === 0 ? (
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] p-5 text-sm text-[color:var(--muted)]">
            Nenhum post publicado neste silo ainda.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {ordered.map((post) => (
              <PostCard key={post.id} post={post} silo={pillar.slug} />
            ))}
          </div>
        )}
      </section>

      <JsonLd data={collectionLd} />
    </div>
  );
}

function PostCard({ post, silo }: { post: Post; silo: string }) {
  return (
    <a
      href={`/${silo}/${post.slug}`}
      className="flex h-full flex-col rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <div className="flex items-center gap-2">
        {badge(post.intent)}
        {post.is_featured ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">Pilar</span> : null}
      </div>
      <h3 className="mt-2 line-clamp-2 text-base font-semibold text-[color:var(--ink)]">{post.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-[color:var(--muted)]">
        {post.meta_description || "Resumo indisponível para este post."}
      </p>
      <span className="mt-auto pt-3 text-sm font-semibold text-[color:var(--brand-accent)]">Abrir →</span>
    </a>
  );
}
