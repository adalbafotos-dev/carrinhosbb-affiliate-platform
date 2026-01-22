import Link from "next/link";
import { Search } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:rgba(255,255,255,0.88)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          Estética da Verdade — Unhas
        </Link>

        <nav className="flex items-center gap-4 text-sm text-[color:var(--muted-2)]">
          <Link href="/equipamentos" className="hover:text-[color:var(--brand-hot)]">Equipamentos</Link>
          <Link href="/geis" className="hover:text-[color:var(--brand-hot)]">Géis</Link>
          <Link href="/kits" className="hover:text-[color:var(--brand-hot)]">Kits</Link>
          <Link href="/decoracao" className="hover:text-[color:var(--brand-hot)]">Decoração</Link>
          <Link href="/admin" className="text-[color:var(--brand-accent)] hover:text-[color:var(--brand-hot)]">Admin</Link>
        </nav>

        <div className="hidden items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 md:flex">
          <Search size={16} className="text-[color:var(--brand-accent)]" />
          <span className="text-xs text-[color:var(--muted-2)]">Busca (em breve)</span>
        </div>
      </div>
    </header>
  );
}

