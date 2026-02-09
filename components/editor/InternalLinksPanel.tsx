"use client";

import { useState, useEffect, useMemo } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { Link2, TrendingUp, Search } from "lucide-react";

type PostSuggestion = {
    id: string;
    title: string;
    slug: string;
    silo: string;
    relevance: number; // 0-100%
};

// Jaccard similarity para calcular relevância semântica
function calculateJaccard(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
}

function tokenize(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .split(/\W+/)
            .filter(w => w.length > 3) // Palavras com mais de 3 caracteres
    );
}

export function InternalLinksPanel() {
    const { docText, editor, meta } = useEditorContext();
    const [posts, setPosts] = useState<PostSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Fetch published posts (simulado - você pode integrar com Supabase)
    useEffect(() => {
        async function fetchPosts() {
            setLoading(true);
            try {
                // TODO: Integrar com API/Supabase para buscar posts publicados
                // Por ora, retorna array vazio
                // const response = await fetch('/api/admin/posts?status=published');
                // const data = await response.json();

                // Simulação com dados mockados
                const mockPosts: PostSuggestion[] = [];

                setPosts(mockPosts);
            } catch (error) {
                console.error("Erro ao buscar posts:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchPosts();
    }, []);

    // Calcular sugestões com relevância semântica
    const suggestions = useMemo(() => {
        if (posts.length === 0 || !docText) return [];

        const currentTokens = tokenize(docText + " " + meta.title + " " + meta.metaDescription);

        const scored = posts.map(post => {
            const postTokens = tokenize(post.title + " " + post.slug);
            const relevance = calculateJaccard(currentTokens, postTokens);
            return { ...post, relevance };
        });

        // Ordenar por relevância descendente
        return scored.sort((a, b) => b.relevance - a.relevance).slice(0, 10); // Top 10
    }, [posts, docText, meta.title, meta.metaDescription]);

    const filteredSuggestions = useMemo(() => {
        if (!search) return suggestions;
        const searchLower = search.toLowerCase();
        return suggestions.filter(s =>
            s.title.toLowerCase().includes(searchLower) ||
            s.slug.toLowerCase().includes(searchLower) ||
            s.silo.toLowerCase().includes(searchLower)
        );
    }, [suggestions, search]);

    const handleInsertLink = (post: PostSuggestion) => {
        if (!editor) return;

        const selection = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(selection.from, selection.to);

        if (selectedText) {
            // Tem texto selecionado: transformar em link
            editor
                .chain()
                .focus()
                .setLink({
                    href: `/${post.slug}`,
                    "data-post-id": post.id,
                    "data-link-type": "internal"
                } as any)
                .run();
        } else {
            // Sem texto selecionado: inserir link com título do post
            editor
                .chain()
                .focus()
                .insertContent(`<a href="/${post.slug}" data-post-id="${post.id}" data-link-type="internal">${post.title}</a> `)
                .run();
        }
    };

    return (
        <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
            <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
                <span className="flex items-center gap-1.5">
                    <Link2 size={14} />
                    Links Internos
                </span>
                <span className="text-[10px] text-(--muted-2)">
                    {suggestions.length} sugestões
                </span>
            </div>

            { /* Search */}
            <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-(--muted-2)" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar post..."
                    className="w-full pl-7 pr-2 py-1.5 text-[11px] rounded-md border border-(--border) bg-(--surface) text-(--text) outline-none placeholder:text-(--muted-2)"
                />
            </div>

            {/* Suggestions List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {loading && (
                    <p className="text-[10px] text-(--muted-2) text-center py-4">
                        Carregando posts...
                    </p>
                )}

                {!loading && filteredSuggestions.length === 0 && (
                    <p className="text-[10px] text-(--muted-2) text-center py-4">
                        {search
                            ? "Nenhum post encontrado na busca."
                            : "Nenhuma sugestão disponível. Publique outros posts para ver sugestões."}
                    </p>
                )}

                {filteredSuggestions.map((suggestion) => (
                    <div
                        key={suggestion.id}
                        className="rounded border border-(--border) bg-(--surface) p-2 space-y-1.5 hover:shadow-md transition-all"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 overflow-hidden">
                                <div className="text-[11px] font-medium text-(--text) truncate" title={suggestion.title}>
                                    {suggestion.title}
                                </div>
                                <div className="text-[9px] text-(--muted-2) truncate">
                                    /{suggestion.slug}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center gap-0.5 text-[10px] text-(--muted)">
                                    <TrendingUp size={10} />
                                    <span className="font-mono font-semibold">
                                        {suggestion.relevance.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {suggestion.silo && (
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {suggestion.silo}
                                </span>
                            </div>
                        )}

                        <button
                            onClick={() => handleInsertLink(suggestion)}
                            className="w-full px-2 py-1 text-[10px] font-semibold rounded bg-(--text) text-(--surface) hover:opacity-80 transition-opacity"
                        >
                            Inserir Link
                        </button>
                    </div>
                ))}
            </div>

            {/* Help */}
            <div className="p-2 rounded border border-(--border) bg-(--surface) text-[10px] text-(--muted-2)">
                <strong className="text-(--text)">Dica:</strong> Selecione um texto no editor antes de clicar "Inserir Link"
                para transformá-lo em link. Se nada estiver selecionado, o título do post será inserido.
            </div>
        </section>
    );
}
