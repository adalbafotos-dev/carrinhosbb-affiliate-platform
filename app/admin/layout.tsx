import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
      <header className="flex h-12 items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface)] px-4">
        <div className="text-sm font-semibold tracking-tight">Cockpit CMS</div>
        <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase text-[color:var(--muted)]">
          <Link className="rounded-md bg-[color:var(--surface-muted)] px-3 py-1.5 hover:bg-[color:var(--accent-soft)]" href="/admin">
            Conteúdo
          </Link>
          <Link className="rounded-md bg-[color:var(--surface-muted)] px-3 py-1.5 hover:bg-[color:var(--accent-soft)]" href="/admin/silos">
            Silos
          </Link>
          <Link className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-500" href="/admin/editor/new">
            Novo post
          </Link>
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="h-full w-full overflow-auto">{children}</div>
      </div>
    </div>
  );
}
