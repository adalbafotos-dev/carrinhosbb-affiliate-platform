import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { resolveSiteUrl } from "@/lib/site/url";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;
export const dynamic = "force-static";

const siteUrl = resolveSiteUrl();
const homeTitle = "Passeios, Carro e Rotina com Bebê | Bebê na Rota";
const homeDescription =
  "Carrinhos, cadeirinhas, slings e berços portáteis explicados com clareza. Guias por cenário, checklists e critérios transparentes para o dia a dia.";
const homeSocialImage = "/logomarca-bebe-na-rota.webp";
const twitterSite = process.env.NEXT_PUBLIC_TWITTER_SITE?.trim() || undefined;

const WHAT_YOU_FIND = [
  "Guias por tema para entender opções, diferenças e cuidados práticos",
  "Checklists para organizar a escolha pelo seu cenário (casa, carro, passeio, viagem)",
  "Indicações pontuais quando fazem sentido, com transparência",
] as const;

const GUIDE_THEMES = [
  {
    title: "Mobilidade e passeio",
    description: "Carrinhos, terreno, peso, fechamento, porta-malas e rotina de saída.",
    href: "/mobilidade-e-passeio",
    cta: "Abrir Mobilidade e Passeio",
  },
  {
    title: "Segurança automotiva",
    description: "Cadeirinhas e bebê conforto: fase, compatibilidade com o carro, instalação e ajuste.",
    href: "/seguranca-automotiva",
    cta: "Abrir Segurança Automotiva",
  },
  {
    title: "Sono seguro e portabilidade",
    description: "Berço portátil e sono fora: montagem, ventilação, estabilidade e cuidados essenciais.",
    href: "/sono-seguro-e-portabilidade",
    cta: "Abrir Sono Seguro e Portabilidade",
  },
  {
    title: "Ergonomia e transporte corporal",
    description: "Sling, canguru e carregadores: ajuste, ergonomia e conforto no uso real.",
    href: "/ergonomia-e-transporte-corporal",
    cta: "Abrir Ergonomia e Transporte Corporal",
  },
] as const;

const SCENARIO_CHIPS = [
  "Apartamento e porta-malas pequeno",
  "Ruas irregulares e calçadas ruins",
  "Viagens e aeroporto",
  "Recém-nascido e primeiros meses",
  "Rotina fora de casa",
  "Carro pequeno e pouco espaço",
] as const;

const CRITERIA_STEPS = [
  {
    title: "Cenário de uso",
    description: "Cidade, viagem, terreno, espaço e frequência de saída.",
  },
  {
    title: "Fase e segurança",
    description: "O que é compatível com idade/peso e como usar do jeito correto.",
  },
  {
    title: "Medidas e encaixe",
    description: "Peso, volume, fechamento, ajuste no carro e facilidade de guardar.",
  },
  {
    title: "Rotina e manutenção",
    description: "Limpeza, desgaste, peças e o que costuma virar dor de cabeça.",
  },
  {
    title: "Prioridades e orçamento",
    description: "O que vale priorizar no seu caso, sem pagar por detalhe que não muda a rotina.",
  },
] as const;

const IMPORTANT_PAGES = [
  { href: "/sobre", label: "Sobre o Bebê na Rota" },
  { href: "/politica-editorial", label: "Política Editorial" },
  { href: "/afiliados", label: "Aviso de Afiliados" },
  { href: "/politica-de-privacidade", label: "Política de Privacidade" },
  { href: "/contato", label: "Contato" },
] as const;

const EDITORIAL_PRINCIPLES = [
  {
    title: "O que a gente avalia nos guias",
    description:
      "Avaliamos cenário de uso, fase/segurança, medidas, praticidade e manutenção. O foco é deixar claro o que muda na rotina.",
  },
  {
    title: "Como escolhemos o que publicar",
    description: "Organizamos por temas e cenários comuns, para facilitar navegação e manter tudo coerente.",
  },
  {
    title: "Como funcionam as indicações",
    description:
      "Quando indicamos um produto, é por conveniência para o leitor. Se houver link de afiliado, isso será sinalizado com transparência.",
  },
  {
    title: "Correções e melhorias",
    description:
      "Se você notar algo desatualizado ou quiser sugerir tema, fale com a gente. O objetivo é manter o conteúdo claro e útil.",
  },
] as const;

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: SITE_NAME,
    locale: "pt_BR",
    title: homeTitle,
    description: homeDescription,
    images: [
      {
        url: homeSocialImage,
        alt: `${SITE_NAME} - guias e checklists para a rotina com bebê`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: twitterSite,
    title: homeTitle,
    description: homeDescription,
    images: [homeSocialImage],
  },
};

