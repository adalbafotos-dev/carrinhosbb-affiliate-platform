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

  return (
    <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[color:var(--surface-muted)] text-[11px] uppercase text-[color:var(--muted-2)]">
          <tr>
            <th className="px-4 py-3">Post</th>
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
          {posts.map((post) => {
            const metric = metricsByPost.get(post.id);
            return (
              <tr key={post.id} className="border-t border-[color:var(--border)]">
                <td className="px-4 py-3 font-medium text-[color:var(--text)]">{post.title}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{statusLabel(post.status)}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">
                  {post.focusKeyword?.trim() || post.targetKeyword?.trim() || post.title}
                </td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{metric?.internalSiloLinks ?? 0}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{metric?.externalLinks ?? 0}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{metric?.amazonLinks ?? 0}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">
                  {(metric?.nofollow ?? 0)}/{metric?.sponsored ?? 0}
                </td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{metric?.inboundWithinSilo ?? 0}</td>
                <td className="px-4 py-3 text-[color:var(--muted)]">{metric?.outboundWithinSilo ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/editor/${post.id}`}
                      target="_blank"
                      className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-1 text-[11px] text-[color:var(--text)] hover:border-[color:var(--brand-hot)]"
                    >
                      Abrir no editor
                    </Link>
                    {onViewSerp ? (
                      <button
                        type="button"
                        onClick={() => onViewSerp(post.id)}
                        className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-1 text-[11px] text-[color:var(--text)] hover:border-[color:var(--brand-accent)]"
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
