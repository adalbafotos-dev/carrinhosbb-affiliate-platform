import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetSiloBySlug, adminListPostsBySiloId, adminListSiloGroupsBySiloId } from "@/lib/db";
import {
  deleteSiloAction,
  saveSiloGroupsAction,
  updateSiloAction,
  updateSiloPostsMenuAction,
} from "@/app/admin/silos/actions";
import { buildSiloMetrics } from "@/lib/seo/buildSiloMetrics";
import { buildInternalSimilarity } from "@/lib/seo/cannibalization";
import { SiloIntelligenceTabs } from "@/components/silos/SiloIntelligenceTabs";
import type { LinkAudit, LinkOccurrence, LinkOccurrenceEdge } from "@/lib/silo/types";
import { normalizeSiloGroup } from "@/lib/silo/groups";

export const revalidate = 0;

export default async function EditSiloPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminSession();
  const { slug } = await params;
  const { error } = await searchParams;

  let silo: Awaited<ReturnType<typeof adminGetSiloBySlug>> = null;
  try {
    silo = await adminGetSiloBySlug(slug);
  } catch (loadError) {
    console.error("[SILO-PANEL] failed to load silo", loadError);
    silo = null;
  }
  if (!silo) return notFound();

  const serpQuery = [silo.name, silo.meta_title].filter(Boolean).join(" ").trim();

  let posts: Awaited<ReturnType<typeof adminListPostsBySiloId>> = [];
  try {
    posts = await adminListPostsBySiloId(silo.id);
  } catch (loadError) {
    console.error("[SILO-PANEL] failed to load silo posts", loadError);
    posts = [];
  }

  let siloGroups: Awaited<ReturnType<typeof adminListSiloGroupsBySiloId>> = [];
  try {
    siloGroups = await adminListSiloGroupsBySiloId(silo.id, { ensureDefaults: true });
  } catch (loadError) {
    const normalizedError =
      loadError && typeof loadError === "object"
        ? {
            message: (loadError as any).message ?? null,
            code: (loadError as any).code ?? null,
            details: (loadError as any).details ?? null,
            hint: (loadError as any).hint ?? null,
          }
        : { message: String(loadError) };
    console.error("[SILO-PANEL] failed to load silo groups", normalizedError);
    siloGroups = [];
  }

  const { getAdminSupabase } = await import("@/lib/supabase/admin");
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  let metrics: ReturnType<typeof buildSiloMetrics>;
  let cannibalization: ReturnType<typeof buildInternalSimilarity>;
  try {
    metrics = buildSiloMetrics({ silo, posts, siteUrl });
    cannibalization = buildInternalSimilarity(posts);
  } catch (metricsError) {
    console.error("[SILO-PANEL] failed to build metrics/cannibalization", metricsError);
    metrics = buildSiloMetrics({ silo, posts: [], siteUrl });
    cannibalization = [];
  }

  const supabase = getAdminSupabase();
  const postIds = posts.map((post) => post.id);

  const { data: siloPosts } = await supabase
    .from("silo_posts")
    .select("post_id, role, position")
    .eq("silo_id", silo.id);

  let occurrences: any[] = [];
  if (postIds.length > 0) {
    const { data, error: occurrenceError } = await supabase
      .from("post_link_occurrences")
      .select("*")
      .eq("silo_id", silo.id)
      .in("source_post_id", postIds);

    if (occurrenceError) {
      console.error("[SILO-PANEL] failed to load occurrences", occurrenceError);
    } else {
      occurrences = data ?? [];
    }
  }

  const { data: linkAudits } = await supabase.from("link_audits").select("*").eq("silo_id", silo.id);

  const normalizeLinkType = (raw: any): LinkOccurrence["link_type"] => {
    if (!raw) return null;
    const upper = String(raw).toUpperCase();
    if (upper === "INTERNAL" || upper === "EXTERNAL" || upper === "AFFILIATE") return upper as LinkOccurrence["link_type"];
    if (upper === "AMAZON") return "AFFILIATE";
    return null;
  };

  const normalizeOccurrence = (occ: any, fallbackId: string): LinkOccurrence => {
    const occurrenceId = String(occ.id ?? occ.occurrence_id ?? fallbackId);
    return {
      id: occurrenceId,
      silo_id: occ.silo_id ?? silo.id,
      source_post_id: String(occ.source_post_id ?? ""),
      target_post_id: occ.target_post_id ? String(occ.target_post_id) : null,
      anchor_text: occ.anchor_text ?? "[Sem texto]",
      context_snippet: occ.context_snippet ?? null,
      start_index: occ.start_index ?? null,
      end_index: occ.end_index ?? null,
      occurrence_key: occ.occurrence_key ?? null,
      href_normalized: occ.href_normalized ?? occ.target_url ?? "",
      position_bucket: occ.position_bucket ?? null,
      link_type: normalizeLinkType(occ.link_type),
      is_nofollow: occ.is_nofollow ?? (Array.isArray(occ.rel_flags) ? occ.rel_flags.includes("nofollow") : false),
      is_sponsored: occ.is_sponsored ?? (Array.isArray(occ.rel_flags) ? occ.rel_flags.includes("sponsored") : false),
      is_ugc: occ.is_ugc ?? (Array.isArray(occ.rel_flags) ? occ.rel_flags.includes("ugc") : false),
      is_blank: occ.is_blank ?? false,
    };
  };

  const normalizedOccurrences: LinkOccurrence[] = occurrences.map((occ, index) => normalizeOccurrence(occ, `occ-${index}`));

  const auditsByOccurrenceId = (linkAudits || []).reduce<Record<string, LinkAudit>>((acc, audit: any) => {
    const key = String(audit.occurrence_id ?? audit.occurrenceId ?? audit.id ?? "");
    if (!key) return acc;
    acc[key] = {
      ...audit,
      occurrence_id: String(audit.occurrence_id ?? audit.occurrenceId ?? key),
    };
    return acc;
  }, {});

  const linkEdgesMap = new Map<string, LinkOccurrenceEdge>();
  normalizedOccurrences.forEach((occ) => {
    if (!occ.target_post_id) return;
    if (String(occ.link_type ?? "INTERNAL") !== "INTERNAL") return;
    const key = `${occ.source_post_id}::${occ.target_post_id}`;
    const existing = linkEdgesMap.get(key);
    if (!existing) {
      linkEdgesMap.set(key, {
        id: `edge-${occ.source_post_id}-${occ.target_post_id}`,
        source_post_id: occ.source_post_id,
        target_post_id: occ.target_post_id,
        occurrence_ids: [String(occ.id ?? "")],
      });
      return;
    }
    existing.occurrence_ids.push(String(occ.id ?? ""));
  });
  const linkEdges = Array.from(linkEdgesMap.values());

  const { data: siloAuditList } = await supabase
    .from("silo_audits")
    .select("*")
    .eq("silo_id", silo.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const siloAudit = siloAuditList?.[0] || null;

  metrics.adjacency = [];
  metrics.perPostMetrics.forEach((metric) => {
    metric.inboundWithinSilo = 0;
    metric.outboundWithinSilo = 0;
  });

  normalizedOccurrences.forEach((occ) => {
    if (!occ.target_post_id) return;
    if (String(occ.link_type ?? "INTERNAL") !== "INTERNAL") return;

    const targetMetric = metrics.perPostMetrics.find((m) => m.postId === occ.target_post_id);
    if (targetMetric) targetMetric.inboundWithinSilo += 1;

    const sourceMetric = metrics.perPostMetrics.find((m) => m.postId === occ.source_post_id);
    if (sourceMetric) sourceMetric.outboundWithinSilo += 1;

    metrics.adjacency.push({
      sourceId: occ.source_post_id,
      targetId: occ.target_post_id,
      count: 1,
    });
  });

  const postsSummary = posts.map((post) => {
    const hierarchy = siloPosts?.find((sp: any) => sp.post_id === post.id);
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status ?? (post.published ? "published" : "draft"),
      focus_keyword: post.focus_keyword ?? null,
      targetKeyword: post.target_keyword ?? null,
      isPillar: post.pillar_rank === 1 || hierarchy?.role === "PILLAR",
      role: hierarchy?.role ?? null,
      position: hierarchy?.position ?? null,
    };
  });

  const hierarchyByPostId = new Map((siloPosts ?? []).map((item: any) => [item.post_id, item]));
  const groupsByKey = new Map(siloGroups.map((group) => [group.key, group]));
  const menuPosts = posts.map((post) => {
    const hierarchy = hierarchyByPostId.get(post.id) as any;
    const role = String(hierarchy?.role ?? "SUPPORT").toUpperCase();
    const normalizedGroup = normalizeSiloGroup(post.silo_group);
    const resolvedGroup = normalizedGroup && groupsByKey.has(normalizedGroup) ? normalizedGroup : null;
    const normalizedOrder =
      typeof post.silo_order === "number" && Number.isFinite(post.silo_order)
        ? Math.max(0, Math.trunc(post.silo_order))
        : typeof post.silo_group_order === "number" && Number.isFinite(post.silo_group_order)
          ? Math.max(0, Math.trunc(post.silo_group_order))
        : 0;
    const visibleByDefault = hierarchy?.role === "AUX" ? false : true;
    const showInMenu = typeof post.show_in_silo_menu === "boolean" ? post.show_in_silo_menu : visibleByDefault;

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      role,
      silo_group: role === "AUX" || role === "PILLAR" ? null : resolvedGroup,
      silo_group_order: role === "AUX" || role === "PILLAR" ? 0 : normalizedOrder,
      show_in_silo_menu: role === "AUX" ? false : showInMenu,
    };
  });

  const groupedMenuPosts = siloGroups
    .map((group) => ({
      ...group,
      items: menuPosts
        .filter((post) => post.silo_group === group.key)
        .sort((a, b) => {
          if (a.silo_group_order !== b.silo_group_order) return a.silo_group_order - b.silo_group_order;
          return (a.title || "").localeCompare(b.title || "", "pt-BR");
        }),
    }))
    .filter((group) => group.items.length > 0);

  const ungroupedMenuPosts = menuPosts
    .filter((post) => !post.silo_group)
    .sort((a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR"));

  const errorMessage =
    error === "has_posts"
      ? "Nao foi possivel excluir: ainda existem posts vinculados a este silo."
      : error === "has_batches"
        ? "Nao foi possivel excluir: ainda existem batches vinculados a este silo."
        : error === "confirm_required"
          ? "Marque a confirmacao para excluir o silo."
          : error === "delete_failed"
            ? "Falha ao excluir silo. Tente novamente."
            : error === "silo_groups_table_missing"
              ? "Tabela de grupos editoriais nao encontrada. Aplique a migration 20260219_04_silo_groups_config.sql."
              : error === "group_label_required"
                ? "Informe um nome para criar o novo grupo."
                : error === "group_key_invalid"
                  ? "Nao foi possivel gerar uma chave valida para este grupo."
                  : error === "group_create_failed"
                    ? "Falha ao criar grupo. Tente novamente."
                    : error === "group_save_failed"
                      ? "Falha ao salvar grupos do silo."
            : null;

  const settingsContent = (
    <div className="space-y-5">
      <form action={updateSiloAction} className="space-y-5 rounded-xl border border-(--border) bg-(--surface) p-6">
        <input type="hidden" name="id" value={silo.id} />
        <input type="hidden" name="return_to" value={`/admin/silos/${silo.slug}`} />

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome">
            <input
              name="name"
              defaultValue={silo.name}
              required
              className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="Slug">
            <input
              name="slug"
              defaultValue={silo.slug}
              readOnly
              className="w-full rounded-md border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm text-(--muted-2) outline-none"
            />
          </Field>
        </div>

        <Field label="Descricao">
          <textarea
            name="description"
            defaultValue={silo.description ?? ""}
            rows={2}
            className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Meta title">
            <input
              name="meta_title"
              defaultValue={silo.meta_title ?? ""}
              className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="Meta description">
            <input
              name="meta_description"
              defaultValue={silo.meta_description ?? ""}
              className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Hero image URL">
            <input
              name="hero_image_url"
              defaultValue={silo.hero_image_url ?? ""}
              className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="Hero alt">
            <input
              name="hero_image_alt"
              defaultValue={silo.hero_image_alt ?? ""}
              className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
            />
          </Field>
        </div>

        <Field label="Conteudo do pilar (HTML ou markdown simples)">
          <textarea
            name="pillar_content_html"
            defaultValue={silo.pillar_content_html ?? ""}
            rows={6}
            className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
            placeholder="Conteudo opcional do pilar"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Menu order">
            <input
              name="menu_order"
              type="number"
              defaultValue={silo.menu_order ?? 0}
              className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
            />
          </Field>
          <Field label="Ativo">
            <div className="flex items-center gap-2 text-sm text-(--muted)">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                defaultChecked={silo.is_active ?? true}
                className="h-4 w-4 rounded border-(--border-strong)"
              />
              <label htmlFor="is_active">Hub publico ativo</label>
            </div>
          </Field>
          <Field label="Menu publico">
            <div className="flex items-center gap-2 text-sm text-(--muted)">
              <input
                id="show_in_navigation"
                name="show_in_navigation"
                type="checkbox"
                defaultChecked={silo.show_in_navigation ?? true}
                className="h-4 w-4 rounded border-(--border-strong)"
              />
              <label htmlFor="show_in_navigation">Exibir no menu principal</label>
            </div>
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--border) pt-3">
          <label className="inline-flex items-center gap-2 text-xs text-(--muted)">
            <input
              name="confirm_delete"
              type="checkbox"
              value="1"
              className="h-4 w-4 rounded border-(--border-strong)"
            />
            Confirmo exclusao permanente deste silo
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              formAction={deleteSiloAction}
              className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Excluir silo
            </button>
            <button
              type="submit"
              className="rounded-md bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-(--paper) hover:bg-(--brand-accent)"
            >
              Salvar silo
            </button>
          </div>
        </div>
      </form>

      <form action={saveSiloGroupsAction} className="space-y-4 rounded-xl border border-(--border) bg-(--surface) p-6">
        <input type="hidden" name="silo_id" value={silo.id} />
        <input type="hidden" name="return_to" value={`/admin/silos/${silo.slug}`} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-(--ink)">Grupos editoriais do silo</h3>
            <p className="text-xs text-(--muted-2)">Edite nomes e ordem. Grupos sem post nao aparecem no hub publico.</p>
          </div>
          <button
            type="submit"
            name="mode"
            value="save"
            className="rounded-md border border-(--border-strong) px-3 py-2 text-xs font-semibold text-(--ink) hover:border-(--brand-hot) hover:text-(--brand-hot)"
          >
            Salvar grupos
          </button>
        </div>

        {siloGroups.length === 0 ? (
          <p className="rounded-md border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs text-(--muted-2)">
            Nenhum grupo configurado para este silo.
          </p>
        ) : (
          <div className="space-y-2">
            {siloGroups.map((group) => (
              <div key={group.id} className="grid gap-2 rounded-md border border-(--border) bg-(--surface-muted) p-3 md:grid-cols-[minmax(0,1fr)_110px_90px]">
                <input type="hidden" name="group_id" value={group.id} />
                <input
                  name={`group_label_${group.id}`}
                  defaultValue={group.label}
                  className="rounded-md border border-(--border) bg-white px-3 py-2 text-sm outline-none"
                />
                <input
                  type="number"
                  min={0}
                  max={999}
                  name={`group_order_${group.id}`}
                  defaultValue={group.menu_order}
                  className="rounded-md border border-(--border) bg-white px-2 py-2 text-xs outline-none"
                />
                <span className="text-right text-[11px] text-(--muted-2)">
                  {menuPosts.filter((post) => post.silo_group === group.key).length} posts
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-2 rounded-md border border-dashed border-(--border-strong) p-3 md:grid-cols-[minmax(0,1fr)_140px]">
          <input
            name="new_group_label"
            placeholder="Novo grupo (ex.: Comparativos)"
            className="rounded-md border border-(--border) bg-white px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            name="mode"
            value="create"
            className="rounded-md bg-(--brand-hot) px-3 py-2 text-xs font-semibold text-(--paper) hover:bg-(--brand-accent)"
          >
            Criar grupo
          </button>
        </div>
      </form>

      <form action={updateSiloPostsMenuAction} className="space-y-5 rounded-xl border border-(--border) bg-(--surface) p-6">
        <input type="hidden" name="silo_id" value={silo.id} />
        <input type="hidden" name="return_to" value={`/admin/silos/${silo.slug}`} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-(--ink)">Estrutura editorial do hub</h3>
            <p className="text-xs text-(--muted-2)">
              Configure apenas grupo, ordem do grupo e visibilidade. Hierarquia (papel/posicao) e ajustada somente no editor do post.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              name="mode"
              value="auto"
              className="rounded-md border border-(--border-strong) px-3 py-2 text-xs font-semibold text-(--ink) hover:border-(--brand-hot) hover:text-(--brand-hot)"
            >
              Auto-organizar
            </button>
            <button
              type="submit"
              name="mode"
              value="save"
              className="rounded-md bg-(--brand-hot) px-3 py-2 text-xs font-semibold text-(--paper) hover:bg-(--brand-accent)"
            >
              Salvar estrutura
            </button>
          </div>
        </div>

        {groupedMenuPosts.length === 0 && ungroupedMenuPosts.length === 0 ? (
          <p className="rounded-md border border-(--border) bg-(--surface-muted) px-3 py-2 text-xs text-(--muted-2)">
            Nenhum post vinculado a este silo ainda.
          </p>
        ) : null}

        {groupedMenuPosts.map((group) => (
          <section key={group.key} className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-(--muted-2)">{group.label}</h4>
              <span className="text-[11px] text-(--muted-2)">{group.items.length} posts</span>
            </div>

            <div className="space-y-2">
              {group.items.map((post) => {
                const isLockedRole = post.role === "PILLAR" || post.role === "AUX";
                return (
                <div
                  key={post.id}
                  className="grid gap-2 rounded-md border border-(--border) bg-white p-3 md:grid-cols-[minmax(0,1fr)_170px_90px_130px]"
                >
                  <input type="hidden" name="post_id" value={post.id} />
                  <div>
                    <p className="text-sm font-medium text-(--ink)">{post.title}</p>
                    <p className="text-[11px] text-(--muted-2)">/{post.slug} - {post.role}</p>
                    {isLockedRole ? (
                      <p className="text-[10px] text-(--muted-2)">Campos travados neste painel para {post.role}.</p>
                    ) : null}
                  </div>
                  <select
                    name={`silo_group_${post.id}`}
                    defaultValue={post.silo_group ?? ""}
                    disabled={isLockedRole}
                    className="rounded-md border border-(--border) px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="">Sem grupo</option>
                    {siloGroups.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    name={`silo_group_order_${post.id}`}
                    defaultValue={post.silo_group_order}
                    disabled={isLockedRole}
                    className="rounded-md border border-(--border) px-2 py-1.5 text-xs outline-none"
                  />
                  <label className="flex items-center gap-2 text-xs text-(--muted)">
                    <input
                      type="checkbox"
                      name={`show_in_silo_menu_${post.id}`}
                      value="1"
                      defaultChecked={post.role === "PILLAR" ? true : post.role === "AUX" ? false : post.show_in_silo_menu}
                      disabled={isLockedRole}
                      className="h-4 w-4 rounded border-(--border-strong)"
                    />
                    No menu do silo
                  </label>
                </div>
                );
              })}
            </div>
          </section>
        ))}

        {ungroupedMenuPosts.length > 0 ? (
          <section className="space-y-3 rounded-lg border border-dashed border-(--border-strong) p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase text-(--muted-2)">Sem grupo</h4>
              <span className="text-[11px] text-(--muted-2)">{ungroupedMenuPosts.length} posts</span>
            </div>

            <div className="space-y-2">
              {ungroupedMenuPosts.map((post) => {
                const isLockedRole = post.role === "PILLAR" || post.role === "AUX";
                return (
                <div
                  key={post.id}
                  className="grid gap-2 rounded-md border border-(--border) bg-white p-3 md:grid-cols-[minmax(0,1fr)_170px_90px_130px]"
                >
                  <input type="hidden" name="post_id" value={post.id} />
                  <div>
                    <p className="text-sm font-medium text-(--ink)">{post.title}</p>
                    <p className="text-[11px] text-(--muted-2)">/{post.slug} - {post.role}</p>
                    {isLockedRole ? (
                      <p className="text-[10px] text-(--muted-2)">Campos travados neste painel para {post.role}.</p>
                    ) : null}
                  </div>
                  <select
                    name={`silo_group_${post.id}`}
                    defaultValue=""
                    disabled={isLockedRole}
                    className="rounded-md border border-(--border) px-2 py-1.5 text-xs outline-none"
                  >
                    <option value="">Sem grupo</option>
                    {siloGroups.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    name={`silo_group_order_${post.id}`}
                    defaultValue={post.silo_group_order}
                    disabled={isLockedRole}
                    className="rounded-md border border-(--border) px-2 py-1.5 text-xs outline-none"
                  />
                  <label className="flex items-center gap-2 text-xs text-(--muted)">
                    <input
                      type="checkbox"
                      name={`show_in_silo_menu_${post.id}`}
                      value="1"
                      defaultChecked={post.role === "PILLAR" ? true : post.role === "AUX" ? false : post.show_in_silo_menu}
                      disabled={isLockedRole}
                      className="h-4 w-4 rounded border-(--border-strong)"
                    />
                    No menu do silo
                  </label>
                </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      ) : null}

      <SiloIntelligenceTabs
        silo={{ id: silo.id, name: silo.name, slug: silo.slug }}
        posts={postsSummary}
        metrics={metrics}
        linkOccurrences={normalizedOccurrences}
        linkEdges={linkEdges}
        auditsByOccurrenceId={auditsByOccurrenceId}
        linkAudits={linkAudits || []}
        siloAudit={siloAudit}
        cannibalization={cannibalization}
        serpDefaultQuery={serpQuery || silo.name}
        settingsContent={settingsContent}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[11px] font-semibold uppercase text-(--muted-2)">{label}</span>
      {children}
    </label>
  );
}
