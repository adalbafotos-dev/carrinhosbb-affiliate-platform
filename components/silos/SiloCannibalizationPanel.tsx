"use client";

import { useMemo, useState } from "react";
import type { CannibalizationPair, SerpResultsByPost } from "@/lib/seo/cannibalization";
import { applySerpOverlapToPairs } from "@/lib/seo/cannibalization";
import type { SiloPostSummary } from "@/components/silos/SiloIntelligenceTabs";

type RiskFilter = "all" | "high" | "medium" | "low";

type SiloCannibalizationPanelProps = {
  posts: SiloPostSummary[];
  pairs: CannibalizationPair[];
  onViewSerp?: (postId: string) => void;
};

function getQuery(post: SiloPostSummary) {
  return post.focus_keyword?.trim() || post.targetKeyword?.trim() || post.title.trim();
}

export function SiloCannibalizationPanel({ posts, pairs, onViewSerp }: SiloCannibalizationPanelProps) {
  const [filter, setFilter] = useState<RiskFilter>("all");
  const [serpResults, setSerpResults] = useState<SerpResultsByPost>({});
  const [loadingSerp, setLoadingSerp] = useState(false);
  const [serpError, setSerpError] = useState<string | null>(null);

  const postMap = useMemo(() => new Map(posts.map((post) => [post.id, post])), [posts]);

  const scoredPairs = useMemo(() => applySerpOverlapToPairs(pairs, serpResults), [pairs, serpResults]);
  const visiblePairs = useMemo(() => {
    if (filter === "all") return scoredPairs;
    return scoredPairs.filter((pair) => pair.riskLevel === filter);
  }, [filter, scoredPairs]);

  const handleAnalyzeSerp = async () => {
    setLoadingSerp(true);
    setSerpError(null);
    const nextResults: SerpResultsByPost = { ...serpResults };

    try {
      for (const post of posts) {
        if (nextResults[post.id]) continue;
        const query = getQuery(post);
        if (!query) continue;

        const response = await fetch("/api/seo/cse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, num: 10, hl: "pt-BR", gl: "BR" }),
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          setSerpError(json?.message || "Falha ao consultar SERP.");
          break;
        }
        nextResults[post.id] = {
          items: Array.isArray(json?.items) ? json.items : [],
          totalResults: json?.meta?.totalResults,
        };
      }
      setSerpResults(nextResults);
    } catch (error: any) {
      setSerpError(error?.message || "Falha ao consultar SERP.");
    } finally {
      setLoadingSerp(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAnalyzeSerp}
          disabled={loadingSerp}
          className="rounded-md bg-(--text) px-3 py-2 text-[11px] font-semibold text-(--surface) disabled:opacity-50"
        >
          {loadingSerp ? "Buscando SERP..." : "Analisar overlap SERP"}
        </button>
        {(["all", "high", "medium", "low"] as RiskFilter[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setFilter(level)}
            className={`rounded-full border px-3 py-1 text-[10px] uppercase ${filter === level ? "border-(--brand-hot) text-(--brand-hot)" : "border-(--border) text-(--muted)"
              }`}
          >
            {level === "all" ? "todos" : level}
          </button>
        ))}
      </div>

      {serpError ? (
        <div className="rounded border border-red-300 bg-red-50 p-2 text-[11px] text-red-700">{serpError}</div>
      ) : null}

      {visiblePairs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-(--border) p-6 text-sm text-(--muted)">
          Sem pares para analisar.
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePairs.map((pair) => {
            const postA = postMap.get(pair.postAId);
            const postB = postMap.get(pair.postBId);
            if (!postA || !postB) return null;
            const serpScore =
              typeof pair.serpOverlapScore === "number" ? (pair.serpOverlapScore * 100).toFixed(0) + "%" : "N/D";
            return (
              <div key={`${pair.postAId}-${pair.postBId}`} className="rounded-xl border border-(--border) bg-(--surface) p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[12px] font-semibold text-(--text)">
                    {postA.title} <span className="text-(--muted-2)">vs</span> {postB.title}
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] uppercase ${pair.riskLevel === "high"
                      ? "bg-red-100 text-red-700"
                      : pair.riskLevel === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                      }`}
                  >
                    {pair.riskLevel}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-(--muted)">
                  <span>Similaridade: {(pair.similarityScore * 100).toFixed(0)}%</span>
                  <span>Overlap SERP: {serpScore}</span>
                </div>

                <div className="mt-2 text-[11px] text-(--text)">{pair.recommendation}</div>

                <div className="mt-2 flex items-center gap-2">
                  {onViewSerp ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onViewSerp(postA.id)}
                        className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] text-(--text) hover:border-(--brand-accent)"
                      >
                        Ver SERP de A
                      </button>
                      <button
                        type="button"
                        onClick={() => onViewSerp(postB.id)}
                        className="rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] text-(--text) hover:border-(--brand-accent)"
                      >
                        Ver SERP de B
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
