export const DEFAULT_EEAT_AUTHOR = {
  authorName: "Ana Linda Ferreira",
  expertName: "Ana Linda Ferreira",
  expertRole: "Especialista em Nail Design e Unhas de Gel",
  expertBio:
    "Nail designer com foco em biosseguranca, avaliacao tecnica de produtos e performance real em mesa de atendimento.",
  expertCredentials: "Nail Designer",
  reviewedBy: "Equipe Lindisse",
  disclaimer:
    "Este conteudo pode conter links de afiliado. Como Associado da Amazon, o Lindisse pode receber comissao por compras qualificadas, sem custo adicional para voce.",
  authorLinks: ["https://br.pinterest.com/lindissestetic/", "https://lindisse.com.br/colaboradores"],
} as const;

function normalizeText(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed;
}

function normalizeLinks(value: string[] | null | undefined) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean);
}

export function resolveDefaultEeat(input: {
  authorName?: string | null;
  expertName?: string | null;
  expertRole?: string | null;
  expertBio?: string | null;
  expertCredentials?: string | null;
  reviewedBy?: string | null;
  disclaimer?: string | null;
  authorLinks?: string[] | null;
}) {
  const authorName = normalizeText(input.authorName) || DEFAULT_EEAT_AUTHOR.authorName;
  const expertName = normalizeText(input.expertName) || authorName || DEFAULT_EEAT_AUTHOR.expertName;
  const expertRole = normalizeText(input.expertRole) || DEFAULT_EEAT_AUTHOR.expertRole;
  const expertBio = normalizeText(input.expertBio) || DEFAULT_EEAT_AUTHOR.expertBio;
  const expertCredentials = normalizeText(input.expertCredentials) || DEFAULT_EEAT_AUTHOR.expertCredentials;
  const reviewedBy = normalizeText(input.reviewedBy) || DEFAULT_EEAT_AUTHOR.reviewedBy;
  const disclaimer = normalizeText(input.disclaimer) || DEFAULT_EEAT_AUTHOR.disclaimer;
  const authorLinks = normalizeLinks(input.authorLinks);

  return {
    authorName,
    expertName,
    expertRole,
    expertBio,
    expertCredentials,
    reviewedBy,
    disclaimer,
    authorLinks: authorLinks.length ? authorLinks : [...DEFAULT_EEAT_AUTHOR.authorLinks],
  };
}
