import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPublicPostBySlug, listAllPostParams } from "@/lib/db";
import { JsonLd } from "@/components/seo/JsonLd";
import { PostToc } from "@/components/site/PostToc";
import type { PostWithSilo } from "@/lib/types";
import { renderEditorDocToHtml } from "@/lib/editor/docRenderer";
import { resolveSiteUrl } from "@/lib/site/url";
import { buildCanonicalUrl, buildPostCanonicalPath } from "@/lib/seo/canonical";

export const revalidate = 3600;

const getPublishedPost = cache(async (siloSlug: string, postSlug: string) => getPublicPostBySlug(siloSlug, postSlug));

export async function generateStaticParams() {
  const params = await listAllPostParams();
  return params.map((p) => ({ silo: p.silo, slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ silo: string; slug: string }> }): Promise<Metadata> {
  const { silo, slug } = await params;
  const post = await getPublishedPost(silo, slug);
  if (!post) return { title: "Artigo" };

  const metaTitle = post.meta_title ?? post.seo_title ?? post.title;
  const canonicalPath = buildPostCanonicalPath(silo, slug) ?? `/${silo}/${slug}`;
  const siteUrl = resolveSiteUrl();
  const canonicalUrl = buildCanonicalUrl(siteUrl, canonicalPath);
  const ogImage = post.og_image_url ?? post.hero_image_url ?? post.cover_image ?? undefined;

  return {
    title: metaTitle,
    description: post.meta_description ?? undefined,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: metaTitle,
      description: post.meta_description ?? undefined,
      type: "article",
      url: canonicalUrl,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

function buildAuthor(post: PostWithSilo) {
  const name = post.expert_name || post.author_name;
  if (name) {
    const author: Record<string, any> = { "@type": "Person", name };
    if (post.expert_role) author.jobTitle = post.expert_role;
    if (post.expert_bio) author.description = post.expert_bio;
    if (post.expert_credentials) author.honorificSuffix = post.expert_credentials;
    return author;
  }
  return { "@type": "Organization", name: "Lindisse" };
}

function buildReviewedBy(post: PostWithSilo) {
  if (!post.reviewed_by) return undefined;
  return { "@type": "Person", name: post.reviewed_by };
}

function buildArticleJsonLd(post: PostWithSilo, canonical: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonical,
    },
    headline: post.meta_title ?? post.title,
    description: post.meta_description ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    image: post.hero_image_url ? [post.hero_image_url] : undefined,
    author: buildAuthor(post),
    reviewedBy: buildReviewedBy(post),
    publisher: {
      "@type": "Organization",
      name: "Lindisse",
    },
  };
}

function buildProductJsonLd(products: any[] = []) {
  return products
    .filter(Boolean)
    .map((p) => ({
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.title,
      image: p.image ? [p.image] : undefined,
      description: Array.isArray(p.features) ? p.features.join(" - ") : undefined,
      aggregateRating: p.rating
        ? {
          "@type": "AggregateRating",
          ratingValue: p.rating,
          reviewCount: p.reviewCount ?? 1,
        }
        : undefined,
      offers: p.url
        ? {
          "@type": "Offer",
          url: p.url,
          priceCurrency: p.currency ?? "BRL",
          price: p.price ?? undefined,
          availability: p.availability ?? undefined,
        }
        : undefined,
    }));
}

function buildReviewJsonLd(post: PostWithSilo, canonical: string) {
  const products = Array.isArray(post.amazon_products) ? post.amazon_products : [];
  if (!products.length) return null;
  const primary = products[0];
  const productName = primary.title || post.title;
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    image: primary.image ? [primary.image] : post.hero_image_url ? [post.hero_image_url] : undefined,
    description: Array.isArray(primary.features) ? primary.features.join(" - ") : post.meta_description ?? undefined,
    aggregateRating: primary.rating
      ? {
        "@type": "AggregateRating",
        ratingValue: primary.rating,
        reviewCount: primary.reviewCount ?? 1,
      }
      : undefined,
    offers: primary.url
      ? {
        "@type": "Offer",
        url: primary.url,
        priceCurrency: primary.currency ?? "BRL",
        price: primary.price ?? undefined,
        availability: primary.availability ?? undefined,
      }
      : undefined,
  };

  const review: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: { "@type": "Product", name: productName },
    reviewBody: post.meta_description ?? undefined,
    author: buildAuthor(post),
    reviewedBy: buildReviewedBy(post),
    datePublished: post.published_at ?? post.updated_at,
    url: canonical,
  };

  if (primary.rating) {
    review.reviewRating = {
      "@type": "Rating",
      ratingValue: primary.rating,
      bestRating: "5",
      worstRating: "1",
    };
  }

  return [product, review];
}