export default function HomePage() {
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    description: homeDescription,
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
    <div className="page-in space-y-14 pb-6 md:space-y-16">
      <section
        data-home-scroll
        className="relative flex min-h-[calc(100dvh-var(--home-header-height,136px))] items-center px-4 pt-8 pb-10 md:pt-12 md:pb-16"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-4xl space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-(--ink) md:text-6xl">Guias práticos para passeios, carro e rotina com bebê</h1>
            <p className="text-base leading-relaxed text-(--muted) md:text-lg">
              Aqui você encontra guias organizados por cenário para entender diferenças, cuidados e uso real de carrinhos,
              cadeirinhas, slings e berços portáteis. Linguagem simples, critérios claros e navegação direta.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="#guias"
                className="inline-flex items-center justify-center rounded-xl bg-(--brand-hot) px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Ver guias por tema
              </Link>
              <Link
                href="#criterios"
                className="inline-flex items-center justify-center rounded-xl border border-[rgba(165,119,100,0.28)] bg-white/80 px-5 py-3 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
              >
                Ler os critérios
              </Link>
            </div>

          </div>
        </div>
      </section>

      <section data-home-scroll className="border-t border-[rgba(193,149,86,0.4)] px-4 pt-10 md:pt-12">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">O que você encontra aqui</h2>
          <ul className="grid gap-3 text-sm leading-relaxed text-(--muted) md:grid-cols-3 md:gap-5 md:text-base">
            {WHAT_YOU_FIND.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-(--brand-hot)" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-home-scroll id="guias" className="border-t border-[rgba(193,149,86,0.4)] px-4 pt-10 md:pt-12">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Guias por tema</h2>
          <p className="max-w-4xl text-sm leading-relaxed text-(--muted) md:text-base">
            Escolha um tema e navegue por guias e comparativos organizados. A ideia é você encontrar rápido o que importa para
            o seu cenário.
          </p>

          <ul className="divide-y divide-[rgba(193,149,86,0.25)] border-y border-[rgba(193,149,86,0.25)]">
            {GUIDE_THEMES.map((theme) => (
              <li key={theme.href} className="py-6">
                <h3 className="text-xl font-semibold text-(--ink)">{theme.title}</h3>
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-(--muted) md:text-base">{theme.description}</p>
                <Link href={theme.href} className="mt-3 inline-flex text-sm font-semibold text-(--ink) underline hover:text-(--brand-hot)">
                  {theme.cta}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-home-scroll id="cenarios" className="border-t border-[rgba(193,149,86,0.4)] px-4 pt-10 md:pt-12">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Atalhos por cenário</h2>
          <p className="max-w-4xl text-sm leading-relaxed text-(--muted) md:text-base">
            Se você prefere começar pela rotina, escolha um cenário abaixo.
          </p>

          <div className="flex flex-wrap gap-3">
            {SCENARIO_CHIPS.map((chip) => (
              <Link
                key={chip}
                href="#guias"
                className="inline-flex items-center rounded-full border border-[rgba(165,119,100,0.32)] bg-white/80 px-4 py-2 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
              >
                {chip}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section data-home-scroll id="criterios" className="border-t border-[rgba(193,149,86,0.4)] px-4 pt-10 md:pt-12">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Como organizamos os guias do Bebê na Rota</h2>
          <p className="max-w-4xl text-sm leading-relaxed text-(--muted) md:text-base">
            Antes de listar opções, a gente organiza o cenário. Isso ajuda a entender o que realmente muda na rotina.
          </p>

          <ol className="divide-y divide-[rgba(193,149,86,0.25)] border-y border-[rgba(193,149,86,0.25)]">
            {CRITERIA_STEPS.map((step, index) => (
              <li key={step.title} className="py-5">
                <h3 className="text-lg font-semibold text-(--ink)">
                  <span className="mr-2 text-(--brand-hot)">{index + 1}.</span>
                  {step.title}
                </h3>
                <p className="mt-2 max-w-4xl text-sm leading-relaxed text-(--muted) md:text-base">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section data-home-scroll className="border-t border-[rgba(193,149,86,0.4)] px-4 pt-10 md:pt-12">
        <div className="mx-auto w-full max-w-6xl">
          <div className="border-l-4 border-(--brand-hot) pl-4 md:pl-5">
            <h2 className="text-xl font-semibold text-(--ink) md:text-2xl">Nota de transparência</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-(--muted) md:text-base">
              Algumas indicações podem usar link de afiliado. Isso não altera o valor para você e ajuda a manter o site.
              Quando existir, a indicação será sinalizada.
            </p>
          </div>
        </div>
      </section>

      <section data-home-scroll className="border-t border-[rgba(193,149,86,0.4)] px-4 pt-10 md:pt-12">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Páginas permanentes</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-(--muted) md:text-base">
            {IMPORTANT_PAGES.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="font-semibold text-(--ink) underline hover:text-(--brand-hot)">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-home-scroll id="principios" className="border-t border-[rgba(193,149,86,0.4)] px-4 pt-10 md:pt-12">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Princípios editoriais</h2>
          <ul className="divide-y divide-[rgba(193,149,86,0.25)] border-y border-[rgba(193,149,86,0.25)]">
            {EDITORIAL_PRINCIPLES.map((item) => (
              <li key={item.title} className="py-2">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3 [&::-webkit-details-marker]:hidden">
                    <h3 className="text-left text-lg font-semibold text-(--ink)">{item.title}</h3>
                    <span aria-hidden="true" className="mt-1 text-(--muted) transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pb-3 text-sm leading-relaxed text-(--muted) md:text-base">{item.description}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-home-scroll id="cta-final" className="border-t border-[rgba(193,149,86,0.4)] px-4 pt-10 md:pt-12">
        <div className="mx-auto w-full max-w-6xl">
          <BrandBeamCard as="div" className="grid gap-6 rounded-3xl p-6 md:grid-cols-[1.2fr_auto] md:items-end md:p-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold leading-tight text-(--ink)">Comece pelo tema que faz parte da sua rota</h2>
              <p className="text-base leading-relaxed text-(--muted)">
                Explore os guias por tema ou leia a Política Editorial para entender como a gente organiza os conteúdos.
              </p>
              <p className="text-xs text-(--muted-2)">Indicações com link de afiliado serão sempre sinalizadas.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="#guias"
                className="inline-flex h-fit items-center justify-center rounded-xl bg-(--brand-hot) px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Ver guias por tema
              </Link>
              <Link
                href="/politica-editorial"
                className="inline-flex h-fit items-center justify-center rounded-xl border border-[rgba(165,119,100,0.24)] bg-white/80 px-6 py-3 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
              >
                Política Editorial
              </Link>
            </div>
          </BrandBeamCard>
        </div>
      </section>

      <JsonLd data={[organizationLd, websiteLd]} />
    </div>
  );
}
