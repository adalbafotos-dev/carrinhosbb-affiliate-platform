import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetSiloBySlug, adminListPostsBySiloId } from "@/lib/db";
import { updateSiloAction } from "@/app/admin/silos/actions";
import { buildSiloMetrics } from "@/lib/seo/buildSiloMetrics";
import { buildInternalSimilarity } from "@/lib/seo/cannibalization";
import { SiloIntelligenceTabs } from "@/components/silos/SiloIntelligenceTabs";
import type { LinkAudit, LinkOccurrence, LinkOccurrenceEdge } from "@/lib/silo/types";

export const revalidate = 0;

export default async function EditSiloPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminSession();
  const { slug } = await params;
  const silo = await adminGetSiloBySlug(slug);
  if (!silo) return notFound();
  const serpQuery = [silo.name, silo.meta_title].filter(Boolean).join(" ").trim();
  const posts = await adminListPostsBySiloId(silo.id);
  const { getAdminSupabase } = await import("@/lib/supabase/admin"); // Importar supabase
  const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

  const metrics = buildSiloMetrics({ silo, posts, siteUrl });
  const cannibalization = buildInternalSimilarity(posts);

  // Buscar hierarquia (silo_posts)
  const supabase = getAdminSupabase();

  // Refresh leve das ocorrencias para garantir join correto
  if (posts.length) {
    try {
      const { count: occTotalCount } = await supabase
        .from("post_link_occurrences")
        .select("id", { count: "exact", head: true })
        .eq("silo_id", silo.id);

      const { data: latestPost } = await supabase
        .from("posts")
        .select("updated_at")
        .eq("silo_id", silo.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: latestOccurrence } = await supabase
        .from("post_link_occurrences")
        .select("updated_at")
        .eq("silo_id", silo.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const postUpdatedAt = latestPost?.updated_at ? new Date(latestPost.updated_at).getTime() : null;
      const occurrenceUpdatedAt = latestOccurrence?.updated_at ? new Date(latestOccurrence.updated_at).getTime() : null;

      const shouldRefresh =
        (occTotalCount ?? 0) === 0 ||
        (postUpdatedAt !== null && (occurrenceUpdatedAt === null || postUpdatedAt > occurrenceUpdatedAt));

      if (shouldRefresh) {
        const { syncLinkOccurrences } = await import("@/lib/silo/siloService");
        await Promise.allSettled(
          posts.map((post) =>
            syncLinkOccurrences(silo.id, post.id, post.content_html ?? "", {
              posts,
              siloSlug: silo.slug,
              siteUrl,
            })
          )
        );

        const { count: occTotalAfter } = await supabase
          .from("post_link_occurrences")
          .select("id", { count: "exact", head: true })
          .eq("silo_id", silo.id);

        console.log("[SILO-PANEL] refresh ocorrencias", {
          shouldRefresh,
          occTotalBefore: occTotalCount ?? 0,
          occTotalAfter: occTotalAfter ?? 0,
        });
      }
    } catch (error) {
      console.error("[SILO-PANEL] refresh ocorrencias falhou", error);
    }
  }
  const { data: siloPosts } = await supabase
    .from("silo_posts")
    .select("post_id, role, position")
    .eq("silo_id", silo.id);

  // Buscar links reais (post_links) para fallback
  const postIds = posts.map(p => p.id);

  // Buscar Ocorrências detalhadas (Silo V2)
  const { data: occurrences } = await supabase
    .from("post_link_occurrences")
    .select("*")
    .eq("silo_id", silo.id);

  // Buscar Auditoria de Links (Cores)
  const { data: linkAudits } = await supabase
    .from("link_audits")
    .select("*")
    .eq("silo_id", silo.id);

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

  let normalizedOccurrences: LinkOccurrence[] = [];
  let occurrencesSource = "occurrences";
  if (occurrences && occurrences.length > 0) {
    normalizedOccurrences = occurrences.map((occ, index) => normalizeOccurrence(occ, `occ-${index}`));
  }

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

  const occurrencesCount = normalizedOccurrences.length;
  const internalOccurrences = normalizedOccurrences.filter((o) => String(o.link_type ?? "INTERNAL") === "INTERNAL").length;
  const internalOccurrencesWithTarget = normalizedOccurrences.filter((o) => String(o.link_type ?? "INTERNAL") === "INTERNAL" && Boolean(o.target_post_id)).length;
  const occurrencesWithTarget = normalizedOccurrences.filter((o) => Boolean(o.target_post_id)).length;
  const auditsCount = Object.keys(auditsByOccurrenceId).length;
  console.log("[SILO-PANEL] load", {
    siloId: silo.id,
    posts: posts.length,
    occurrences: occurrencesCount,
    internalOccurrences,
    internalOccurrencesWithTarget,
    occurrencesWithTarget,
    edges: linkEdges.length,
    auditsByOccurrenceId: auditsCount,
    occurrencesSource,
    sampleOccurrences: normalizedOccurrences.slice(0, 3).map((o) => ({
      id: o.id,
      href: o.href_normalized,
      type: o.link_type,
      target: o.target_post_id,
    })),
    sampleEdgeOccurrenceIds: linkEdges.slice(0, 3).map((edge) => edge.occurrence_ids.slice(0, 3)),
    sampleAuditOccurrenceIds: Object.keys(auditsByOccurrenceId).slice(0, 3),
  });

  // Buscar Auditoria do Silo
  const { data: siloAuditList } = await supabase
    .from("silo_audits")
    .select("*")
    .eq("silo_id", silo.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const siloAudit = siloAuditList?.[0] || null;

  // Logica de populacao do grafo (fonte unica: occurrences normalizadas)
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
    const hierarchy = siloPosts?.find(sp => sp.post_id === post.id);
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      status: post.status ?? (post.published ? "published" : "draft"),
      focus_keyword: post.focus_keyword ?? null,
      targetKeyword: post.target_keyword ?? null,
      isPillar: post.pillar_rank === 1 || hierarchy?.role === "PILLAR", // Considerar ambos
      role: hierarchy?.role ?? null,
      position: hierarchy?.position ?? null,
    };
  });

  return (
    <div className="space-y-6">




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
        settingsContent={
          <form action={updateSiloAction} className="space-y-5 rounded-xl border border-(--border) bg-(--surface) p-6">
            <input type="hidden" name="id" value={silo.id} />
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

            <Field label="Descrição">
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

            <Field label="Conteúdo do pilar (HTML ou markdown simples)">
              <textarea
                name="pillar_content_html"
                defaultValue={silo.pillar_content_html ?? ""}
                rows={6}
                className="w-full rounded-md border border-(--border) px-3 py-2 text-sm outline-none"
                placeholder="Conteúdo opcional do pilar"
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
                  <label htmlFor="is_active">Listar na navegação pública</label>
                </div>
              </Field>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="rounded-md bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-(--paper) hover:bg-(--brand-accent)"
              >
                Salvar silo
              </button>
            </div>
          </form>
        }
      />
    </div >
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
