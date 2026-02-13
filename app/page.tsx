import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Suspense } from "react";
import { listLatestPublicPosts } from "@/lib/db";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiloNarrativeCarousel } from "@/components/site/SiloNarrativeCarousel";
import { HomeSearchResults } from "@/components/site/HomeSearchResults";
import { resolveSiteUrl } from "@/lib/site/url";

export const revalidate = 3600;

const siteUrl = resolveSiteUrl();
const homeSocialImage = "/unhas-francesinhas-criativas-e-coloridas.webp";
const twitterSite = process.env.NEXT_PUBLIC_TWITTER_SITE?.trim() || undefined;

export const metadata: Metadata = {
  title: "Analises e Comparativos de Materiais para Unhas de Gel e Fibra | Lindisse",
  description:
    "Analises tecnicas de materiais e equipamentos para unhas de gel, fibra e nail design. Criterios claros, comparativos e recomendacoes para decisoes de compra seguras.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Lindisse",
    locale: "pt_BR",
    title: "Analises e Comparativos de Materiais para Unhas (Gel e Fibra)",
    description:
      "Criterios claros, comparativos e recomendacoes seguras para escolher materiais e equipamentos com mais confianca.",
    images: [
      {
        url: homeSocialImage,
        alt: "Materiais e equipamentos para unhas de gel e fibra em bancada de manicure",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: twitterSite,
    title: "Analises de materiais para unhas (gel e fibra)",
    description: "Comparativos e criterios claros para decidir com seguranca.",
    images: [homeSocialImage],
  },
};

const fallbackAffiliateShowcase = [
  {
    id: "sun5-48w",
    title: "Cabine Led/uv Sun5 Digital 48w Unhas Gel Acrigel, Branca Bivolt 110v - 220v",
    image: "/Cabine Led uv Sun5 Digital 48w Unhas Gel Acrigel, Branca Bivolt 110v - 220v.webp",
    href: "https://amzn.to/462V1GM",
  },
  {
    id: "kit-gel-acrigel",
    title: "Kit Unhas Gel Acrigel Alongamento Cabine Completo",
    image: "/Kit Unhas Gel Acrigel Alongamento Cabine Completo.webp",
    href: "https://amzn.to/4ktOivm",
  },
  {
    id: "kit-completo-manicure",
    title: "Kit Completo Manicure Unhas de Gel com Cabine Sun LED UV 48W e Lixadeira Elétrica Caneta Bivolt (Branco)",
    image: "/Kit Completo Manicure Unhas de Gel com Cabine Sun LED UV 48W e Lixadeira Elétrica Caneta Bivolt.webp",
    href: "https://amzn.to/3MisTJ5",
  },
] as const;

function HomeSectionIndicator({ iconSrc, label }: { iconSrc: string; label: string }) {
  return (
    <p className="session-indicator text-(--muted-2)">
      <Image
        src={iconSrc}
        alt=""
        aria-hidden
        width={96}
        height={96}
        sizes="(min-width: 768px) 96px, 72px"
        className="session-indicator-icon"
      />
      <span>{label}</span>
    </p>
  );
}
export default async function HomePage() {
  const rawPosts = await listLatestPublicPosts(48);
  const recentPosts = rawPosts.slice(0, 8);

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
      <section data-home-scroll className="relative flex min-h-[calc(100dvh-var(--home-header-height,136px))] items-center pt-6 pb-8 md:pt-10 md:pb-16">
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-start gap-6 px-4 md:grid-cols-2 md:items-center">
          <article className="relative rounded-3xl border border-[rgba(165,119,100,0.28)] bg-[linear-gradient(148deg,rgba(255,255,255,0.95)_0%,rgba(255,247,230,0.96)_52%,rgba(241,188,153,0.52)_100%)] p-6 shadow-[0_20px_44px_rgba(165,119,100,0.18)] md:p-8">
            <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
              As Melhores Escolhas em Materiais para Unhas de Gel, Fibra e Nail Design
            </h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-(--muted) md:text-lg">
              Análises técnicas, comparativos honestos e recomendações de quem entende, para você investir no
              equipamento certo e evitar prejuízos.
            </p>
          </article>

          <div className="relative m-0 p-0">
            <Image
              src="/unhas-francesinhas-criativas-e-coloridas.webp"
              alt="Unhas francesinhas criativas e coloridas"
              width={1024}
              height={683}
              priority
              sizes="(min-width: 768px) 46vw, 92vw"
              className="m-0 h-auto w-full p-0 object-contain object-bottom align-bottom"
            />
          </div>
        </div>
      </section>

      <Suspense fallback={null}>
        <HomeSearchResults posts={rawPosts} />
      </Suspense>

      <section data-home-scroll id="silos">
        <SiloNarrativeCarousel />
      </section>

      <section data-home-scroll id="melhores" className="space-y-4">
        <div className="flex flex-col gap-1">
          <HomeSectionIndicator iconSrc="/maos-e-dedos01.webp" label="Conteúdo de monetização" />
          <h2 className="text-2xl font-semibold text-(--ink)">Melhores escolhas do ano</h2>
          <p className="text-sm text-(--muted)">
            Guias comparativos de cabine UV/LED, géis e kits para você comprar com segurança e melhor custo-benefício.
          </p>
        </div>

        <div className="space-y-2">
          {fallbackAffiliateShowcase.map((offer) => (
            <article
              key={offer.id}
              className="grid grid-cols-[80px_1fr] gap-3 rounded-xl border border-[rgba(165,119,100,0.16)] bg-[rgba(230,228,226,0.78)] p-2 sm:grid-cols-[80px_1fr_auto]"
            >
              <a
                href={offer.href}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
                className="block h-20 w-20 overflow-hidden rounded-lg border border-[rgba(165,119,100,0.14)] bg-[rgba(255,255,255,0.58)]"
              >
                <Image
                  src={offer.image}
                  alt={offer.title}
                  width={80}
                  height={80}
                  sizes="80px"
                  className="h-20 w-20 object-contain p-1"
                />
              </a>

              <div className="min-w-0 self-center">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[rgba(43,44,48,0.86)]">
                  {offer.title}
                </h3>
              </div>

              <div className="col-span-2 sm:col-span-1 sm:self-center">
                <a
                  href={offer.href}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-[rgba(165,119,100,0.2)] bg-[rgba(241,188,153,0.24)] px-3 py-1.5 text-xs font-semibold text-[rgba(43,44,48,0.75)] transition hover:bg-[rgba(241,188,153,0.32)] sm:w-auto"
                >
                  Ver preco na Amazon
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section data-home-scroll id="manifesto" className="space-y-5 border-t border-(--border) pt-10">
        <HomeSectionIndicator iconSrc="/maos-e-dedos02.webp" label="Missão e Visão" />
        <h2 className="max-w-4xl text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">
          Elevando o Padrão da Nail Designer Brasileira: Onde a Técnica Encontra a Química
        </h2>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <article className="space-y-4 text-[17px] leading-relaxed text-(--muted)">
            <p>
              No Lindisse, nós não enxergamos unhas apenas como estética; nós enxergamos como uma ciência de precisão.
              A nossa visão é clara: combater a desinformação que causa descolamentos precoces, alergias severas e
              prejuízos na mesa de atendimento.
            </p>
            <p>
              Acreditamos que uma Nail Designer de Elite não é apenas aquela que faz uma arte bonita, mas aquela que
              domina a biossegurança, entende a polimerização dos polímeros e sabe escolher ferramentas que protegem a
              saúde da lâmina ungueal da cliente.
            </p>
            <p>
              Nossa missão é ser o seu laboratório de confiança. Nós dissecamos rótulos, testamos a potência real de
              cabines UV/LED e analisamos a viscosidade de géis construtores para que você não precise gastar seu lucro
              testando produtos ruins. Queremos que você tenha segurança para cobrar mais, sabendo que entrega um
              alongamento com durabilidade, curvatura C simétrica e resistência mecânica superior.
            </p>
          </article>

          <aside className="space-y-3 border-l border-(--border) pl-5 text-sm leading-relaxed text-(--muted) md:text-base">
            <p className="text-xs font-semibold uppercase tracking-wide text-(--muted-2)">O que você vai dominar</p>
            <p>
              Biossegurança no atendimento · Polimerização correta · Escolha da cabine UV/LED · Viscosidade ideal do
              gel · Curvatura C com resistência
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-(--muted-2)">
              O que muda no seu resultado
            </p>
            <p>
              Menos manutenção precoce, mais durabilidade no alongamento e mais segurança para atender e cobrar melhor.
            </p>
          </aside>
        </div>
      </section>

      <section data-home-scroll id="sobre-lindisse" className="space-y-5 border-t border-(--border) pt-10">
        <HomeSectionIndicator iconSrc="/maos-e-dedos03.webp" label="Sobre" />
        <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">
          A Curadoria Técnica que a Sua Mesa Exige
        </h2>
        <p className="max-w-4xl text-base leading-relaxed text-(--muted) md:text-lg">
          A internet está cheia de "dicas rápidas", mas a sua profissão exige protocolos seguros. O Lindisse nasceu da
          necessidade de filtrar o ruído do mercado e entregar análises fundamentadas em critérios técnicos, não em
          "achismos" ou publicidade vazia.
        </p>
        <p className="max-w-4xl text-base leading-relaxed text-(--muted) md:text-lg">
          Nós atuamos como um filtro de qualidade entre os milhares de produtos da Amazon e a sua bancada de trabalho.
          Nossos guias e reviews são construídos com foco em três pilares inegociáveis:
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <article className="space-y-2">
            <h3 className="text-lg font-semibold text-(--ink)">Clareza Técnica</h3>
            <p className="text-sm leading-relaxed text-(--muted) md:text-base">
              Traduzimos termos químicos complexos (como reações exotérmicas e fotoiniciadores) para a linguagem do
              seu dia a dia, ajudando você a evitar géis que queimam excessivamente ou top coats que amarelam.
            </p>
          </article>

          <article className="space-y-2">
            <h3 className="text-lg font-semibold text-(--ink)">Conteúdo claro e prático</h3>
            <p className="text-sm leading-relaxed text-(--muted) md:text-base">
              Nada de recomendação vaga. Você entende o motivo de cada escolha com comparativos de torque de
              micromotor, granulação de lixas e ergonomia de cabines para investir com confiança.
            </p>
          </article>

          <article className="space-y-2">
            <h3 className="text-lg font-semibold text-(--ink)">Recomendações Seguras</h3>
            <p className="text-sm leading-relaxed text-(--muted) md:text-base">
              Só indicamos produtos que passaram no teste de eficiência e segurança. Se um prep não equilibra o pH
              corretamente ou se um primer ácido é agressivo demais, nós alertamos.
            </p>
          </article>
        </div>

        <p className="max-w-4xl text-base leading-relaxed text-(--muted) md:text-lg">
          O foco é a integridade da unha natural e a longevidade do seu serviço. Aqui, você toma decisões baseadas em
          dados, garantindo que cada centavo investido retorne em forma de clientes fiéis e agenda cheia.
        </p>
      </section>

      <section data-home-scroll id="analises-recentes" className="space-y-5 border-t border-(--border) pt-10">
        <HomeSectionIndicator iconSrc="/maos-e-dedos04.webp" label="Posts mais Novos" />
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">
          Análises Recentes e Atualizações do Mercado
        </h2>

        {recentPosts.length === 0 ? (
          <p className="text-sm text-(--muted)">
            Novas análises estão a caminho. Em breve você verá aqui os conteúdos mais recentes sobre produtos,
            técnicas e tendências do mercado.
          </p>
        ) : (
          <ol className="divide-y divide-(--border)">
            {recentPosts.map((post) => (
              <li key={post.id} className="py-4">
                <Link
                  href={post.silo ? `/${post.silo.slug}/${post.slug}` : "#"}
                  className="group grid gap-3 md:grid-cols-[1fr_auto] md:items-center"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-(--muted-2)">{post.silo?.name ?? "Guia"}</p>
                    <p className="mt-1 text-lg font-semibold text-(--ink)">{post.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-(--muted)">
                      {post.meta_description || "Abrir análise para ver critérios, comparativos e recomendações."}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-(--brand-hot) transition group-hover:translate-x-0.5">
                    Ler análise
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section data-home-scroll id="cta-recomendacoes" className="space-y-5 border-t border-(--border) pt-10">
        <HomeSectionIndicator iconSrc="/maos-e-dedos05.webp" label="Saiba Mais" />
        <div className="grid gap-6 md:grid-cols-[1.2fr_auto] md:items-end">
          <div className="space-y-3 rounded-3xl border border-[rgba(165,119,100,0.28)] bg-[linear-gradient(148deg,rgba(255,255,255,0.95)_0%,rgba(255,247,230,0.98)_52%,rgba(241,188,153,0.5)_100%)] p-6 shadow-[0_16px_36px_rgba(165,119,100,0.16)] md:p-8">
            <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">
              Travada em alguma escolha técnica?
            </h2>
            <p className="text-base leading-relaxed text-(--muted) md:text-lg">
              Não compre no escuro. Se você está em dúvida entre qual Cabine de 48W ou 72W escolher, ou qual Kit de
              Fibra oferece o melhor custo-benefício para iniciantes, nós podemos te direcionar.
            </p>
            <p className="text-sm leading-relaxed text-(--muted)">
              Diga-nos qual o seu nível (Iniciante ou Master) e o que você busca resolver hoje (redução de tempo de
              mesa, acabamento ou durabilidade). Nossos guias te levam direto ao produto certo na Amazon.
            </p>
          </div>

          <Link
            href="#melhores"
            className="inline-flex h-fit items-center justify-center rounded-xl bg-(--brand-hot) px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
          >
            Ver Melhores Recomendações
          </Link>
        </div>
      </section>

      <JsonLd data={[organizationLd, websiteLd]} />
    </div>
  );
}


