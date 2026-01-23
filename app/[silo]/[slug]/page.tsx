import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPostBySlug, listAllPostParams } from "@/lib/db";
import { JsonLd } from "@/components/seo/JsonLd";
import type { PostWithSilo } from "@/lib/types";

export const revalidate = 3600;

export async function generateStaticParams() {
  const params = await listAllPostParams();
  return params.map((p) => ({ silo: p.silo, slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ silo: string; slug: string }> }): Promise<Metadata> {
  const { silo, slug } = await params;
  const post = await getPublicPostBySlug(silo, slug);
  if (!post) return { title: "Artigo" };

  const metaTitle = post.meta_title ?? post.seo_title ?? post.title;
  const canonicalPath = post.canonical_path ?? `/${silo}/${slug}`;
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const canonicalUrl = `${siteUrl.replace(/\/$/, "")}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;
  const ogImage = post.og_image_url ?? post.hero_image_url ?? post.cover_image ?? undefined;

  return {
    title: metaTitle,
    description: post.meta_description ?? undefined,
    alternates: { canonical: canonicalUrl },
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
  return { "@type": "Organization", name: "Estetica da Verdade" };
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
      name: "Estetica da Verdade",
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
  const post = await getPublicPostBySlug(silo, slug);

  if (!post) return notFound();

  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const canonicalPath = post.canonical_path ?? `/${silo}/${slug}`;
  const canonical = `${siteUrl.replace(/\/$/, "")}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`;

  const articleLd = buildArticleJsonLd(post, canonical);
  const productLd = Array.isArray(post.amazon_products) ? buildProductJsonLd(post.amazon_products) : [];
  const reviewLd = post.schema_type === "review" ? buildReviewJsonLd(post, canonical) : null;
  const faqItems = Array.isArray(post.faq_json) ? post.faq_json : [];
  const howToItems = Array.isArray(post.howto_json) ? post.howto_json : [];
  const faqLd = post.schema_type === "faq" ? buildFaqJsonLd(faqItems, canonical, post) : null;
  const howToLd = post.schema_type === "howto" ? buildHowToJsonLd(howToItems, post, canonical) : null;
  const breadcrumbLd = buildBreadcrumbJsonLd(post, siteUrl, silo, canonical);

  const schemaBlocks = [
    articleLd,
    ...productLd,
    ...(reviewLd ? reviewLd : []),
    faqLd,
    howToLd,
    breadcrumbLd,
  ].filter(Boolean);

  return (
    <article className="space-y-8 page-in">
      <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        <nav className="text-[11px] text-[color:var(--muted-2)]">
          <a href="/">Home</a> / <a href={`/${silo}`}>{post.silo?.name ?? silo}</a> / {post.title}
        </nav>
        <div className="mt-3">
          <a
            href={`/${silo}`}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)] hover:bg-[color:var(--brand-primary)]/10"
          >
            ← Voltar para {post.silo?.name ?? silo}
          </a>
        </div>
        <p className="text-xs text-[color:var(--muted-2)]">{post.silo?.name ?? "Artigo"}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">{post.title}</h1>
        <p className="mt-4 text-sm text-[color:var(--muted)]">
          Palavra-chave alvo: <span className="font-medium text-[color:var(--brand-accent)]">{post.target_keyword}</span>
        </p>
      </header>

      {post.hero_image_url ? (
        <div className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)]">
          <Image
            src={post.hero_image_url}
            alt={post.hero_image_alt || post.title}
            width={1200}
            height={675}
            sizes="(max-width: 1024px) 100vw, 900px"
            className="h-auto w-full object-cover"
          />
        </div>
      ) : null}

      {post.disclaimer ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-xs text-[color:var(--muted)]">
          {post.disclaimer}
        </div>
      ) : null}

      <div className="content rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        {post.content_html ? (
          <div dangerouslySetInnerHTML={{ __html: post.content_html }} />
        ) : (
          <p className="text-sm text-[color:var(--muted)]">
            Este artigo ainda nao tem conteudo. Abra no <a href={`/admin/editor/${post.id}`}>editor</a>.
          </p>
        )}
      </div>

      {Array.isArray(post.sources) && post.sources.length ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6 text-xs text-[color:var(--muted)]">
          <p className="text-[11px] font-semibold uppercase text-[color:var(--muted-2)]">Fontes</p>
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

      {schemaBlocks.length ? <JsonLd data={schemaBlocks as any} /> : null}
    </article>
  );
}

