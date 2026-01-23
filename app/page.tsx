import Link from "next/link";
import { getPublicSilos, listLatestPublicPosts } from "@/lib/db";
import { PostCard } from "@/components/site/PostCard";

export const revalidate = 3600;

export default async function HomePage() {
  const [silos, latest] = await Promise.all([getPublicSilos(), listLatestPublicPosts(8)]);

  return (
    <div className="space-y-12 page-in">
      <section className="rounded-3xl border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(241,188,153,0.35),#FFFFFF_55%,#E6E4E2)] p-8">
        <p className="text-xs text-[color:var(--muted-2)]">Plataforma neutra para testar estratégias de conteúdo.</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">
          Construa silos e páginas pilar otimizadas para SEO, com controle total sobre links e blocos de afiliado.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--muted)]">
          Cole textos, organize por pilares, publique com schema e links internos fortes. Sem amarras de nicho.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Últimos artigos</h2>
          <Link href="/admin" className="text-sm text-[color:var(--muted-2)] hover:text-[color:var(--brand-hot)]">
            Ir para o admin
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6 text-sm text-[color:var(--muted)]">
            Configure o Supabase e cadastre posts publicados para vê-los aqui.
          </div>
        ) : (
          <div className="stagger-grid grid gap-4 md:grid-cols-2">
            {latest.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Silos</h2>
        {silos.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6 text-sm text-[color:var(--muted)]">
            Nenhum silo encontrado. Cadastre no admin.
          </div>
        ) : (
          <div className="stagger-grid grid gap-4 md:grid-cols-2">
            {silos.map((s) => (
              <Link
                key={s.id}
                href={`/${s.slug}`}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6 hover:bg-[color:var(--surface-muted)]"
              >
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="mt-2 text-sm text-[color:var(--muted-2)]">{s.description ?? "Abrir silo"}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
