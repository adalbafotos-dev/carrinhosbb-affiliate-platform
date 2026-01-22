import Link from "next/link";
import { AffiliateDisclosure } from "./AffiliateDisclosure";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[color:var(--border)]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Estética da Verdade — Unhas</p>
          <p className="text-xs text-[color:var(--muted-2)]">
            Guias, reviews e recomendações para manicure e unhas, com foco em clareza e decisão segura.
          </p>
          <div className="flex gap-3 text-xs text-[color:var(--muted-2)]">
            <Link className="hover:text-[color:var(--brand-hot)]" href="/politica-de-afiliados">Política de afiliados</Link>
            <span>•</span>
            <Link className="hover:text-[color:var(--brand-hot)]" href="/sobre">Sobre</Link>
          </div>
        </div>

        <AffiliateDisclosure />
      </div>

      <div className="border-t border-[color:var(--border)] py-6 text-center text-xs text-[color:var(--muted-3)]">
        © {new Date().getFullYear()} Estética da Verdade. Todos os direitos reservados.
      </div>
    </footer>
  );
}

