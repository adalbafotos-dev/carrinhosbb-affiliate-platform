import type { Metadata } from "next";
import { BrandBeamCard } from "@/components/site/BrandBeamCard";
import { SITE_CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contato",
  description: `Canal de contato do ${SITE_NAME} para dúvidas, correções e sugestões de pauta.`,
  alternates: {
    canonical: "/contato",
  },
  openGraph: {
    title: `Contato | ${SITE_NAME}`,
    description: `Canal de contato do ${SITE_NAME} para dúvidas, correções e sugestões de pauta.`,
    url: `${SITE_URL}/contato`,
    type: "website",
  },
};

export default function ContatoPage() {
  return (
    <div className="space-y-6 page-in">
      <BrandBeamCard as="header" className="rounded-3xl p-8">
        <p className="text-xs uppercase tracking-wide text-(--muted-2)">{SITE_NAME}</p>
        <h1 className="mt-2 text-3xl font-semibold">Contato</h1>
        <p className="mt-3 max-w-2xl text-sm text-(--muted)">
          Use este canal para dúvidas sobre conteúdo, sugestões de novos guias e pedidos de correção.
        </p>
      </BrandBeamCard>

      <BrandBeamCard as="section" className="rounded-3xl p-8 text-sm text-(--muted)">
        <p>
          E-mail: <a className="font-semibold text-(--brand-hot) underline" href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>
        </p>
        <p className="mt-3">WhatsApp: Em breve.</p>
        <p className="mt-1">Formulário de contato: Em breve.</p>
      </BrandBeamCard>
    </div>
  );
}

