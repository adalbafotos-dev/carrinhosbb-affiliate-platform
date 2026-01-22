import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSiloBySlug, listAllSiloSlugs, getPublicPostsBySilo } from "@/lib/db";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await listAllSiloSlugs();
  return slugs.map((silo) => ({ silo }));
}

export async function generateMetadata({ params }: { params: Promise<{ silo: string }> }): Promise<Metadata> {
  const { silo } = await params;
  const data = await getPublicSiloBySlug(silo);

  if (!data) return { title: "Silo" };

  return {
    title: `${data.name} — Estética da Verdade`,
    description: data.description ?? `Artigos do silo ${data.name}`,
  };
}

export default async function SiloPage({ params }: { params: Promise<{ silo: string }> }) {
  const { silo } = await params;
  const siloData = await getPublicSiloBySlug(silo);
  const posts = await getPublicPostsBySilo(silo);

  if (!siloData) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6">
        <h1 className="text-lg font-semibold">Silo não encontrado</h1>
        <p className="mt-2 text-sm text-[color:var(--muted-2)]">Verifique o slug.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-in">
      <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        <p className="text-xs text-[color:var(--muted-2)]">Silo</p>
        <h1 className="mt-2 text-3xl font-semibold">{siloData.name}</h1>
        {siloData.description ? <p className="mt-3 max-w-2xl text-sm text-[color:var(--muted)]">{siloData.description}</p> : null}
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6 text-sm text-[color:var(--muted)]">
          Sem posts publicados neste silo.
        </div>
      ) : (
        <div className="stagger-grid grid gap-4 md:grid-cols-2">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/${siloData.slug}/${p.slug}`}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-5 hover:bg-[color:var(--surface-muted)]"
            >
              <h2 className="text-base font-semibold leading-snug">{p.title}</h2>
              <p className="mt-2 text-sm text-[color:var(--muted-2)]">{p.meta_description ?? "Abrir artigo"}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
