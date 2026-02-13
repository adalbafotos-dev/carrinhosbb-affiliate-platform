"use client";

import Link from "next/link";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";
import type { SiloPostSummary } from "@/components/silos/SiloIntelligenceTabs";

type SiloPostsTableProps = {
  siloSlug: string;
  posts: SiloPostSummary[];
  metrics: SiloMetrics;
  onViewSerp?: (postId: string) => void;
};

function statusLabel(status?: string | null) {
  if (!status) return "draft";
  return status;
}

export function SiloPostsTable({ posts, metrics, onViewSerp }: SiloPostsTableProps) {
  const metricsByPost = new Map(metrics.perPostMetrics.map((metric) => [metric.postId, metric]));
  const sortedPosts = [...posts].sort((a, b) => {
    const aPosition = typeof a.position === "number" ? a.position : Number.MAX_SAFE_INTEGER;
    const bPosition = typeof b.position === "number" ? b.position : Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-(--border) bg-(--paper)">
      <table className="w-full text-left text-sm">
        <thead className="bg-(--surface-muted) text-[11px] uppercase text-(--muted-2)">
          <tr>
            <th className="px-4 py-3">Post</th>
            <th className="px-4 py-3">Hierarquia</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Focus keyword</th>
            <th className="px-4 py-3">Links internos (silo)</th>
            <th className="px-4 py-3">Links externos</th>
            <th className="px-4 py-3">Amazon</th>
            <th className="px-4 py-3">Nofollow / Sponsored</th>
            <th className="px-4 py-3">Inbound silo</th>
            <th className="px-4 py-3">Outbound silo</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {sortedPosts.map((post) => {
            const metric = metricsByPost.get(post.id);
            const role = post.role ?? (post.isPillar ? "PILLAR" : null);
            return (
              <tr key={post.id} className="border-t border-(--border)">
                <td className="px-4 py-3 font-medium text-(--text)">{post.title}</td>
                <td className="px-4 py-3 text-(--muted)">
                  <div className="leading-tight">
                    <div>{typeof post.position === "number" ? `#${post.position}` : "Sem posicao"}</div>
                    <div className="text-[10px] uppercase text-(--muted-2)">{role ?? "Sem papel"}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-(--muted)">{statusLabel(post.status)}</td>
                <td className="px-4 py-3 text-(--muted)">
                  {post.focus_keyword || post.targetKeyword?.trim() || post.title}
                </td>
                <td className="px-4 py-3 text-(--muted)">{metric?.internalSiloLinks ?? 0}</td>
                <td className="px-4 py-3 text-(--muted)">{metric?.externalLinks ?? 0}</td>
                <td className="px-4 py-3 text-(--muted)">{metric?.amazonLinks ?? 0}</td>
                <td className="px-4 py-3 text-(--muted)">
                  {(metric?.nofollow ?? 0)}/{metric?.sponsored ?? 0}
                </td>
                <td className="px-4 py-3 text-(--muted)">{metric?.inboundWithinSilo ?? 0}</td>
                <td className="px-4 py-3 text-(--muted)">{metric?.outboundWithinSilo ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/editor/${post.id}`}
                      target="_blank"
                      className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[11px] text-(--text) hover:border-(--brand-hot)"
                    >
                      Abrir no editor
                    </Link>
                    {onViewSerp ? (
                      <button
                        type="button"
                        onClick={() => onViewSerp(post.id)}
                        className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[11px] text-(--text) hover:border-(--brand-accent)"
                      >
                        Ver relatório SERP
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
