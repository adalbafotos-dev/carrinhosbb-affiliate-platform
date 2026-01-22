import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPostBySlug, listAllPostParams } from "@/lib/db";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 3600;

export async function generateStaticParams() {
  const params = await listAllPostParams();
  return params.map((p) => ({ silo: p.silo, slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ silo: string; slug: string }> }): Promise<Metadata> {
  const { silo, slug } = await params;
  const post = await getPublicPostBySlug(silo, slug);
  if (!post) return { title: "Artigo" };

  const metaTitle = post.seo_title ?? post.title;

  return {
    title: `${post.title} — Estética da Verdade`,
    description: post.meta_description ?? undefined,
    alternates: { canonical: `/${silo}/${slug}` },
    openGraph: {
      title: metaTitle,
      description: post.meta_description ?? undefined,
      type: "article",
      url: `/${silo}/${slug}`,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  };
}

function buildArticleJsonLd(args: {
  url: string;
  title: string;
  description?: string | null;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": args.url,
    },
    headline: args.title,
    description: args.description ?? undefined,
    dateModified: args.dateModified,
    author: {
      "@type": "Organization",
      name: "Estética da Verdade",
    },
    publisher: {
      "@type": "Organization",
      name: "Estética da Verdade",
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
      description: Array.isArray(p.features) ? p.features.join(" • ") : undefined,
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

export default async function PostPage({ params }: { params: Promise<{ silo: string; slug: string }> }) {
  const { silo, slug } = await params;
  const post = await getPublicPostBySlug(silo, slug);

  if (!post) return notFound();

  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
  const canonical = `${siteUrl.replace(/\/$/, "")}/${silo}/${slug}`;

  const articleLd = buildArticleJsonLd({
    url: canonical,
    title: post.title,
    description: post.meta_description,
    dateModified: post.updated_at,
  });

  const productLd = Array.isArray(post.amazon_products) ? buildProductJsonLd(post.amazon_products) : [];

  return (
    <article className="space-y-8 page-in">
      <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        <p className="text-xs text-[color:var(--muted-2)]">{post.silo?.name ?? "Artigo"}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight md:text-4xl">{post.title}</h1>
        <p className="mt-4 text-sm text-[color:var(--muted)]">
          Palavra-chave alvo: <span className="font-medium text-[color:var(--brand-accent)]">{post.target_keyword}</span>
        </p>
      </header>

      <div className="content rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        {post.content_html ? (
          <div dangerouslySetInnerHTML={{ __html: post.content_html }} />
        ) : (
          <p className="text-sm text-[color:var(--muted)]">
            Este artigo ainda não tem conteúdo. Abra no <a href={`/admin/editor/${post.id}`}>editor</a>.
          </p>
        )}
      </div>

      <JsonLd data={articleLd} />
      {productLd.length ? <JsonLd data={productLd} /> : null}
    </article>
  );
}
