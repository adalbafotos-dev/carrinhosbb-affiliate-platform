import Link from "next/link";
import { Search } from "lucide-react";
import type { Silo } from "@/lib/types";

export function SiteHeader({ silos = [] }: { silos?: Silo[] }) {
  return (
    <header className="sticky top-0 z-20 border-b border-(--border) bg-[color:rgba(255,255,255,0.88)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide text-(--ink)">
          Estética da Verdade
        </Link>

        <nav className="flex items-center gap-4 text-sm text-(--muted-2)">
          <Link href="/" className="hover:text-(--brand-hot)">
            Início
          </Link>
          {silos.map((silo) => (
            <Link key={silo.id} href={`/${silo.slug}`} className="hover:text-(--brand-hot)">
              {silo.name}
            </Link>
          ))}
          <Link href="/sobre" className="hover:text-(--brand-hot)">
            Sobre
          </Link>
          <Link href="/politica-de-afiliados" className="hover:text-(--brand-hot)">
            Política
          </Link>
          <Link href="/admin" className="text-(--brand-accent) hover:text-(--brand-hot)">
            Admin
          </Link>
        </nav>

        <div className="hidden items-center gap-2 rounded-full border border-(--border) bg-(--surface-muted) px-3 py-2 md:flex">
          <Search size={16} className="text-(--brand-accent)" />
          <span className="text-xs text-(--muted-2)">Busca (em breve)</span>
        </div>
      </div>
    </header>
  );
}
