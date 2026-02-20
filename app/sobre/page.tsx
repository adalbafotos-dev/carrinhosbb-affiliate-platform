import type { Metadata } from "next";
import Link from "next/link";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { ANA_LINDA_PROFILE } from "@/lib/site/collaborators";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Sobre",
  description: `Conheca o proposito e a metodologia editorial do ${SITE_NAME}.`,
  alternates: {
    canonical: "/sobre",
  },
  openGraph: {
    title: `Sobre | ${SITE_NAME}`,
    description: `Conheca o proposito e a metodologia editorial do ${SITE_NAME}.`,
    url: `${SITE_URL}/sobre`,
    type: "website",
  },
};

export default function SobrePage() {
  return (
    <article className="page-in space-y-6">
      <BrandBeamCard as="header" className="rounded-3xl p-8">
        <p className="text-xs uppercase tracking-wide text-(--muted-2)">{SITE_NAME}</p>
        <h1 className="mt-2 text-3xl font-semibold text-(--ink)">Sobre</h1>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
          O {SITE_NAME} existe para ajudar familias a escolherem produtos de puericultura com clareza, seguranca e
          foco em custo-beneficio. Comecamos por mobilidade e passeio, com comparativos de carrinhos de bebe.
        </p>
      </BrandBeamCard>

      <BrandBeamCard as="section" className="rounded-3xl p-8 text-sm text-(--muted)">
        <h2 className="text-xl font-semibold text-(--ink)">Como funciona nosso processo editorial</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          <li>Definimos a principal duvida de compra e os criterios objetivos de comparacao.</li>
          <li>Comparamos dados tecnicos, reputacao de marca e uso real de cada categoria.</li>
          <li>Mostramos pontos fortes, limites e perfil de uso ideal para cada recomendacao.</li>
          <li>Atualizamos os guias para manter contexto atual, links validos e informacoes claras.</li>
        </ul>
      </BrandBeamCard>

      <BrandBeamCard as="section" className="rounded-3xl p-8 text-sm text-(--muted)">
        <h2 className="text-xl font-semibold text-(--ink)">Autora e editora responsavel</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center">
          <img
            src={ANA_LINDA_PROFILE.image.src}
            alt={ANA_LINDA_PROFILE.image.alt}
            width={ANA_LINDA_PROFILE.image.width}
            height={ANA_LINDA_PROFILE.image.height}
            className="h-28 w-28 rounded-xl border border-(--border) object-cover"
            loading="lazy"
          />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-(--muted-2)">Assinatura editorial</p>
            <h3 className="text-lg font-semibold text-(--ink)">{ANA_LINDA_PROFILE.name}</h3>
            <p className="mt-1">{ANA_LINDA_PROFILE.expertBoxShort}</p>
            <p className="mt-2">
              Como mae de familia, Ana assina os conteudos com foco em escolhas praticas e seguras para a rotina real
              com bebe.
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {ANA_LINDA_PROFILE.links.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="underline">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </BrandBeamCard>

      <BrandBeamCard as="section" className="rounded-3xl p-8 text-sm text-(--muted)">
        <h2 className="text-xl font-semibold text-(--ink)">Transparencia e independencia</h2>
        <p className="mt-3">
          O site pode receber comissao por links de afiliados, mas isso nao altera o preco final para voce. A
          remuneracao nao define o veredito dos comparativos.
        </p>
        <p className="mt-3">
          Para detalhes completos, consulte <Link className="underline" href="/colaboradores">Colaboradores</Link>,{" "}
          <Link className="underline" href="/afiliados">Afiliados</Link>,{" "}
          <Link className="underline" href="/politica-editorial">Politica Editorial</Link> e{" "}
          <Link className="underline" href="/politica-de-privacidade">Politica de Privacidade</Link>.
        </p>
      </BrandBeamCard>
    </article>
  );
}
