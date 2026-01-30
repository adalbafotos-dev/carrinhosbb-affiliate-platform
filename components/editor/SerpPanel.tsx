"use client";

import { useState } from "react";
import { useEditorContext } from "@/components/editor/EditorContext";
import { Search, TrendingUp, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";

type SerpResult = {
    title: string;
    link: string;
    snippet: string;
    displayLink: string;
};

type SerpAnalysis = {
    results: SerpResult[];
    anomalies: string[];
    intents: {
        ecommerce: number;
        informational: number;
        mixed: number;
    };
};

export function SerpPanel() {
    const { meta } = useEditorContext();
    const [keyword, setKeyword] = useState("");
    const [analysis, setAnalysis] = useState<SerpAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleAnalyze = async () => {
        const searchKeyword = keyword || meta.targetKeyword;

        if (!searchKeyword) {
            setError("Digite uma keyword ou defina a Focus Keyword do post.");
            return;
        }

        setLoading(true);
        setError("");
        setAnalysis(null);

        try {
            const response = await fetch("/api/admin/serp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ keyword: searchKeyword })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro ao analisar SERP");
            }

            const data: SerpAnalysis = await response.json();
            setAnalysis(data);
        } catch (err: any) {
            setError(err.message || "Erro desconhecido");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="space-y-3 rounded-lg border border-(--border) bg-(--surface-muted) p-3">
            <div className="flex items-center justify-between text-[12px] font-semibold uppercase text-(--muted)">
                <span className="flex items-center gap-1.5">
                    <TrendingUp size={14} />
                    SERP Analyzer
                </span>
            </div>

            {/* Input */}
            <div className="space-y-2">
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder={meta.targetKeyword || "Digite a keyword..."}
                    className="w-full px-2 py-1.5 text-[11px] rounded-md border border-(--border) bg-(--surface) text-(--text) outline-none placeholder:text-(--muted-2)"
                />
                <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="w-full px-3 py-2 text-[11px] font-semibold rounded bg-(--text) text-(--surface) hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            Analisando...
                        </>
                    ) : (
                        <>
                            <Search size={14} />
                            Analisar SERP
                        </>
                    )}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-2 rounded border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 text-[11px] text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Analysis Results */}
            {analysis && (
                <div className="space-y-3">
                    {/* Intents */}
                    <div className="rounded border border-(--border) bg-(--surface) p-2 space-y-2">
                        <div className="text-[11px] font-semibold text-(--text)">Intenção de Busca:</div>
                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-(--muted)">E-commerce:</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{analysis.intents.ecommerce}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-(--muted)">Informacional:</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{analysis.intents.informational}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="text-(--muted)">Mista (Vídeo/Fórum):</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400">{analysis.intents.mixed}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Anomalies */}
                    {analysis.anomalies.length > 0 && (
                        <div className="rounded border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-2 space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                                <AlertTriangle size={12} />
                                Alertas:
                            </div>
                            {analysis.anomalies.map((anomaly, index) => (
                                <div key={index} className="text-[10px] text-amber-700 dark:text-amber-400">
                                    {anomaly}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Results List */}
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        <div className="text-[11px] font-semibold text-(--text) sticky top-0 bg-(--surface-muted) py-1">
                            Top 10 Resultados:
                        </div>
                        {analysis.results.map((result, index) => (
                            <div
                                key={index}
                                className="rounded border border-(--border) bg-(--surface) p-2 space-y-1"
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-[10px] font-bold text-(--muted) shrink-0">
                                        #{index + 1}
                                    </span>
                                    <div className="flex-1 overflow-hidden">
                                        <a
                                            href={result.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                                            title={result.title}
                                        >
                                            {result.title}
                                            <ExternalLink size={10} className="shrink-0" />
                                        </a>
                                        <div className="text-[9px] text-(--muted-2) truncate">
                                            {result.displayLink}
                                        </div>
                                        <div className="text-[10px] text-(--text) line-clamp-2 mt-0.5">
                                            {result.snippet}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Help */}
            {!analysis && !loading && (
                <div className="p-2 rounded border border-(--border) bg-(--surface) text-[10px] text-(--muted-2)">
                    <strong className="text-(--text)">Dica:</strong> O SERP Analyzer busca os top 10 resultados do Google
                    e detecta a intenção de busca (e-commerce, informacional, mista). Use para alinhar seu conteúdo com a SERP.
                </div>
            )}
        </section>
    );
}
