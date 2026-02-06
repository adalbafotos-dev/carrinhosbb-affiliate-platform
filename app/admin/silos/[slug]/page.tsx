import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetSiloBySlug, adminListPostsBySiloId } from "@/lib/db";
import { updateSiloAction } from "@/app/admin/silos/actions";
import { buildSiloMetrics } from "@/lib/seo/buildSiloMetrics";
import { buildInternalSimilarity } from "@/lib/seo/cannibalization";
import { SiloIntelligenceTabs } from "@/components/silos/SiloIntelligenceTabs";

export const revalidate = 0;

export default async function EditSiloPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdminSession();
  const { slug } = await params;
  const silo = await adminGetSiloBySlug(slug);
  if (!silo) return notFound();
  const serpQuery = [silo.name, silo.meta_title].filter(Boolean).join(" ").trim();
  const posts = await adminListPostsBySiloId(silo.id);
  const { getAdminSupabase } = await import("@/lib/supabase/admin"); // Importar supabase

  const metrics = buildSiloMetrics({ silo, posts, siteUrl: process.env.SITE_URL ?? "http://localhost:3000" });
  const cannibalization = buildInternalSimilarity(posts);

  // Buscar hierarquia (silo_posts)
  const supabase = getAdminSupabase();
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

  const occurrencesCount = occurrences?.length ?? 0;
  const occurrencesWithTarget = occurrences?.filter((o: any) => Boolean(o.target_post_id)).length ?? 0;
  const linkAuditsCount = linkAudits?.length ?? 0;
  console.log("[SILO-PANEL] load", {
    siloId: silo.id,
    posts: posts.length,
    occurrences: occurrencesCount,
    occurrencesWithTarget,
    linkAudits: linkAuditsCount,
    sampleOccurrenceIds: (occurrences || []).slice(0, 3).map((o: any) => o.id),
    sampleAuditOccurrenceIds: (linkAudits || []).slice(0, 3).map((a: any) => a.occurrence_id),
  });

  // Buscar Auditoria do Silo
  const { data: siloAuditList } = await supabase
    .from("silo_audits")
    .select("*")
    .eq("silo_id", silo.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const siloAudit = siloAuditList?.[0] || null;

  // Lógica de População do Grafo
  if (occurrences && occurrences.length > 0) {
    // Usar dados granulares (V2)
    // Limpar adjacency padrão (que pode vir do HTML draft) e usar apenas o DB
    metrics.adjacency = []; // Reset para garantir fidelidade ao DB

    occurrences.forEach(occ => {
      // Atualizar métricas (somar)
      const targetMetric = metrics.perPostMetrics.find(m => m.postId === occ.target_post_id);
      if (targetMetric) targetMetric.inboundWithinSilo++;

      const sourceMetric = metrics.perPostMetrics.find(m => m.postId === occ.source_post_id);
      if (sourceMetric) sourceMetric.outboundWithinSilo++;

      // Adicionar Edge individual
      metrics.adjacency.push({
        sourceId: occ.source_post_id,
        targetId: occ.target_post_id,
        count: 1 // Cada occurência conta como 1 edge visual
      });
    });
  } else {
    // Fallback para post_links (V1 - Agregado/Deduplicado)
    const { data: realLinks } = await supabase
      .from("post_links")
      .select("source_post_id, target_post_id, anchor_text")
      .in("source_post_id", postIds)
      .in("target_post_id", postIds);

    if (realLinks && realLinks.length > 0) {
      metrics.adjacency = []; // Reset
      realLinks.forEach(link => {
        const targetMetric = metrics.perPostMetrics.find(m => m.postId === link.target_post_id);
        if (targetMetric) targetMetric.inboundWithinSilo++;
        const sourceMetric = metrics.perPostMetrics.find(m => m.postId === link.source_post_id);
        if (sourceMetric) sourceMetric.outboundWithinSilo++;

        metrics.adjacency.push({
          sourceId: link.source_post_id,
          targetId: link.target_post_id,
          count: 1
        });
      });
    }
  }

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
        linkOccurrences={occurrences || []}
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
