import Link from "next/link";
import { adminListPosts } from "@/lib/db";
import { setPublishState } from "@/app/admin/actions";

export const revalidate = 0;

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export default async function AdminPage() {
  const posts = await adminListPosts();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        <div>
          <p className="text-xs text-[color:var(--muted-2)]">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Conteudo</h1>
          <p className="mt-3 max-w-2xl text-sm text-[color:var(--muted)]">
            Crie, edite e publique posts sem abrir escrita para anon.
          </p>
        </div>

        <Link
          className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--brand-primary)] px-4 py-2 text-xs font-semibold hover:bg-[color:var(--brand-primary)]"
          href="/admin/editor/new"
        >
          Novo post
        </Link>
      </header>

      <div className="overflow-hidden rounded-3xl border border-[color:var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[color:var(--paper)] text-xs text-[color:var(--muted-2)]">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Titulo</th>
              <th className="px-4 py-3">Silo</th>
              <th className="px-4 py-3">Atualizado</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[color:var(--muted)]" colSpan={5}>
                  Nenhum post encontrado. Crie um rascunho para iniciar.
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-4 text-[color:var(--muted)]">{p.published ? "Publicado" : "Rascunho"}</td>
                  <td className="px-4 py-4 font-medium">{p.title}</td>
                  <td className="px-4 py-4 text-[color:var(--muted)]">{p.silo?.name ?? "-"}</td>
                  <td className="px-4 py-4 text-[color:var(--muted)]">{formatDate(p.updated_at)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
                        href={`/admin/editor/${p.id}`}
                      >
                        Editar
                      </Link>
                      <form action={setPublishState}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="published" value={p.published ? "false" : "true"} />
                        <button
                          type="submit"
                          className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
                        >
                          {p.published ? "Despublicar" : "Publicar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

