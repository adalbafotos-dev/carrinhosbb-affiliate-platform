export type CollaboratorLink = {
  label: string;
  href: string;
};

export type CollaboratorProfile = {
  id: string;
  name: string;
  professionalName?: string;
  siteRole: string;
  shortBio: string;
  fullBio: string[];
  specialties: string[];
  location: string;
  experienceSince: number;
  image: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  links: CollaboratorLink[];
  reviewedByShort: string;
  expertBoxShort: string;
  aliases?: string[];
};

export const ANA_LINDA_PROFILE: CollaboratorProfile = {
  id: "ana-linda-ferreira",
  name: "Ana Linda Ferreira",
  professionalName: "Ana Linda Ferreira",
  siteRole: "Autora e editora no Bebe na Rota",
  shortBio:
    "Mae de familia, autora e editora especializada em guias de compra para rotina com bebe, com foco em seguranca, usabilidade e custo-beneficio.",
  fullBio: [
    "Ana Linda Ferreira lidera a linha editorial do Bebe na Rota com conteudos praticos para familias que precisam decidir melhor no dia a dia.",
    "A metodologia combina analise tecnica de produto, leitura de avaliacoes reais e comparacao direta de uso para transformar duvida em decisao clara.",
  ],
  specialties: [
    "Comparativos de carrinhos de bebe",
    "Seguranca e usabilidade em puericultura",
    "Guias de compra para familias",
    "Curadoria de ofertas e marcas",
  ],
  location: "Brasil",
  experienceSince: 2024,
  image: {
    src: "/ana-linda-ferreira-manicure.webp",
    alt: "Ana Linda Ferreira, autora e editora do Bebe na Rota",
    width: 720,
    height: 960,
  },
  links: [],
  reviewedByShort: "Conteudo revisado por Ana Linda Ferreira.",
  expertBoxShort:
    "Mae de familia, autora e editora do Bebe na Rota, com foco em escolhas seguras para passeio e rotina com bebe.",
  aliases: ["Equipe Bebe na Rota", "Equipe editorial Bebe na Rota", "Bebe na Rota"],
};

// Compatibilidade com imports legados do projeto.
export const BEBE_NA_ROTA_PROFILE = ANA_LINDA_PROFILE;
export const COLLABORATORS: CollaboratorProfile[] = [ANA_LINDA_PROFILE];

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findCollaboratorByName(name: string | null | undefined) {
  if (!name || !name.trim()) return null;
  const target = normalizeName(name);
  for (const collaborator of COLLABORATORS) {
    const candidates = [collaborator.name, collaborator.professionalName, ...(collaborator.aliases ?? [])]
      .filter(Boolean)
      .map((item) => normalizeName(item as string));
    if (candidates.includes(target)) return collaborator;
  }
  return null;
}

export const EDITOR_AUTHOR_OPTIONS = Array.from(
  new Set(
    [ANA_LINDA_PROFILE.name, ANA_LINDA_PROFILE.professionalName, "Equipe Bebe na Rota"]
      .filter((value): value is string => Boolean(value && value.trim()))
      .map((value) => value.trim())
  )
);
