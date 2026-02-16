import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { cache } from "react";
import { getPublicPostsBySilo, getPublicSiloBySlug, listAllSiloSlugs } from "@/lib/db";
import type { Post } from "@/lib/types";
import { JsonLd } from "@/components/seo/JsonLd";
import { resolveSiteUrl } from "@/lib/site/url";
import { buildCanonicalUrl, buildSiloCanonicalPath } from "@/lib/seo/canonical";

export const revalidate = 3600;

const getCachedSilo = cache(async (siloSlug: string) => getPublicSiloBySlug(siloSlug));
const getCachedPosts = cache(async (siloSlug: string) => getPublicPostsBySilo(siloSlug));

export async function generateStaticParams() {
  const slugs = await listAllSiloSlugs();
  return slugs.map((slug) => ({ silo: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ silo: string }> }): Promise<Metadata> {
  const { silo } = await params;
  const pillar = await getCachedSilo(silo);
  if (!pillar) return { title: "Silo" };
  const canonicalPath = buildSiloCanonicalPath(silo) ?? `/${silo}`;
  const canonicalUrl = buildCanonicalUrl(resolveSiteUrl(), canonicalPath);
  return {
    title: pillar.meta_title || pillar.name,
    description: pillar.meta_description || pillar.description || undefined,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: pillar.meta_title || pillar.name,
      description: pillar.meta_description || pillar.description || undefined,
    },
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

function resolvePostCover(post: Post) {
  return post.hero_image_url || post.cover_image || post.og_image_url || null;
}

export default async function PillarPage({ params }: { params: Promise<{ silo: string }> }) {
  const { silo } = await params;
  const pillar = await getCachedSilo(silo);
  if (!pillar) return notFound();
  const posts = await getCachedPosts(silo);
  const ordered = [...posts].sort((a, b) => {
    if (Boolean(b.is_featured) !== Boolean(a.is_featured)) return Number(b.is_featured) - Number(a.is_featured);
    if ((a.pillar_rank ?? 0) !== (b.pillar_rank ?? 0)) return (a.pillar_rank ?? 0) - (b.pillar_rank ?? 0);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  const groups = groupPosts(ordered);
  const siteUrl = resolveSiteUrl();
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
      <details className="group overflow-hidden rounded-3xl border border-[rgba(165,119,100,0.24)] bg-[linear-gradient(148deg,rgba(255,255,255,0.96)_0%,rgba(255,247,230,0.92)_58%,rgba(241,188,153,0.28)_100%)] shadow-[0_14px_30px_-22px_rgba(165,119,100,0.42)]">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-6 md:p-8 [&::-webkit-details-marker]:hidden">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">{pillar.name}</h1>
            <p className="mt-2 text-xs font-medium text-(--brand-accent)">Toque para expandir o conteudo do silo</p>
          </div>
          <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(165,119,100,0.28)] bg-[rgba(255,255,255,0.92)] text-lg text-(--brand-accent) transition group-open:rotate-180">
            v
          </span>
        </summary>
        <div className="border-t border-[rgba(165,119,100,0.2)] px-6 pb-6 pt-5 md:px-8 md:pb-8">
          {pillar.hero_image_url ? (
            <div className="relative mb-5 overflow-hidden rounded-xl border border-[rgba(165,119,100,0.2)]">
              <img
                src={pillar.hero_image_url}
                alt={pillar.hero_image_alt || pillar.name}
                className="h-60 w-full object-cover md:h-72"
                loading="lazy"
              />
            </div>
          ) : null}
          {pillar.description ? <p className="text-sm text-(--muted)">{pillar.description}</p> : null}
          {pillar.pillar_content_html ? (
            <div
              className="prose prose-zinc mt-5 max-w-none text-(--muted)"
              dangerouslySetInnerHTML={{ __html: pillar.pillar_content_html }}
            />
          ) : null}
        </div>
      </details>

      {groups.featured.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-(--ink)">Destaques</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {groups.featured.map((post) => (
              <PostCard key={post.id} post={post} silo={pillar.slug} />
            ))}
          </div>
        </section>
      ) : null}

      {groups.commercial.length ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-(--ink)">Guias / Reviews</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {groups.commercial.map((post) => (
              <PostCard key={post.id} post={post} silo={pillar.slug} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-3">
            <Image
              src="/maos-e-dedos06.webp"
              alt=""
              aria-hidden
              width={96}
              height={96}
              sizes="(min-width: 768px) 96px, 72px"
              className="h-12 w-12 object-contain md:h-16 md:w-16"
            />
            <h2
              className="text-[clamp(2.25rem,1.5rem+3.2vw,4.4rem)] leading-none text-(--ink)"
              style={{ fontFamily: '"Grey Qo", var(--font-body), "Segoe UI", sans-serif', fontWeight: 400 }}
            >
              Últimos publicados
            </h2>
          </div>
          <span className="text-sm text-(--muted-2)">{ordered.length} páginas</span>
        </div>
        {ordered.length === 0 ? (
          <div className="rounded-xl border border-(--border) bg-(--paper) p-5 text-sm text-(--muted)">
            Nenhum post publicado neste silo ainda.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
  const cover = resolvePostCover(post);
  const coverAlt = post.hero_image_alt || post.title;

  return (
    <a
      href={`/${silo}/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[rgba(165,119,100,0.24)] bg-[linear-gradient(160deg,rgba(255,255,255,0.98)_0%,rgba(255,249,237,0.94)_60%,rgba(241,188,153,0.24)_100%)] shadow-[0_12px_28px_-22px_rgba(165,119,100,0.38)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(165,119,100,0.46)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden border-b border-[rgba(165,119,100,0.2)] bg-[rgba(255,248,234,0.8)]">
        {cover ? (
          <img
            src={cover}
            alt={coverAlt}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-(--brand-accent)">
            Sem imagem de capa
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
        <div className="flex items-center gap-2">
          {badge(post.intent)}
          {post.is_featured ? (
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
              Pilar
            </span>
          ) : null}
        </div>
        <h3 className="line-clamp-3 text-lg font-semibold leading-tight text-(--ink)">{post.title}</h3>
        <p className="line-clamp-4 text-sm leading-relaxed text-(--muted)">
          {post.meta_description || "Resumo indisponivel para este post."}
        </p>
        <span className="mt-auto inline-flex w-fit items-center rounded-full bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-(--paper)">
          Abrir guia
        </span>
      </div>
    </a>
  );
}

