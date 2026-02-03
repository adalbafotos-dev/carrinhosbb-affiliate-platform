import Link from "next/link";
import { adminListPosts } from "@/lib/db";
import { bulkDeletePosts, schedulePost, setPublishState } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import { getGoogleCseSettingsSummary } from "@/lib/google/settings";
import { GoogleIntegrationCard } from "@/components/admin/GoogleIntegrationCard";

export const revalidate = 0;

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  review: "Revisao",
  scheduled: "Agendado",
  published: "Publicado",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminSession();
  const { status, q } = await searchParams;
  const statusFilter = status && status !== "all" ? status : null;
  const [posts, googleSummary] = await Promise.all([
    adminListPosts({ status: statusFilter, query: q ?? null }),
    getGoogleCseSettingsSummary(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-8">
        <div>
          <p className="text-xs text-[color:var(--muted-2)]">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Conteudo</h1>
          <p className="mt-3 max-w-2xl text-sm text-[color:var(--muted)]">
            Gerencie o fluxo editorial com filtros, busca e publicacao rapida.
          </p>
        </div>

        <Link
          className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--brand-primary)] px-4 py-2 text-xs font-semibold hover:bg-[color:var(--brand-primary)]"
          href="/admin/editor/new"
        >
          Novo post
        </Link>
      </header>

      <GoogleIntegrationCard summary={googleSummary} />

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] px-4 py-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase text-[color:var(--muted-2)]">Status</label>
          <select
            name="status"
            defaultValue={status ?? "all"}
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-xs outline-none"
          >
            <option value="all">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="review">Revisao</option>
            <option value="scheduled">Agendado</option>
            <option value="published">Publicado</option>
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase text-[color:var(--muted-2)]">Busca</label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por titulo ou slug"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-xs outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-2 text-xs font-semibold hover:bg-[color:var(--brand-primary)]"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-[color:var(--border)]">
        <form id="deleteForm" action={bulkDeletePosts as any} className="flex items-center justify-between bg-[color:var(--paper)] px-4 py-3 text-xs text-[color:var(--muted-2)]">
          <span>Selecione posts para apagar (rascunhos ou outros)</span>
          <button
            type="submit"
            className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--text)] hover:bg-[color:var(--brand-primary)]"
          >
            Apagar selecionados
          </button>
        </form>
        <table className="w-full text-left text-sm">
          <thead className="bg-[color:var(--paper)] text-xs text-[color:var(--muted-2)]">
            <tr>
              <th className="px-4 py-3">Sel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Capa</th>
              <th className="px-4 py-3">Titulo</th>
              <th className="px-4 py-3">Silo</th>
              <th className="px-4 py-3">Atualizado</th>
              <th className="px-4 py-3">Agendado</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-[color:var(--muted)]" colSpan={6}>
                  Nenhum post encontrado. Ajuste os filtros ou crie um novo.
                </td>
              </tr>
            ) : (
              posts.map((p) => {
                const statusValue = p.status ?? (p.published ? "published" : "draft");
                const statusLabel = statusLabels[statusValue] ?? "Rascunho";
                const siloSlug = p.silo?.slug ?? "";
                const publicHref = siloSlug ? `/${siloSlug}/${p.slug}` : `/${p.slug}`;

                return (
                  <tr key={p.id} className="border-t border-[color:var(--border)] align-top">
                    <td className="px-4 py-4">
                      <input type="checkbox" name="ids" value={p.id} form="deleteForm" className="h-4 w-4" aria-label={`Selecionar ${p.title}`} />
                    </td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">{statusLabel}</td>
                    <td className="px-4 py-4">
                      {p.hero_image_url ? (
                        <img
                          src={p.hero_image_url}
                          alt={p.hero_image_alt || "Capa"}
                          className="h-14 w-20 rounded-md border border-[color:var(--border)] object-cover"
                        />
                      ) : (
                        <span className="text-[11px] text-[color:var(--muted-2)]">Sem capa</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium">{p.title}</td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">{p.silo?.name ?? "-"}</td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">{formatDate(p.updated_at)}</td>
                    <td className="px-4 py-4 text-[color:var(--muted)]">{formatDate(p.scheduled_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
                          href={`/admin/editor/${p.id}`}
                        >
                          Editar
                        </Link>
                        <Link
                          className="inline-flex rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
                          href={publicHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver pagina
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
                        <details className="group">
                          <summary className="cursor-pointer list-none rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]">
                            Agendar
                          </summary>
                          <form action={schedulePost} className="mt-2 flex items-center gap-2 text-xs">
                            <input type="hidden" name="id" value={p.id} />
                            <input
                              type="datetime-local"
                              name="scheduled_at"
                              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--paper)] px-2 py-1 text-xs outline-none"
                              defaultValue={p.scheduled_at ? p.scheduled_at.slice(0, 16) : ""}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--paper)] px-2 py-1 text-xs hover:bg-[color:var(--brand-primary)]"
                            >
                              Salvar
                            </button>
                          </form>
                        </details>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
