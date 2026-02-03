"use client";

import { useState } from "react";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";
import type { CannibalizationPair } from "@/lib/seo/cannibalization";
import { SiloLinkGraph } from "@/components/silos/SiloLinkGraph";
import { SiloPostsTable } from "@/components/silos/SiloPostsTable";
import { SiloCannibalizationPanel } from "@/components/silos/SiloCannibalizationPanel";

export type SiloPostSummary = {
  id: string;
  title: string;
  slug: string;
  status?: string | null;
  focusKeyword?: string | null;
  targetKeyword?: string | null;
};

type Tab = "overview" | "graph" | "cannibalization";

type SiloIntelligenceTabsProps = {
  silo: { id: string; name: string; slug: string };
  posts: SiloPostSummary[];
  metrics: SiloMetrics;
  cannibalization: CannibalizationPair[];
};

export function SiloIntelligenceTabs({ silo, posts, metrics, cannibalization }: SiloIntelligenceTabsProps) {
  const [tab, setTab] = useState<Tab>("overview");

  const stats = [
    { label: "Links totais", value: metrics.totals.totalLinks },
    { label: "Internos", value: metrics.totals.internalLinks },
    { label: "Externos", value: metrics.totals.externalLinks },
    { label: "Amazon", value: metrics.totals.amazonLinks },
    { label: "Nofollow", value: metrics.relCounts.nofollow },
    { label: "Sponsored", value: metrics.relCounts.sponsored },
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
      <div className="flex border-b border-[color:var(--border)] text-[11px] font-semibold uppercase text-[color:var(--muted)]">
        <TabButton label="Visão Geral" active={tab === "overview"} onClick={() => setTab("overview")} />
        <TabButton label="Mapa de Links" active={tab === "graph"} onClick={() => setTab("graph")} />
        <TabButton label="Canibalização" active={tab === "cannibalization"} onClick={() => setTab("cannibalization")} />
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[color:var(--border)] p-6 text-sm text-[color:var(--muted)]">
          Nenhum post associado a este silo ainda.
        </div>
      ) : null}

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3">
                <div className="text-[11px] font-semibold uppercase text-[color:var(--muted)]">{item.label}</div>
                <div className="mt-2 text-xl font-semibold text-[color:var(--text)]">{item.value}</div>
              </div>
            ))}
          </div>

          <SiloPostsTable
            siloSlug={silo.slug}
            posts={posts}
            metrics={metrics}
          />
        </div>
      ) : null}

      {tab === "graph" ? (
        <SiloLinkGraph siloName={silo.name} posts={posts} metrics={metrics} />
      ) : null}

      {tab === "cannibalization" ? (
        <SiloCannibalizationPanel
          posts={posts}
          pairs={cannibalization}
        />
      ) : null}
    </section>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1 border-b-2 py-3 ${active ? "border-[color:var(--brand-hot)] text-[color:var(--brand-hot)]" : "border-transparent text-[color:var(--muted-2)]"
        }`}
    >
      {label}
    </button>
  );
}
