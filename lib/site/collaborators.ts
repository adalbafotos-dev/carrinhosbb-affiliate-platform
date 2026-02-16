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
  professionalName: "Ana Linda (Lindisse Estetic)",
  siteRole: "Autora e especialista técnica (unhas em gel, fibra e pedicure)",
  shortBio:
    "Manicure e professora desde 2018, especialista em unhas em gel, fibra e pedicure de alto padrão, com experiência prática em testes de equipamentos e ferramentas para nail designers.",
  fullBio: [
    "Ana Linda Ferreira é manicure e professora desde 2018, atuando com foco em unhas em gel, fibra e pedicure de alto padrão. Trabalha com procedimentos estéticos nas unhas e possui vivência prática com diferentes equipamentos e ferramentas usados por nail designers, avaliando eficiência, usabilidade e resultados no dia a dia.",
    "Atende e ensina no Centro de São Paulo (SP), acompanhando de perto as necessidades reais de profissionais e clientes. Além da atuação técnica, é mãe de família e empreendedora, conciliando rotina profissional com compromisso em oferecer um trabalho consistente, seguro e bem executado.",
  ],
  specialties: [
    "Unhas em gel (aplicação e acabamento)",
    "Unhas de fibra (aplicação e manutenção)",
    "Pedicure de alto padrão",
    "Avaliação prática de equipamentos e ferramentas (cabines, acessórios e itens de rotina)",
  ],
  location: "Centro de São Paulo, SP (Brasil)",
  experienceSince: 2018,
  image: {
    src: "/ana-linda-ferreira-manicure.webp",
    alt: "Ana Linda Ferreira, manicure e especialista em unhas em gel, fibra e pedicure",
    width: 720,
    height: 960,
  },
  links: [{ label: "Pinterest", href: "https://br.pinterest.com/lindissestetic/" }],
  reviewedByShort:
    "Conteúdo escrito por Ana Linda Ferreira, manicure e professora desde 2018, especialista em gel, fibra e pedicure de alto padrão.",
  expertBoxShort:
    "Ana Linda Ferreira - Manicure e professora desde 2018. Especialista em gel, fibra e pedicure de alto padrão.",
  aliases: ["Ana Linda", "Lindisse Estetic"],
};

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

export const EDITOR_AUTHOR_OPTIONS = [
  ANA_LINDA_PROFILE.name,
  ANA_LINDA_PROFILE.professionalName,
  "Equipe Lindisse",
].filter((value): value is string => Boolean(value && value.trim()));
