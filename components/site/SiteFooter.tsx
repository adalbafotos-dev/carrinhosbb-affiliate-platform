import Link from "next/link";
import Image from "next/image";
import {
  AMAZON_AFFILIATE_DISCLOSURE,
  SITE_CONTACT_EMAIL,
  SITE_DOMAIN,
  SITE_NAME,
} from "@/lib/site";

const FOOTER_LOGO_SRC = "/logomarca-bebe-na-rota-monocrom.webp";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-(--border) bg-(--paper)">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-10 md:grid-cols-2 xl:grid-cols-4">
        <section className="flex h-full flex-col items-start gap-3">
          <h2 className="text-sm font-semibold text-(--ink)">
            {SITE_NAME} — escolhas mais seguras para a rotina com bebê
          </h2>
          <p className="text-xs leading-relaxed text-(--muted-2)">
            Guias e comparativos para ajudar você a decidir com calma, clareza e responsabilidade.
          </p>
          <Link href="/" aria-label={`${SITE_NAME} - Home`} className="mt-auto inline-flex items-center pt-2">
            <Image
              src={FOOTER_LOGO_SRC}
              alt={SITE_NAME}
              width={260}
              height={84}
              sizes="260px"
              className="h-16 w-auto object-contain"
            />
          </Link>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-(--ink)">Aviso de afiliados</h2>
          <p className="text-xs leading-relaxed text-(--muted-2)">{AMAZON_AFFILIATE_DISCLOSURE}</p>
          <p className="text-xs leading-relaxed text-(--muted-2)">
            Quando indicamos algo, é sempre com o objetivo de facilitar sua decisão e trazer mais clareza para a sua
            compra.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-(--ink)">Institucional</h2>
          <ul className="space-y-1 text-xs text-(--muted-2)">
            <li>
              <Link className="hover:text-(--brand-hot)" href="/sobre">
                Sobre
              </Link>
            </li>
            <li>
              <Link className="hover:text-(--brand-hot)" href="/colaboradores">
                Colaboradores
              </Link>
            </li>
            <li>
              <Link className="hover:text-(--brand-hot)" href="/politica-editorial">
                Política editorial
              </Link>
            </li>
            <li>
              <Link className="hover:text-(--brand-hot)" href="/politica-de-privacidade">
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link className="hover:text-(--brand-hot)" href="/afiliados">
                Afiliados e transparência
              </Link>
            </li>
            <li>
              <Link className="hover:text-(--brand-hot)" href="/contato">
                Contato
              </Link>
            </li>
            <li>
              <a className="hover:text-(--brand-hot)" href="/sitemap.xml" target="_blank" rel="noreferrer">
                Sitemap XML
              </a>
            </li>
            <li>
              <a className="hover:text-(--brand-hot)" href="/robots.txt" target="_blank" rel="noreferrer">
                Robots.txt
              </a>
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-(--ink)">Fale com a gente</h2>
          <ul className="space-y-1 text-xs text-(--muted-2)">
            <li>
              <a className="hover:text-(--brand-hot)" href={`mailto:${SITE_CONTACT_EMAIL}`} rel="noreferrer">
                {SITE_CONTACT_EMAIL}
              </a>
            </li>
            <li>WhatsApp: Em breve</li>
            <li>Atendimento: Em breve</li>
          </ul>
        </section>
      </div>

      <div className="border-t border-(--border) py-6 text-center text-xs text-(--muted-3)">
        © {new Date().getFullYear()} {SITE_NAME} ({SITE_DOMAIN}). Todos os direitos reservados.
      </div>
    </footer>
  );
}
