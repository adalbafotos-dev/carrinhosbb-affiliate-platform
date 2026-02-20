import type { Metadata } from "next";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Política editorial",
  description: `Saiba como os conteúdos do ${SITE_NAME} são produzidos, revisados e atualizados.`,
  alternates: {
    canonical: "/politica-editorial",
  },
  openGraph: {
    title: `Politica editorial | ${SITE_NAME}`,
    description: `Saiba como os conteúdos do ${SITE_NAME} são produzidos, revisados e atualizados.`,
    url: new URL("/politica-editorial", SITE_URL).toString(),
  },
};

const LAST_UPDATED_ISO = "2026-02-18";
const LAST_UPDATED_LABEL = "18 de fevereiro de 2026";

export default function PoliticaEditorialPage() {
  return (
    <article className="space-y-6 page-in">
      <BrandBeamCard as="header" className="rounded-3xl p-8">
        <h1 className="text-3xl font-semibold text-(--ink)">Política Editorial</h1>
        <p className="mt-3 text-sm text-(--muted)">
          Última atualização: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_LABEL}</time>
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
          Esta página descreve como o {SITE_NAME} publica guias e comparativos para apoiar decisões de compra em bebê e puericultura.
        </p>
      </BrandBeamCard>

      <BrandBeamCard as="div" className="rounded-3xl p-8 text-sm text-(--muted)">
        <div className="space-y-7">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">1. Como os conteúdos são produzidos</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Partimos de dúvidas reais de compra para definir o objetivo do conteúdo.</li>
              <li>Levantamos critérios comparáveis: segurança, usabilidade, durabilidade e custo-benefício.</li>
              <li>Consolidamos informações de fabricantes, avaliações de usuários e documentação pública quando aplicável.</li>
              <li>Publicamos textos claros, com linguagem direta e orientada à decisão.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">2. Critérios de comparação</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Faixa de preço e proposta de valor.</li>
              <li>Recursos de segurança e conforto.</li>
              <li>Facilidade de uso na rotina (peso, fechamento, transporte e limpeza).</li>
              <li>Disponibilidade e histórico de satisfação dos usuários.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">3. Atualização e correções</h2>
            <p>
              Revisamos periodicamente os conteúdos para manter links, disponibilidade e critérios coerentes com o mercado.
              Quando identificamos erro factual, corrigimos o texto com prioridade.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">4. Independência editorial e afiliados</h2>
            <p>
              O {SITE_NAME} pode receber comissão por links de afiliado, mas isso não altera o preço para o usuário.
              A existência de comissão não define recomendação, ranking ou conclusão editorial.
            </p>
            <p>
              Para mais detalhes, consulte a página <a className="underline" href="/afiliados">Afiliados e Transparência</a>.
            </p>
          </section>
        </div>
      </BrandBeamCard>
    </article>
  );
}

