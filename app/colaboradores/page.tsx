import Image from "next/image";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { ANA_LINDA_PROFILE, COLLABORATORS } from "@/lib/site/collaborators";
import { resolveSiteUrl } from "@/lib/site/url";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Colaboradores",
  description: "Conheça a equipe autora do Lindisse e os perfis oficiais de cada colaborador.",
  alternates: {
    canonical: "/colaboradores",
  },
};

type CollaboratorCard = {
  id: string;
  name: string;
  professionalName?: string;
  role: string;
  summary: string;
  details: string[];
  highlights: string[];
  location?: string;
  experienceSince?: number;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  links: Array<{ label: string; href: string }>;
};

const collaboratorCards: CollaboratorCard[] = [
  ...COLLABORATORS.map((collaborator) => ({
    id: collaborator.id,
    name: collaborator.name,
    professionalName: collaborator.professionalName,
    role: collaborator.siteRole,
    summary: collaborator.shortBio,
    details: collaborator.fullBio,
    highlights: collaborator.specialties,
    location: collaborator.location,
    experienceSince: collaborator.experienceSince,
    image: collaborator.image,
    links: collaborator.links,
  })),
  {
    id: "adalba",
    name: "Adalba",
    role: "Parte da equipe",
    summary: "SEO - Dev - Filmmaker · @adalbafilms",
    details: [],
    highlights: [],
    image: {
      src: "/adalberto-foto.webp",
      alt: "Adalba, responsável por SEO e desenvolvimento do Lindisse",
      width: 720,
      height: 960,
    },
    links: [
      { label: "Site", href: "https://adalbapro.com.br/" },
      { label: "Instagram", href: "https://www.instagram.com/adalbafilms/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/adalbertoescalante/" },
    ],
  },
];

const siteUrl = resolveSiteUrl().replace(/\/$/, "");

const schemaBlocks = [
  ...collaboratorCards.map((card) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    name: card.name,
    alternateName: card.professionalName,
    jobTitle: card.role,
    description: card.summary,
    image: `${siteUrl}${card.image.src}`,
    sameAs: card.links.map((link) => link.href),
    worksFor: {
      "@type": "Organization",
      name: "Lindisse",
      url: siteUrl,
    },
  })),
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Colaboradores",
        item: `${siteUrl}/colaboradores`,
      },
    ],
  },
];

export default function ColaboradoresPage() {
  return (
    <article className="space-y-6">
      <header className="rounded-3xl border border-[rgba(165,119,100,0.24)] bg-[linear-gradient(148deg,rgba(255,255,255,0.95)_0%,rgba(255,247,230,0.96)_52%,rgba(241,188,153,0.42)_100%)] p-8">
        <h1 className="text-3xl font-semibold text-(--ink)">Colaboradores</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-(--muted)">
          Aqui você encontra quem escreve e desenvolve os conteúdos do Lindisse.
        </p>
      </header>

      <ul className="space-y-6">
        {collaboratorCards.map((card) => (
          <li
            key={card.id}
            className="rounded-3xl border border-[rgba(165,119,100,0.24)] bg-[linear-gradient(148deg,rgba(255,255,255,0.96)_0%,rgba(255,247,230,0.94)_54%,rgba(241,188,153,0.28)_100%)] p-6 shadow-[0_14px_32px_rgba(165,119,100,0.14)] md:p-8"
          >
            <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
              <div className="overflow-hidden rounded-2xl border border-[rgba(165,119,100,0.24)] bg-white/70">
                <Image
                  src={card.image.src}
                  alt={card.image.alt}
                  width={card.image.width}
                  height={card.image.height}
                  sizes="(min-width: 768px) 220px, 100vw"
                  className="h-full w-full object-cover"
                  priority={card.id === ANA_LINDA_PROFILE.id}
                />
              </div>

              <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-(--muted-2)">{card.role}</p>
                <div>
                  <h2 className="text-2xl font-semibold text-(--ink)">{card.name}</h2>
                  {card.professionalName ? (
                    <p className="text-sm font-medium text-(--muted)">{card.professionalName}</p>
                  ) : null}
                </div>

                <p className="text-sm leading-relaxed text-(--muted)">{card.summary}</p>

                <div className="flex flex-wrap gap-2 text-xs text-(--ink)">
                  {typeof card.experienceSince === "number" ? (
                    <span className="rounded-full border border-[rgba(165,119,100,0.28)] bg-white/70 px-3 py-1">
                      Desde {card.experienceSince}
                    </span>
                  ) : null}
                  {card.location ? (
                    <span className="rounded-full border border-[rgba(165,119,100,0.28)] bg-white/70 px-3 py-1">{card.location}</span>
                  ) : null}
                </div>

                <div className="space-y-3 text-sm leading-relaxed text-(--muted)">
                  {card.details.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                {card.highlights.length ? (
                  <ul className="grid gap-2 text-sm text-(--muted) sm:grid-cols-2">
                    {card.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="rounded-xl border border-[rgba(165,119,100,0.22)] bg-white/70 px-3 py-2"
                      >
                        {highlight}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex flex-wrap gap-3 text-sm">
                  {card.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-(--brand-hot) underline"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <JsonLd data={schemaBlocks} />
    </article>
  );
}

