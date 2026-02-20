import type { Metadata } from "next";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { SITE_CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: `Entenda como o ${SITE_NAME} trata dados, cookies e informações de navegação.`,
  alternates: {
    canonical: "/politica-de-privacidade",
  },
  openGraph: {
    title: `Politica de privacidade | ${SITE_NAME}`,
    description: `Entenda como o ${SITE_NAME} trata dados, cookies e informações de navegação.`,
    url: new URL("/politica-de-privacidade", SITE_URL).toString(),
  },
};

const LAST_UPDATED_ISO = "2026-02-18";
const LAST_UPDATED_LABEL = "18 de fevereiro de 2026";

export default function PoliticaPrivacidadePage() {
  return (
    <article className="space-y-6 page-in">
      <BrandBeamCard as="header" className="rounded-3xl p-8">
        <h1 className="text-3xl font-semibold text-(--ink)">Política de Privacidade</h1>
        <p className="mt-3 text-sm text-(--muted)">
          Última atualização: <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_LABEL}</time>
        </p>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
          Esta política explica como o {SITE_NAME} coleta e utiliza dados para operar o site com transparência e conformidade com a LGPD.
        </p>
      </BrandBeamCard>

      <BrandBeamCard as="div" className="rounded-3xl p-8 text-sm text-(--muted)">
        <div className="space-y-7">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">1. Quem somos</h2>
            <p>O {SITE_NAME} é um site de conteúdo e comparativos para decisões de compra em bebê e puericultura.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                E-mail de contato: <a className="underline" href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>
              </li>
              <li>
                Site: <a className="underline" href={SITE_URL} rel="noreferrer">{SITE_URL}</a>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">2. Dados que podemos coletar</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Dados enviados voluntariamente por e-mail de contato.</li>
              <li>Dados técnicos de navegação (IP, navegador, páginas acessadas e tempo de sessão).</li>
              <li>Dados de cookies para funcionamento, medição de audiência e atribuição de afiliados.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">3. Cookies e analytics</h2>
            <p>
              Podemos usar cookies para melhorar a experiência de navegação e analisar o uso do site.
              Se ferramentas de analytics estiverem habilitadas no ambiente, os dados serão tratados de forma agregada.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">4. Compartilhamento de dados</h2>
            <p>
              Não vendemos dados pessoais. O compartilhamento ocorre apenas com fornecedores essenciais para hospedagem,
              análise de tráfego e programas de afiliados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">5. Seus direitos</h2>
            <p>
              Você pode solicitar informações, correção ou exclusão de dados pessoais tratados pelo site.
              Para isso, entre em contato por <a className="underline" href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-(--ink)">6. Alterações desta política</h2>
            <p>
              Esta política pode ser atualizada para refletir mudanças legais ou operacionais.
              A data de atualização ficará sempre visível no topo da página.
            </p>
          </section>
        </div>
      </BrandBeamCard>
    </article>
  );
}

