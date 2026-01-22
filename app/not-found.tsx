import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Verifique o endereço ou volte para a home.
      </p>
      <Link href="/" className="mt-6 inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm hover:bg-[color:var(--brand-primary)]">
        Ir para a home
      </Link>
    </div>
  );
}

