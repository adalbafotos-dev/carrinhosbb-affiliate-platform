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

function resolvePostCover(post: PostWithSilo) {
  return post.hero_image_url || post.cover_image || post.og_image_url || null;
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
      <div className="rounded-3xl border border-[rgba(165,119,100,0.24)] bg-[linear-gradient(150deg,rgba(255,255,255,0.97)_0%,rgba(255,247,230,0.93)_56%,rgba(241,188,153,0.28)_100%)] p-6 shadow-[0_12px_28px_-20px_rgba(165,119,100,0.36)]">
        <p className="text-xs uppercase tracking-wide text-(--muted-2)">Busca</p>
        <h2 className="mt-2 text-2xl font-semibold text-(--ink)">Resultados para &quot;{query}&quot;</h2>
        <p className="mt-2 text-sm text-(--muted)">{results.length} resultado(s) encontrado(s) nos guias mais recentes.</p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-[rgba(165,119,100,0.24)] bg-[linear-gradient(154deg,rgba(255,255,255,0.97)_0%,rgba(255,247,230,0.92)_62%,rgba(241,188,153,0.22)_100%)] p-5 text-sm text-(--muted)">
          Nenhum resultado por enquanto. Tente termos mais amplos como &quot;cabine&quot;, &quot;gel&quot; ou
          &quot;alongamento&quot;.
        </div>
      ) : (
        <div className="stagger-grid grid gap-5 md:grid-cols-2">
          {results.map((post) => {
            const cover = resolvePostCover(post);
            const coverAlt = post.hero_image_alt || post.title;
            const href = post.silo ? `/${post.silo.slug}/${post.slug}` : "#";

            return (
              <Link
                key={post.id}
                href={href}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[rgba(165,119,100,0.24)] bg-[linear-gradient(160deg,rgba(255,255,255,0.98)_0%,rgba(255,249,237,0.94)_60%,rgba(241,188,153,0.24)_100%)] shadow-[0_12px_28px_-22px_rgba(165,119,100,0.38)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(165,119,100,0.46)]"
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b border-[rgba(165,119,100,0.2)] bg-[rgba(255,248,234,0.8)]">
                  {cover ? (
                    <img
                      src={cover}
                      alt={coverAlt}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-(--brand-accent)">
                      Sem imagem de capa
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
                  <p className="text-xs uppercase tracking-wide text-(--muted-2)">{post.silo?.name ?? "Conteudo"}</p>
                  <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-(--ink)">{post.title}</h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-(--muted)">
                    {post.meta_description || "Abrir artigo para ver detalhes e comparativos."}
                  </p>
                  <span className="mt-auto inline-flex w-fit items-center rounded-full bg-(--brand-hot) px-4 py-2 text-sm font-semibold text-(--paper)">
                    Abrir guia
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
