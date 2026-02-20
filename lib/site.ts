export const SITE_NAME = "Beb\u00EA na Rota";
export const SITE_DOMAIN = "bebenarota.com.br";
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const SITE_DESCRIPTION =
  "Guias e comparativos para escolhas seguras em passeios e rotina com beb\u00EA.";
export const SITE_LOCALE = "pt-BR";
export const SITE_BRAND_TAGLINE =
  "Escolhas seguras para passeios e rotina com beb\u00EA, com crit\u00E9rios claros de compara\u00E7\u00E3o.";
export const SITE_CONTACT_EMAIL = "contato@bebenarota.com.br";
export const AMAZON_AFFILIATE_DISCLOSURE =
  "Como Associado da Amazon, eu ganho com compras qualificadas. Alguns links neste site podem ser links de afiliado. Isso n\u00E3o altera o seu pre\u00E7o e ajuda a manter o projeto.";

function normalizeComparableText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isStandardAffiliateDisclosure(value: string | null | undefined) {
  if (!value || !value.trim()) return false;
  const normalized = normalizeComparableText(value);
  const standard = normalizeComparableText(AMAZON_AFFILIATE_DISCLOSURE);
  if (!normalized || !standard) return false;
  if (normalized === standard) return true;
  const coreTerms = ["associado da amazon", "compras qualificadas", "links de afiliado"];
  return coreTerms.every((term) => normalized.includes(term));
}
