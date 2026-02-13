"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { PostWithSilo } from "@/lib/types";

type HomeSearchResultsProps = {
  posts: PostWithSilo[];
  maxResults?: number;
};

function normalize(text: string | null | undefined) {
  return (text ?? "").toLocaleLowerCase("pt-BR").trim();
}

function matchesQuery(post: PostWithSilo, query: string) {
  const needle = normalize(query);
  if (!needle) return false;

  return (
    normalize(post.title).includes(needle) ||
    normalize(post.target_keyword).includes(needle) ||
    normalize(post.meta_description).includes(needle) ||
    normalize(post.silo?.name).includes(needle)
  );
}

export function HomeSearchResults({ posts, maxResults = 10 }: HomeSearchResultsProps) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  const results = useMemo(() => {
    if (!query) return [];
    return posts.filter((post) => matchesQuery(post, query)).slice(0, maxResults);
  }, [posts, query, maxResults]);

  if (!query) return null;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-(--border) bg-(--paper) p-6">
        <p className="text-xs uppercase tracking-wide text-(--muted-2)">Busca</p>
        <h2 className="mt-2 text-2xl font-semibold text-(--ink)">Resultados para &quot;{query}&quot;</h2>
        <p className="mt-2 text-sm text-(--muted)">{results.length} resultado(s) encontrado(s) nos guias mais recentes.</p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-(--border) bg-(--paper) p-5 text-sm text-(--muted)">
          Nenhum resultado por enquanto. Tente termos mais amplos como &quot;cabine&quot;, &quot;gel&quot; ou
          &quot;alongamento&quot;.
        </div>
      ) : (
        <div className="stagger-grid grid gap-4 md:grid-cols-2">
          {results.map((post) => (
            <Link
              key={post.id}
              href={post.silo ? `/${post.silo.slug}/${post.slug}` : "#"}
              className="flex h-full flex-col rounded-2xl border border-(--border) bg-(--paper) p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-(--muted-2)">{post.silo?.name ?? "Conteudo"}</p>
              <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-(--ink)">{post.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-(--muted)">
                {post.meta_description || "Abrir artigo para ver detalhes e comparativos."}
              </p>
              <span className="mt-4 text-sm font-semibold text-(--brand-hot)">Abrir guia</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
