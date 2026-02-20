import type { Metadata } from "next";
import Link from "next/link";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { COLLABORATORS } from "@/lib/site/collaborators";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Colaboradores",
  description: `Conheca quem assina e revisa os conteudos do ${SITE_NAME}.`,
  alternates: {
    canonical: "/colaboradores",
  },
  openGraph: {
    title: `Colaboradores | ${SITE_NAME}`,
    description: `Conheca quem assina e revisa os conteudos do ${SITE_NAME}.`,
    url: `${SITE_URL}/colaboradores`,
    type: "website",
  },
};

export default function ColaboradoresPage() {
  return (
    <article className="page-in space-y-6">
      <BrandBeamCard as="header" className="rounded-3xl p-8">
        <p className="text-xs uppercase tracking-wide text-(--muted-2)">{SITE_NAME}</p>
        <h1 className="mt-2 text-3xl font-semibold text-(--ink)">Colaboradores</h1>
        <p className="mt-4 max-w-4xl text-sm leading-relaxed text-(--muted)">
          Esta pagina apresenta quem assina, revisa e responde pela qualidade editorial dos conteudos publicados no
          site.
        </p>
      </BrandBeamCard>

      <section className="grid gap-5">
        {COLLABORATORS.map((collaborator) => (
          <BrandBeamCard key={collaborator.id} as="article" className="rounded-3xl p-6">
            <div className="grid gap-4 md:grid-cols-[132px_minmax(0,1fr)] md:items-center">
              <img
                src={collaborator.image.src}
                alt={collaborator.image.alt}
                width={collaborator.image.width}
                height={collaborator.image.height}
                className="h-32 w-32 rounded-xl border border-(--border) object-cover"
                loading="lazy"
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-(--muted-2)">{collaborator.siteRole}</p>
                <h2 className="text-2xl font-semibold text-(--ink)">{collaborator.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-(--muted)">{collaborator.shortBio}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--muted)">
                  {collaborator.specialties.map((specialty) => (
                    <li key={specialty}>{specialty}</li>
                  ))}
                </ul>
              </div>
            </div>
          </BrandBeamCard>
        ))}
      </section>

      <BrandBeamCard as="section" className="rounded-3xl p-8 text-sm text-(--muted)">
        <h2 className="text-xl font-semibold text-(--ink)">Metodologia editorial</h2>
        <p className="mt-3">
          Os conteudos seguem criterios de comparacao objetiva e linguagem clara para apoiar decisoes praticas de
          compra.
        </p>
        <p className="mt-3">
          Leia tambem a pagina <Link className="underline" href="/sobre">Sobre</Link> para ver o processo completo.
        </p>
      </BrandBeamCard>
    </article>
  );
}
