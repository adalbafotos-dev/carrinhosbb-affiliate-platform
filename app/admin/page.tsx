import Link from "next/link";
import { adminListPosts } from "@/lib/db";
import { bulkDeletePosts, schedulePost, setPublishState } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/admin/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";


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

type HierarchyRole = "PILLAR" | "SUPPORT" | "AUX";
type HierarchyDisplay = { role: HierarchyRole; position: number | null; label: string };

function normalizeHierarchyRole(value: unknown): HierarchyRole | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase();
  if (upper === "PILLAR" || upper === "SUPPORT" || upper === "AUX") {
    return upper;
  }
  return null;
}

function normalizeHierarchyPosition(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
}

function buildHierarchyDisplayMap(
  posts: Array<{
    id: string;
    silo_id: string | null;
    title: string;
    pillar_rank?: number | null;
    silo_role?: HierarchyRole | null;
    silo_order?: number | null;
    silo_group_order?: number | null;
  }>,
  hierarchyRows: Array<{ post_id: string; silo_id: string; role: HierarchyRole | null; position: number | null }>
) {
  const displayMap = new Map<string, HierarchyDisplay>();
  const hierarchyByPost = new Map<string, { role: HierarchyRole | null; position: number | null }>();
  hierarchyRows.forEach((row) => {
    hierarchyByPost.set(row.post_id, { role: row.role, position: row.position });
  });

  posts.forEach((post) => {
    const hierarchy = hierarchyByPost.get(post.id);
    if (!post.silo_id && !hierarchy) {
      return;
    }
    const role =
      normalizeHierarchyRole(hierarchy?.role) ??
      normalizeHierarchyRole(post.silo_role) ??
      (post.pillar_rank === 1 ? "PILLAR" : "SUPPORT");
    const position = role === "PILLAR" ? 1 : normalizeHierarchyPosition(hierarchy?.position);
    const label =
      role === "PILLAR"
        ? "Pilar"
        : role === "AUX"
          ? typeof position === "number"
            ? `Aux ${position}`
            : "Aux"
          : typeof position === "number"
            ? `Suporte ${position}`
            : "Suporte";
    displayMap.set(post.id, { role, position, label });
  });

  return displayMap;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdminSession();
  const { status, q } = await searchParams;
  const statusFilter = status && status !== "all" ? status : null;
  /* const [posts, googleSummary] = await Promise.all([
    adminListPosts({ status: statusFilter, query: q ?? null }),
    getGoogleCseSettingsSummary(),
  ]); */
  // Simplified to just fetching posts since we removed the Google card
  const posts = await adminListPosts({ status: statusFilter, query: q ?? null });
  const supabase = getAdminSupabase();
  const postIds = posts.map((post) => post.id);
  let hierarchyRows: Array<{ post_id: string; silo_id: string; role: HierarchyRole | null; position: number | null }> = [];
  if (postIds.length > 0) {
    const { data, error } = await supabase
      .from("silo_posts")
      .select("post_id, silo_id, role, position")
      .in("post_id", postIds);
    if (!error) {
      hierarchyRows = (data ?? []) as typeof hierarchyRows;
    } else if (error.code !== "42P01") {
      console.error("Erro ao carregar hierarquia da lista de conteudos", {
        code: error.code,
        message: error.message,
      });
    }
  }
  const hierarchyMap = buildHierarchyDisplayMap(posts, hierarchyRows);

  return (
    <div className="space-y-6">




      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-(--border) bg-(--paper) px-4 py-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase text-(--muted-2)">Status</label>
          <select
            name="status"
            defaultValue={status ?? "all"}
            className="rounded-lg border border-(--border) bg-(--paper) px-3 py-2 text-xs outline-none"
          >
            <option value="all">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="review">Revisao</option>
            <option value="scheduled">Agendado</option>
            <option value="published">Publicado</option>
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase text-(--muted-2)">Busca</label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por titulo ou slug"
            className="w-full rounded-lg border border-(--border) bg-(--paper) px-3 py-2 text-xs outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-lg border border-(--border) bg-(--surface-muted) px-4 py-2 text-xs font-semibold hover:bg-(--brand-primary)"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-(--border)">
        <form id="deleteForm" action={bulkDeletePosts as any} className="flex items-center justify-between bg-(--paper) px-4 py-3 text-xs text-(--muted-2)">
          <span>Selecione posts para apagar (rascunhos ou outros)</span>
          <button
            type="submit"
            className="rounded-lg border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-[11px] font-semibold text-(--text) hover:bg-(--brand-primary)"
          >
            Apagar selecionados
          </button>
        </form>
        <table className="w-full text-left text-sm">
          <thead className="bg-(--paper) text-xs text-(--muted-2)">
            <tr>
              <th className="px-4 py-3">Sel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Capa</th>
              <th className="px-4 py-3">Titulo</th>
              <th className="px-4 py-3">Silo</th>
              <th className="px-4 py-3">Papel / numero</th>
              <th className="px-4 py-3">Atualizado</th>
              <th className="px-4 py-3">Agendado</th>
              <th className="px-4 py-3">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-(--muted)" colSpan={9}>
                  Nenhum post encontrado. Ajuste os filtros ou crie um novo.
                </td>
              </tr>
            ) : (
              posts.map((p) => {
                const statusValue = p.status ?? (p.published ? "published" : "draft");
                const statusLabel = statusLabels[statusValue] ?? "Rascunho";
                const siloSlug = p.silo?.slug ?? "";
                const previewHref = `/admin/preview/${p.id}`;
                const publicHref = siloSlug ? `/${siloSlug}/${p.slug}` : `/${p.slug}`;
                const hierarchy = hierarchyMap.get(p.id);

                return (
                  <tr key={p.id} className="border-t border-(--border) align-top">
                    <td className="px-4 py-4">
                      <input type="checkbox" name="ids" value={p.id} form="deleteForm" className="h-4 w-4" aria-label={`Selecionar ${p.title}`} />
                    </td>
                    <td className="px-4 py-4 text-(--muted)">{statusLabel}</td>
                    <td className="px-4 py-4">
                      {p.hero_image_url ? (
                        <img
                          src={p.hero_image_url}
                          alt={p.hero_image_alt || "Capa"}
                          className="h-14 w-20 rounded-md border border-(--border) object-cover"
                        />
                      ) : (
                        <span className="text-[11px] text-(--muted-2)">Sem capa</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium">{p.title}</td>
                    <td className="px-4 py-4 text-(--muted)">{p.silo?.name ?? "-"}</td>
                    <td className="px-4 py-4 text-(--muted)">
                      {hierarchy ? (
                        <div className="leading-tight">
                          <div className="text-(--text)">{hierarchy.label}</div>
                          <div className="text-[11px] uppercase text-(--muted-2)">
                            {typeof hierarchy.position === "number" ? `#${hierarchy.position}` : "Sem posicao"}
                          </div>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-4 text-(--muted)">{formatDate(p.updated_at)}</td>
                    <td className="px-4 py-4 text-(--muted)">{formatDate(p.scheduled_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="inline-flex rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs hover:bg-(--brand-primary)"
                          href={`/admin/editor/${p.id}`}
                        >
                          Editar
                        </Link>
                        <Link
                          className="inline-flex rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs hover:bg-(--brand-primary)"
                          href={previewHref}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver pagina
                        </Link>
                        {p.published ? (
                          <Link
                            className="inline-flex rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs hover:bg-(--brand-primary)"
                            href={publicHref}
                            target="_blank"
                            rel="noreferrer"
                          >
                            URL publica
                          </Link>
                        ) : null}
                        <form action={setPublishState}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="published" value={p.published ? "false" : "true"} />
                          <button
                            type="submit"
                            className="inline-flex rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs hover:bg-(--brand-primary)"
                          >
                            {p.published ? "Despublicar" : "Publicar"}
                          </button>
                        </form>
                        <details className="group">
                          <summary className="cursor-pointer list-none rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs hover:bg-(--brand-primary)">
                            Agendar
                          </summary>
                          <form action={schedulePost} className="mt-2 flex items-center gap-2 text-xs">
                            <input type="hidden" name="id" value={p.id} />
                            <input
                              type="datetime-local"
                              name="scheduled_at"
                              className="rounded-lg border border-(--border) bg-(--paper) px-2 py-1 text-xs outline-none"
                              defaultValue={p.scheduled_at ? p.scheduled_at.slice(0, 16) : ""}
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-(--border) bg-(--paper) px-2 py-1 text-xs hover:bg-(--brand-primary)"
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