function buildFaqJsonLd(faq: Array<{ question: string; answer: string }> = [], canonical: string, post?: PostWithSilo) {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    author: post ? buildAuthor(post) : undefined,
    reviewedBy: post ? buildReviewedBy(post) : undefined,
    url: canonical,
  };
}

function buildHowToJsonLd(steps: Array<{ name: string; text: string }> = [], post: PostWithSilo, canonical: string) {
  if (!steps.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: post.title,
    description: post.meta_description ?? undefined,
    step: steps.map((item, index) => ({
      "@type": "HowToStep",
      name: item.name || `Passo ${index + 1}`,
      text: item.text,
    })),
    author: buildAuthor(post),
    reviewedBy: buildReviewedBy(post),
    url: canonical,
  };
}

function extractListItemsFromHtml(html: string, limit = 10) {
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

function shouldRenderTopList(post: PostWithSilo) {
  const title = (post.title || "").toLowerCase();
  return /top|melhor|melhores|lista|ranking/.test(title);
}

function buildItemListJsonLd(post: PostWithSilo, canonical: string) {
  const items = extractListItemsFromHtml(post.content_html ?? "", 10);
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    name: post.title,
    url: canonical,
    itemListElement: items.map((name, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
    })),
  };
}

function extractFaqFromHtml(html: string, limit = 8) {
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

function extractYouTubeIdFromHtml(html: string) {
  if (!html) return null;
  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
  const src = iframeMatch?.[1];
  if (!src) return null;
  const idMatch = src.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  return idMatch?.[1] ?? null;
}

function buildVideoObjectJsonLd(post: PostWithSilo, canonical: string) {
  const videoId = extractYouTubeIdFromHtml(post.content_html ?? "");
  if (!videoId) return null;
  const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.meta_title ?? post.title,
    description: post.meta_description ?? undefined,
    thumbnailUrl,
    uploadDate: post.published_at ?? post.updated_at,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
    mainEntityOfPage: canonical,
  };
}

