import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getPublicSilos, listLatestPublicPosts } from "@/lib/db";
import { JsonLd } from "@/components/seo/JsonLd";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { HomeSearchResults } from "@/components/site/HomeSearchResults";
import { resolveSiteUrl } from "@/lib/site/url";
import { SITE_BRAND_TAGLINE, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

const siteUrl = resolveSiteUrl();
const homeSocialImage = "/favicon.ico";
const twitterSite = process.env.NEXT_PUBLIC_TWITTER_SITE?.trim() || undefined;

export const metadata: Metadata = {
  title: SITE_BRAND_TAGLINE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: SITE_NAME,
    locale: "pt_BR",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: homeSocialImage,
        alt: `${SITE_NAME} - guias e comparativos para bebê`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: twitterSite,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [homeSocialImage],
  },
};

const WHAT_YOU_FIND = [
  {
    title: "Guias acolhedores e práticos",
    description: "O que olhar, como escolher e para quem cada opção faz sentido.",
  },
  {
    title: "Comparativos fáceis de entender",
    description: "Tabelas e resumos por perfil e orçamento.",
  },
  {
    title: "Recomendações com responsabilidade",
    description: "Quando vale investir e quando não precisa.",
  },
] as const;

export default async function HomePage() {
  const [rawPosts, silos] = await Promise.all([listLatestPublicPosts(48), getPublicSilos()]);
  const latestPosts = rawPosts.slice(0, 8);
  const firstActiveSilo = silos.find((silo) => silo.is_active !== false && silo.slug);
  const startHereHref = firstActiveSilo ? `/${firstActiveSilo.slug}` : "/#posts-mais-novos";
  const startHereLabel = firstActiveSilo ? `Comecar por ${firstActiveSilo.name}` : "Comecar pelos posts mais novos";

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    description: SITE_DESCRIPTION,
  };

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="space-y-12 page-in">
      <section data-home-scroll className="relative flex min-h-[calc(100dvh-var(--home-header-height,136px))] items-center pt-6 pb-8 md:pt-10 md:pb-16">
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-start gap-6 px-4">
          <BrandBeamCard as="article" className="rounded-3xl p-6 md:p-8">
            <h1 className="text-3xl font-semibold leading-tight text-(--ink) md:text-5xl">{SITE_NAME}</h1>
            <p className="mt-4 max-w-4xl text-base font-medium leading-relaxed text-(--muted) md:text-lg">
              Guias e comparativos para você escolher com calma, segurança e mais confiança na rotina com bebê.
            </p>
            <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
              A rotina muda tudo. E, no meio de tanta opção, é normal ficar com dúvida. Aqui a gente te ajuda a decidir
              com tranquilidade: o que realmente importa na prática, o que vale a pena e o que você pode ignorar sem
              culpa. Um passo de cada vez, sem pressão e sem compra por impulso.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={startHereHref}
                className="inline-flex items-center justify-center rounded-xl bg-(--brand-hot) px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                {startHereLabel}
              </Link>
              <Link
                href="#posts-mais-novos"
                className="inline-flex items-center justify-center rounded-xl border border-[rgba(165,119,100,0.24)] bg-white/80 px-5 py-3 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
              >
                Ver os posts mais novos
              </Link>
            </div>
          </BrandBeamCard>
        </div>
      </section>

      <Suspense fallback={null}>
        <HomeSearchResults posts={rawPosts} />
      </Suspense>

      <section data-home-scroll id="missao-visao" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Missão e visão</h2>

        <div className="grid gap-6 md:grid-cols-2">
          <BrandBeamCard as="article" className="rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-(--ink)">Missão</h3>
            <p className="mt-2 text-sm leading-relaxed text-(--muted)">
              Ajudar famílias a fazerem escolhas mais seguras e conscientes para o dia a dia com bebê, com conteúdo
              simples, direto e fácil de aplicar. Do tipo que reduz ansiedade e aumenta clareza.
            </p>
          </BrandBeamCard>

          <BrandBeamCard as="article" className="rounded-2xl p-5">
            <h3 className="text-lg font-semibold text-(--ink)">Visão</h3>
            <p className="mt-2 text-sm leading-relaxed text-(--muted)">
              Ser um guia confiável para quem quer comprar melhor, com comparativos e recomendações que respeitam a vida
              real: orçamento, rotina, espaço em casa, deslocamento e aquele detalhe que só quem vive sabe.
            </p>
          </BrandBeamCard>
        </div>

        <ul className="grid gap-3 text-sm text-(--muted) md:grid-cols-3">
          <BrandBeamCard as="li" className="rounded-xl p-4">Conteúdo pensado para a rotina de verdade.</BrandBeamCard>
          <BrandBeamCard as="li" className="rounded-xl p-4">Comparativos que ajudam a decidir sem estresse.</BrandBeamCard>
          <BrandBeamCard as="li" className="rounded-xl p-4">
            Recomendações com critério e responsabilidade.
          </BrandBeamCard>
        </ul>
      </section>

      <section data-home-scroll id="sobre" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Sobre o {SITE_NAME}</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-(--muted)">
          O {SITE_NAME} nasceu para ser um lugar calmo no meio do barulho. Um cantinho de referência para quem quer
          entender e escolher melhor itens de puericultura, começando por carrinhos e mobilidade.
        </p>
        <p className="max-w-4xl text-sm leading-relaxed text-(--muted)">
          Aqui você vai encontrar guias e reviews com uma ideia simples: ajudar você a decidir com mais segurança e menos
          dúvida. Sem complicar, sem prometer milagre e sem te empurrar coisa desnecessária.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {WHAT_YOU_FIND.map((item) => (
              <BrandBeamCard
                as="article"
                key={item.title}
                className="rounded-2xl p-5"
              >
              <h3 className="text-base font-semibold text-(--ink)">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--muted)">{item.description}</p>
            </BrandBeamCard>
          ))}
        </div>
      </section>

      <section data-home-scroll id="posts-mais-novos" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Posts mais novos</h2>
        <p className="text-sm text-(--muted)">Conteúdos recentes para te ajudar a decidir com mais tranquilidade.</p>

        {latestPosts.length === 0 ? (
          <p className="text-sm text-(--muted)">Novos conteúdos serão publicados em breve.</p>
        ) : (
          <ol className="divide-y divide-[rgba(193,149,86,0.36)]">
            {latestPosts.map((post) => (
              <li key={post.id} className="py-4">
                <Link
                  href={post.silo ? `/${post.silo.slug}/${post.slug}` : "/#posts-mais-novos"}
                  className="group grid gap-3 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-(--muted-2)">{post.silo?.name ?? "Guia"}</p>
                    <p className="mt-1 text-lg font-semibold text-(--ink)">{post.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-(--muted)">{post.meta_description || "Abrir conteúdo"}</p>
                  </div>
                  <p className="text-sm font-semibold text-(--brand-hot) transition group-hover:translate-x-0.5">Ler guia</p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section data-home-scroll id="cta" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <BrandBeamCard as="div" className="grid gap-6 rounded-3xl p-6 md:grid-cols-[1.2fr_auto] md:items-end md:p-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold leading-tight text-(--ink)">Quer uma ajuda para escolher com mais segurança?</h2>
            <p className="text-base leading-relaxed text-(--muted)">
              Se você está em dúvida, quer sugerir um tema ou quer que a gente cubra um tipo específico de carrinho
              (viagem, compacto, custo-benefício, bebê de 1 ano...), manda sua pergunta. Às vezes a sua dúvida é
              exatamente o próximo guia que muita gente precisa.
            </p>
            <p className="text-xs text-(--muted-2)">Você também pode sugerir um tema para o próximo artigo.</p>
          </div>

          <Link
            href="/contato"
            className="inline-flex h-fit items-center justify-center rounded-xl bg-(--brand-hot) px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Falar com a gente
          </Link>
        </BrandBeamCard>
      </section>

      <JsonLd data={[organizationLd, websiteLd]} />
    </div>
  );
}
