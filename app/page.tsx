import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { resolveSiteUrl } from "@/lib/site/url";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

const siteUrl = resolveSiteUrl();
const homeTitle = "Bebê na Rota | Guias de carrinhos, cadeirinhas, slings e berços";
const homeDescription =
  "Comparativos e checklists para escolher com segurança e evitar compra errada: carrinhos, cadeirinhas, slings e berços portáteis.";
const homeSocialImage = "/logomarca-bebe-na-rota.webp";
const twitterSite = process.env.NEXT_PUBLIC_TWITTER_SITE?.trim() || undefined;

const TRUST_ITEMS = [
  {
    title: "Critérios antes do preço",
    description: "A gente começa pela rotina e segurança, depois entra em custo-benefício.",
  },
  {
    title: "Comparativos sem enrolação",
    description: "Você entende o que muda de verdade entre as opções, sem excesso de termos técnicos.",
  },
  {
    title: "Transparência de afiliados",
    description: "Quando houver link de afiliado, isso fica claro. Você não paga nada a mais.",
  },
] as const;

const CATEGORY_CARDS = [
  {
    title: "Carrinhos de bebê",
    description:
      "Para cidade, viagem, porta-malas pequeno ou ruas irregulares. Saiba o que vale pagar e o que é só detalhe.",
    cta: "Ver guia de carrinhos",
    href: "/mobilidade-e-passeio",
  },
  {
    title: "Cadeirinhas e bebê conforto",
    description:
      "Escolha por fase, peso e tipo de carro. Entenda o essencial para transportar com mais segurança.",
    cta: "Ver guia de cadeirinhas",
    href: "/seguranca-automotiva",
  },
  {
    title: "Berço portátil e sono fora de casa",
    description:
      "Checklist prático para dormir fora com mais tranquilidade, sem improviso e com escolhas melhores.",
    cta: "Ver guia de berço portátil",
    href: "/sono-seguro-e-portabilidade",
  },
  {
    title: "Sling, canguru e carregadores",
    description:
      "Como escolher com conforto e ergonomia, evitando modelos que cansam rápido ou não se ajustam bem.",
    cta: "Ver guia de sling e canguru",
    href: "/ergonomia-e-transporte-corporal",
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

const METHOD_STEPS = [
  {
    title: "Cenário de uso",
    description: "Cidade, viagem, carro pequeno, espaço em casa, rotina diária.",
  },
  {
    title: "Segurança e fase",
    description: "O que é compatível com idade, peso e uso real.",
  },
  {
    title: "Medidas e praticidade",
    description: "Peso do produto, fechamento, porta-malas, facilidade de limpar.",
  },
  {
    title: "Durabilidade e manutenção",
    description: "O que costuma dar problema, o que é simples de resolver, o que vira dor de cabeça.",
  },
  {
    title: "Custo-benefício",
    description: "O que vale pagar e o que costuma ser gasto desnecessário.",
  },
] as const;

const IMPORTANT_LINKS = [
  { href: "/sobre", label: "Sobre o Bebê na Rota" },
  { href: "/politica-editorial", label: "Política Editorial" },
  { href: "/afiliados", label: "Aviso de Afiliados" },
  { href: "/politica-de-privacidade", label: "Política de Privacidade" },
  { href: "/contato", label: "Contato" },
] as const;

const FAQ_ITEMS = [
  {
    question: "Como escolher sem cair em “produto bonito, uso ruim”?",
    answer:
      "Comece pelo seu cenário (onde você usa, espaço e transporte) e só depois compare modelos. Se a rotina não encaixa, o produto vira estorvo.",
  },
  {
    question: "Carrinho caro sempre é melhor?",
    answer:
      "Nem sempre. O que muda de verdade é praticidade, estrutura e encaixe no seu uso. Tem coisa cara que só adiciona detalhe e peso.",
  },
  {
    question: "O que mais faz a pessoa se arrepender na escolha?",
    answer: "Medidas e praticidade: peso, fechamento, volume no porta-malas e dificuldade de limpar.",
  },
  {
    question: "Cadeirinha: por onde começar?",
    answer:
      "Pela fase (idade/peso), compatibilidade com o carro e uso real do dia a dia. Instalação e ajuste contam mais do que “marca famosa”.",
  },
  {
    question: "Sling e canguru: como não errar feio?",
    answer:
      "O ajuste e a ergonomia importam mais que o visual. Um modelo que não veste bem cansa rápido e deixa de ser usado.",
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
        alt: `${SITE_NAME} - guias e comparativos para bebê`,
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
    <div className="space-y-12 page-in">
      <section data-home-scroll className="relative flex min-h-[calc(100dvh-var(--home-header-height,136px))] items-center pt-6 pb-8 md:pt-10 md:pb-16">
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-start gap-6 px-4">
          <BrandBeamCard as="article" className="rounded-3xl p-6 md:p-8">
            <h1 className="text-3xl font-semibold leading-tight text-(--ink) md:text-5xl">
              Escolhas mais seguras para passeios, carro e rotina com bebê
            </h1>
            <p className="mt-4 max-w-4xl text-base font-medium leading-relaxed text-(--muted) md:text-lg">
              O Bebê na Rota organiza o que realmente importa na hora de comprar: critérios claros, prós e contras honestos
              e caminhos rápidos para você chegar na opção que faz sentido para o seu cenário.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="#categorias"
                className="inline-flex items-center justify-center rounded-xl bg-(--brand-hot) px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Explorar categorias
              </Link>
              <Link
                href="#metodo"
                className="inline-flex items-center justify-center rounded-xl border border-[rgba(165,119,100,0.24)] bg-white/80 px-5 py-3 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
              >
                Entender o método
              </Link>
            </div>

            <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
              Sem pressa, sem empurrão. Só orientação prática para decidir com segurança.
            </p>
          </BrandBeamCard>
        </div>
      </section>

      <section data-home-scroll aria-label="Barra de confiança" className="space-y-4 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <ul className="grid gap-4 md:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <BrandBeamCard as="li" key={item.title} className="rounded-2xl p-5">
              <h2 className="text-lg font-semibold text-(--ink)">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-(--muted)">{item.description}</p>
            </BrandBeamCard>
          ))}
        </ul>
      </section>

      <section data-home-scroll id="categorias" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Comece pelo que você precisa agora</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-(--muted)">
          Escolha uma categoria e siga o caminho mais curto até a decisão certa para o seu uso.
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          {CATEGORY_CARDS.map((card) => (
            <BrandBeamCard as="article" key={card.title} className="rounded-2xl p-5">
              <h3 className="text-xl font-semibold text-(--ink)">{card.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-(--muted)">{card.description}</p>
              <Link
                href={card.href}
                className="mt-4 inline-flex items-center rounded-xl bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
              >
                {card.cta}
              </Link>
            </BrandBeamCard>
          ))}
        </div>
      </section>

      <section data-home-scroll id="cenarios" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Escolha pelo seu cenário</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-(--muted)">
          Clique no que mais parece com a sua rotina e comece por onde faz mais sentido.
        </p>

        <div className="flex flex-wrap gap-3">
          {SCENARIO_CHIPS.map((chip) => (
            <Link
              key={chip}
              href="#categorias"
              className="inline-flex items-center rounded-full border border-[rgba(165,119,100,0.32)] bg-white/80 px-4 py-2 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
            >
              {chip}
            </Link>
          ))}
        </div>
      </section>

      <section data-home-scroll id="metodo" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Como a gente recomenda sem empurrar compra</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-(--muted)">
          Antes de listar opções, a gente organiza a decisão. O objetivo é você entender o essencial e evitar comprar algo
          que não encaixa na sua rotina.
        </p>

        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {METHOD_STEPS.map((step, index) => (
            <BrandBeamCard as="li" key={step.title} className="rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-(--muted-2)">Passo {index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold text-(--ink)">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--muted)">{step.description}</p>
            </BrandBeamCard>
          ))}
        </ol>

        <p className="text-xs leading-relaxed text-(--muted)">
          Alguns links podem ser de afiliados. Isso não altera o seu preço e ajuda a manter o projeto.
        </p>
      </section>

      <section data-home-scroll className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Transparência e informações importantes</h2>
        <p className="max-w-4xl text-sm leading-relaxed text-(--muted)">
          Se você quer entender melhor como o site funciona, comece por aqui:
        </p>

        <ul className="grid gap-3 md:grid-cols-2">
          {IMPORTANT_LINKS.map((item) => (
            <BrandBeamCard as="li" key={item.href} className="rounded-xl p-4">
              <Link href={item.href} className="text-sm font-semibold text-(--ink) underline hover:text-(--brand-hot)">
                {item.label}
              </Link>
            </BrandBeamCard>
          ))}
        </ul>
      </section>

      <section data-home-scroll id="faq" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <h2 className="text-3xl font-semibold leading-tight text-(--ink) md:text-4xl">Perguntas rápidas que evitam compra errada</h2>

        <ol className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <BrandBeamCard as="li" key={item.question} className="rounded-2xl p-5">
              <h3 className="text-lg font-semibold text-(--ink)">{item.question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-(--muted)">{item.answer}</p>
            </BrandBeamCard>
          ))}
        </ol>
      </section>

      <section data-home-scroll id="cta-final" className="space-y-5 border-t border-[rgba(193,149,86,0.4)] pt-10">
        <BrandBeamCard as="div" className="grid gap-6 rounded-3xl p-6 md:grid-cols-[1.2fr_auto] md:items-end md:p-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold leading-tight text-(--ink)">Quer decidir mais rápido e com mais segurança?</h2>
            <p className="text-base leading-relaxed text-(--muted)">
              Vá direto para a categoria certa e siga um caminho simples de comparação. Sem exagero, sem promessa milagrosa:
              só critério e orientação clara.
            </p>
            <p className="text-xs text-(--muted-2)">
              Se houver links de afiliados, isso será informado com transparência.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="#categorias"
              className="inline-flex h-fit items-center justify-center rounded-xl bg-(--brand-hot) px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Explorar categorias
            </Link>
            <Link
              href="/politica-editorial"
              className="inline-flex h-fit items-center justify-center rounded-xl border border-[rgba(165,119,100,0.24)] bg-white/80 px-6 py-3 text-sm font-semibold text-(--ink) transition hover:border-(--brand-hot) hover:text-(--brand-hot)"
            >
              Ler Política Editorial
            </Link>
          </div>
        </BrandBeamCard>
      </section>

      <JsonLd data={[organizationLd, websiteLd]} />
    </div>
  );
}
