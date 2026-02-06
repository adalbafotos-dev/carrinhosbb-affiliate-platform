"use client";

import type { SiloHealthMetrics, SiloAction } from "@/lib/types/silo";
import { AlertCircle, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

type SiloHealthPanelProps = {
    health: SiloHealthMetrics;
    actions: SiloAction[];
    postTitles: Map<string, string>;
};

export function SiloHealthPanel({ health, actions, postTitles }: SiloHealthPanelProps) {
    const totalIssues =
        health.orphanPosts.length +
        health.excessiveOutbound.length +
        health.missingPillarLinks.length +
        health.weakSemanticLinks.length +
        health.offTopicPosts.length;

    const healthScore = Math.max(0, 100 - totalIssues * 5);

    return (
        <div className="space-y-6">
            {/* Health Score */}
            <div className="rounded-xl border border-(--border) bg-white p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-(--muted-2)">
                        Saúde do Silo
                    </h3>
                    <div className="flex items-center gap-2">
                        {healthScore >= 80 ? (
                            <CheckCircle size={20} className="text-green-600" />
                        ) : healthScore >= 50 ? (
                            <AlertTriangle size={20} className="text-yellow-600" />
                        ) : (
                            <AlertCircle size={20} className="text-red-600" />
                        )}
                        <span
                            className="text-2xl font-bold"
                            style={{
                                color:
                                    healthScore >= 80
                                        ? "#10B981"
                                        : healthScore >= 50
                                            ? "#F59E0B"
                                            : "#EF4444",
                            }}
                        >
                            {healthScore}
                        </span>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <MetricCard
                        label="Posts órfãos"
                        value={health.orphanPosts.length}
                        color={health.orphanPosts.length > 0 ? "red" : "green"}
                    />
                    <MetricCard
                        label="Links excessivos"
                        value={health.excessiveOutbound.length}
                        color={health.excessiveOutbound.length > 0 ? "yellow" : "green"}
                    />
                    <MetricCard
                        label="Links fracos"
                        value={health.weakSemanticLinks.length}
                        color={health.weakSemanticLinks.length > 5 ? "yellow" : "green"}
                    />
                </div>
            </div>

            {/* Issues Breakdown */}
            {totalIssues > 0 && (
                <div className="space-y-4">
                    {health.orphanPosts.length > 0 && (
                        <IssueSection
                            title="Posts Órfãos"
                            icon={<AlertCircle size={16} className="text-red-600" />}
                            items={health.orphanPosts.map((orphan) => ({
                                id: orphan.postId,
                                title: postTitles.get(orphan.postId) || "Post sem título",
                                description: orphan.reason,
                            }))}
                        />
                    )}

                    {health.missingPillarLinks.length > 0 && (
                        <IssueSection
                            title="Suportes Sem Link para o Pilar"
                            icon={<AlertTriangle size={16} className="text-yellow-600" />}
                            items={health.missingPillarLinks.map((missing) => ({
                                id: missing.postId,
                                title: postTitles.get(missing.postId) || "Post sem título",
                                description: `Post de ${missing.role} não reforça o pilar`,
                            }))}
                        />
                    )}

                    {health.excessiveOutbound.length > 0 && (
                        <IssueSection
                            title="Excesso de Links Internos"
                            icon={<TrendingUp size={16} className="text-yellow-600" />}
                            items={health.excessiveOutbound.map((excess) => ({
                                id: excess.postId,
                                title: postTitles.get(excess.postId) || "Post sem título",
                                description: `${excess.outboundCount} links (limite recomendado: ${excess.threshold})`,
                            }))}
                        />
                    )}

                    {health.weakSemanticLinks.length > 0 && (
                        <div className="rounded-xl border border-(--border) bg-white p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <AlertTriangle size={16} className="text-yellow-600" />
                                <h4 className="text-sm font-semibold text-(--ink)">
                                    Links com Semântica Fraca ({health.weakSemanticLinks.length})
                                </h4>
                            </div>
                            <div className="space-y-2 text-xs text-(--muted)">
                                {health.weakSemanticLinks.slice(0, 5).map((weak, idx) => (
                                    <div key={idx} className="rounded bg-(--surface-muted) p-2">
                                        <div className="font-medium text-(--ink)">
                                            {postTitles.get(weak.sourceId)} → {postTitles.get(weak.targetId)}
                                        </div>
                                        <div className="mt-1">{weak.issues.join(", ")}</div>
                                    </div>
                                ))}
                                {health.weakSemanticLinks.length > 5 && (
                                    <div className="pt-2 text-center">
                                        +{health.weakSemanticLinks.length - 5} links fracos
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Recommended Actions */}
            {actions.length > 0 && (
                <div className="rounded-xl border border-(--border) bg-white p-5">
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-(--muted-2)">
                        Ações Recomendadas ({actions.length})
                    </h3>
                    <div className="space-y-3">
                        {actions.slice(0, 10).map((action, idx) => (
                            <ActionCard key={idx} action={action} postTitles={postTitles} />
                        ))}
                        {actions.length > 10 && (
                            <div className="pt-2 text-center text-xs text-(--muted)">
                                +{actions.length - 10} ações adicionais
                            </div>
                        )}
                    </div>
                </div>
            )}

            {totalIssues === 0 && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                    <CheckCircle size={40} className="mx-auto mb-3 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-900">Silo em Excelente Estado!</h3>
                    <p className="mt-2 text-sm text-green-700">
                        Não foram encontrados problemas estruturais ou semânticos.
                    </p>
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colorMap = {
        green: "bg-green-50 text-green-900 border-green-200",
        yellow: "bg-yellow-50 text-yellow-900 border-yellow-200",
        red: "bg-red-50 text-red-900 border-red-200",
    };

    return (
        <div className={`rounded-lg border p-3 ${colorMap[color] || colorMap.green}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
        </div>
    );
}

function IssueSection({
    title,
    icon,
    items,
}: {
    title: string;
    icon: React.ReactNode;
    items: Array<{ id: string; title: string; description: string }>;
}) {
    return (
        <div className="rounded-xl border border-(--border) bg-white p-5">
            <div className="mb-3 flex items-center gap-2">
                {icon}
                <h4 className="text-sm font-semibold text-(--ink)">
                    {title} ({items.length})
                </h4>
            </div>
            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        className="rounded-lg border border-(--border) bg-(--surface-muted) p-3"
                    >
                        <div className="text-sm font-medium text-(--ink)">{item.title}</div>
                        <div className="mt-1 text-xs text-(--muted)">{item.description}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ActionCard({
    action,
    postTitles,
}: {
    action: SiloAction;
    postTitles: Map<string, string>;
}) {
    const priorityColors = {
        HIGH: "border-l-4 border-l-red-500 bg-red-50",
        MEDIUM: "border-l-4 border-l-yellow-500 bg-yellow-50",
        LOW: "border-l-4 border-l-blue-500 bg-blue-50",
    };

    const typeLabels = {
        ADD_LINK: "➕ Adicionar Link",
        REMOVE_LINK: "➖ Remover Link",
        CHANGE_ANCHOR: "✏️ Alterar Âncora",
        REORDER: "🔄 Reordenar",
        CHANGE_ROLE: "🎯 Alterar Papel",
    };

    return (
        <div className={`rounded-lg p-3 ${priorityColors[action.priority]}`}>
            <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide opacity-70">
                    {typeLabels[action.type]}
                </span>
                <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold uppercase">
                    {action.priority}
                </span>
            </div>
            <div className="text-sm font-medium text-(--ink)">
                {postTitles.get(action.postId)}
            </div>
            <div className="mt-1 text-xs text-(--muted)">{action.description}</div>
            {action.suggestedAnchor && (
                <div className="mt-2 rounded bg-white px-2 py-1 text-xs">
                    <span className="font-semibold">Âncora sugerida:</span> "{action.suggestedAnchor}"
                </div>
            )}
            <div className="mt-2 text-xs italic opacity-70">Problema: {action.currentIssue}</div>
        </div>
    );
}