function buildBreadcrumbJsonLd(post: PostWithSilo, siteUrl: string, silo: string, canonical: string) {
  const base = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${base}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: post.silo?.name ?? silo,
        item: `${base}/${silo}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: canonical,
      },
    ],
  };
}

export default async function PostPage({ params }: { params: Promise<{ silo: string; slug: string }> }) {
  const { silo, slug } = await params;
  const post = await getPublishedPost(silo, slug);

  if (!post) return notFound();

  const siteUrl = resolveSiteUrl();
  const canonicalPath = buildPostCanonicalPath(silo, slug) ?? `/${silo}/${slug}`;
  const canonical = buildCanonicalUrl(siteUrl, canonicalPath);

  const articleLd = buildArticleJsonLd(post, canonical);
  const productLd = Array.isArray(post.amazon_products) ? buildProductJsonLd(post.amazon_products) : [];
  const reviewLd = post.schema_type === "review" ? buildReviewJsonLd(post, canonical) : null;
  const faqItems = Array.isArray(post.faq_json) ? post.faq_json : [];
  const howToItems = Array.isArray(post.howto_json) ? post.howto_json : [];
  const contentHtmlFromJson = post.content_json ? renderEditorDocToHtml(post.content_json) : "";
  const storedHtml = post.content_html || "";
  const jsonHasImg = /<img\b/i.test(contentHtmlFromJson);
  const storedHasImg = /<img\b/i.test(storedHtml);
  const jsonHasCtaColor = /data-bg-color="[^"]+"/i.test(contentHtmlFromJson);
  const storedHasCtaColor = /data-bg-color="[^"]+"/i.test(storedHtml);
  const shouldFallbackToStored = (!jsonHasImg && storedHasImg) || (!jsonHasCtaColor && storedHasCtaColor);
  const contentHtml = shouldFallbackToStored ? storedHtml : contentHtmlFromJson || storedHtml;
  const detectedFaq = faqItems.length ? faqItems : extractFaqFromHtml(contentHtml);
  const faqLd = detectedFaq.length ? buildFaqJsonLd(detectedFaq, canonical, post) : null;
  const howToLd = post.schema_type === "howto" ? buildHowToJsonLd(howToItems, post, canonical) : null;
  const itemListLd = shouldRenderTopList(post) ? buildItemListJsonLd({ ...post, content_html: contentHtml }, canonical) : null;
  const videoLd = buildVideoObjectJsonLd({ ...post, content_html: contentHtml }, canonical);
  const breadcrumbLd = buildBreadcrumbJsonLd(post, siteUrl, silo, canonical);

  const schemaBlocks = [
    articleLd,
    ...productLd,
    ...(reviewLd ? reviewLd : []),
    faqLd,
    howToLd,
    itemListLd,
    videoLd,
    breadcrumbLd,
  ].filter(Boolean);

  return (
    <div className="post-page relative min-h-screen bg-transparent pb-12">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[600px] z-0 bg-linear-to-b from-white via-white/200 to-transparent" />
      <section className="relative z-10 bg-transparent">
        <article className="page-in relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-5 md:px-6">
          <header className="space-y-3">
            <nav className="text-[11px] text-(--muted-2)">
              <a href="/">Home</a> / <a href={`/${silo}`}>{post.silo?.name ?? silo}</a> / {post.title}
            </nav>

            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{post.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-(--muted)">
              <div className="flex items-center gap-1">
                <span className="text-(--muted-2)">Por</span>
                <span className="font-semibold text-(--ink)">
                  {post.expert_name || post.author_name || "Redação"}
                </span>
              </div>

              {post.reviewed_by && (
                <div className="flex items-center gap-1 border-l border-(--border) pl-4">
                  <span className="text-(--muted-2)">Revisado por</span>
                  <span className="font-semibold text-(--ink)">{post.reviewed_by}</span>
                </div>
              )}

              <div className="flex items-center gap-1 border-l border-(--border) pl-4">
                <span className="text-(--muted-2)">Atualizado</span>
                <time>
                  {new Date(post.updated_at || post.published_at || new Date()).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>
            </div>
          </header>

          {post.hero_image_url ? (
            <div className="mt-6 overflow-hidden rounded-xl">
              <img
                src={post.hero_image_url}
                alt={post.hero_image_alt || post.title}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : null}
        </article>
      </section>

      <article className="page-in mx-auto max-w-6xl px-4 pt-8 sm:px-5 md:px-6">
        <div className="grid gap-8 md:grid-cols-[232px_minmax(0,1fr)]">
          <PostToc contentSelector=".content" title="Índice" />

          <div className="space-y-8">
            {post.disclaimer ? (
              <div className="text-xs text-(--muted) italic">
                {post.disclaimer}
              </div>
            ) : null}

            <div className="content">
              {contentHtml ? (
                <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
              ) : (
                <p className="text-sm text-(--muted)">
                  Este artigo ainda não tem conteúdo. Abra no <a href={`/admin/editor/${post.id}`} className="underline">editor</a>.
                </p>
              )}
            </div>

            {Array.isArray(post.sources) && post.sources.length ? (
              <div className="rounded-2xl border border-(--border) bg-transparent p-6 text-xs text-(--muted)">
                <p className="text-[11px] font-semibold uppercase text-(--muted-2)">Fontes</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {post.sources.map((source: any, index: number) => (
                    <li key={`${source.url}-${index}`}>
                      <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                        {source.label || source.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {schemaBlocks.length ? <JsonLd data={schemaBlocks as any} /> : null}
      </article>
    </div>
  );
}
