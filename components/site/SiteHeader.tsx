import Link from "next/link";
import { Search } from "lucide-react";
import type { Silo } from "@/lib/types";

export function SiteHeader({ silos = [] }: { silos?: Silo[] }) {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:rgba(255,255,255,0.88)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide text-[color:var(--ink)]">
          Affiliate Content Platform
        </Link>

        <nav className="flex items-center gap-4 text-sm text-[color:var(--muted-2)]">
          <Link href="/" className="hover:text-[color:var(--brand-hot)]">
            Início
          </Link>
          {silos.map((silo) => (
            <Link key={silo.id} href={`/${silo.slug}`} className="hover:text-[color:var(--brand-hot)]">
              {silo.name}
            </Link>
          ))}
          <Link href="/sobre" className="hover:text-[color:var(--brand-hot)]">
            Sobre
          </Link>
          <Link href="/politica-de-afiliados" className="hover:text-[color:var(--brand-hot)]">
            Política
          </Link>
          <Link href="/admin" className="text-[color:var(--brand-accent)] hover:text-[color:var(--brand-hot)]">
            Admin
          </Link>
        </nav>

        <div className="hidden items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 md:flex">
          <Search size={16} className="text-[color:var(--brand-accent)]" />
          <span className="text-xs text-[color:var(--muted-2)]">Busca (em breve)</span>
        </div>
      </div>
    </header>
  );
}
