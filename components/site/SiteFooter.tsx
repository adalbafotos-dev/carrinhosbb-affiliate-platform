import Link from "next/link";
import { AffiliateDisclosure } from "./AffiliateDisclosure";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-(--border)">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Lindisse — Autoridade em Unhas</p>
          <p className="text-xs text-(--muted-2)">
            Guias e reviews com foco em clareza, semantica forte e recomendacoes seguras para nail designers.
          </p>
          <div className="flex gap-3 text-xs text-(--muted-2)">
            <Link className="hover:text-(--brand-hot)" href="/politica-de-afiliados">Política de afiliados</Link>
            <span>•</span>
            <Link className="hover:text-(--brand-hot)" href="/sobre">Sobre</Link>
            <span>•</span>
            <Link className="hover:text-(--brand-hot)" href="/sitemap.xml">Sitemap</Link>
          </div>
        </div>

        <AffiliateDisclosure />
      </div>

      <div className="border-t border-(--border) py-6 text-center text-xs text-(--muted-3)">
        © {new Date().getFullYear()} Lindisse. Todos os direitos reservados.
      </div>
    </footer>
  );
}

