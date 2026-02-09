"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeProps,
  Position,
  MarkerType,
  Handle,
  ReactFlowProvider,
  BaseEdge,
  type EdgeProps,
} from "reactflow";
import "reactflow/dist/style.css";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";
import type { SiloPostSummary } from "@/components/silos/SiloIntelligenceTabs";
import type { LinkOccurrence, LinkAudit, LinkOccurrenceEdge, SiloAudit } from "@/lib/silo/types";
import { SiloInspectorPanel } from "@/components/silos/SiloInspectorPanel";
import { auditSiloAction } from "@/app/actions/audit-silo";

// Props atualizadas para receber objeto Silo completo
type SiloLinkGraphProps = {
  silo: { id: string; name: string; slug: string };
  posts: SiloPostSummary[];
  metrics: SiloMetrics;
  linkOccurrences?: LinkOccurrence[];
  linkEdges?: LinkOccurrenceEdge[];
  auditsByOccurrenceId?: Record<string, LinkAudit>;
  linkAudits?: LinkAudit[];
  siloAudit?: SiloAudit | null;
};

type PostCardData = {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  focusKeyword?: string | null;
  inbound: number;
  outbound: number;
  isPillar: boolean;
  role?: string | null;
  layer: number;
  isSelected?: boolean;
  isDimmed?: boolean; // Novo controle de opacidade
};


const STATUS_COLORS: Record<string, string> = {
  draft: "#94A3B8",
  review: "#F59E0B",
  scheduled: "#0EA5E9",
  published: "#10B981",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  review: "Revisão",
  scheduled: "Agendado",
  published: "Publicado",
};

const buildAuditMap = (audits: any[] = []) => {
  const normalizeLabel = (value: unknown): LinkAudit["label"] => {
    const raw = String(value ?? "").toUpperCase();
    if (raw === "STRONG") return "STRONG";
    if (raw === "WEAK") return "WEAK";
    return "OK";
  };
  const normalizeAction = (value: unknown): LinkAudit["action"] => {
    const raw = String(value ?? "").toUpperCase();
    if (raw === "KEEP") return "KEEP";
    if (raw === "CHANGE_ANCHOR") return "CHANGE_ANCHOR";
    if (raw === "REMOVE_LINK") return "REMOVE_LINK";
    if (raw === "CHANGE_TARGET") return "CHANGE_TARGET";
    if (raw === "ADD_INTERNAL_LINK") return "ADD_INTERNAL_LINK";
    return null;
  };
  return audits.reduce<Record<string, LinkAudit>>((acc, audit: any) => {
    const key = String(audit.occurrence_id ?? audit.occurrenceId ?? "");
    if (!key) return acc;
    const score = Number(audit.score);
    acc[key] = {
      id: typeof audit.id === "string" ? audit.id : undefined,
      occurrence_id: String(audit.occurrence_id ?? audit.occurrenceId ?? key),
      score: Number.isFinite(score) ? score : 0,
      label: normalizeLabel(audit.label),
      reasons: Array.isArray(audit.reasons) ? audit.reasons.map((reason: any) => String(reason)) : [],
      suggested_anchor: audit.suggested_anchor ?? null,
      note: audit.note ?? null,
      action: normalizeAction(audit.action),
      recommendation: audit.recommendation ?? null,
      spam_risk: typeof audit.spam_risk === "number" ? audit.spam_risk : null,
      intent_match: typeof audit.intent_match === "number" ? audit.intent_match : null,
    };
    return acc;
  }, {});
};


function OrthogonalMultiEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const offset = data?.offset || 0;
  const sx = sourceX + offset;
  const sy = sourceY;
  const tx = targetX + offset;
  const ty = targetY;

  let path = "";

  // Ajuste de margem vertical para layout mais compacto (160px layer height)
  // Se layerHeight = 160, a distância entre bottom e top é ~60-80px.
  // 40 de margem safe é ok.
  if (sourceY < targetY - 20) {
    // DESCENDO
    const midY = (sourceY + targetY) / 2;
    path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
  } else if (sourceY > targetY + 20) {
    // SUBINDO
    const midY = (sourceY + targetY) / 2;
    path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
  } else {
    // LATERAL
    const loopHeight = 60 + Math.abs(offset);
    const loopY = sourceY + loopHeight;
    path = `M ${sx} ${sy} L ${sx} ${loopY} L ${tx} ${loopY} L ${tx} ${ty}`;
  }

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      style={style}
    />
  );
}

function PostCard({ data }: NodeProps<PostCardData>) {
  const statusColor = STATUS_COLORS[data.status || "draft"] || "#94A3B8";
  const isOrphan = data.inbound === 0 && data.outbound === 0;

  // Opacidade controlada por prop explicita
  const opacity = data.isDimmed ? 0.2 : 1;

  return (
    <div
      className={`group relative w-[240px] rounded-xl border-2 bg-white p-4 shadow-md transition-all hover:shadow-xl ${data.isSelected ? 'ring-2 ring-(--brand-hot)' : ''}`}
      style={{
        borderColor: data.isPillar ? "#F36141" : data.role === "SUPPORT" ? "#F59E0B" : data.role === "AUX" ? "#3B82F6" : isOrphan ? "#EF4444" : statusColor,
        opacity,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="h-3! w-3! bg-(--muted-2)! -top-3 rounded-full border-2 border-white"
        style={{ left: '60%' }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="h-3! w-3! bg-(--brand-hot)! -top-3 rounded-full border-2 border-white"
        style={{ left: '40%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="h-3! w-3! bg-(--brand-hot)! -bottom-3 rounded-full border-2 border-white"
        style={{ left: '40%' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="h-3! w-3! bg-(--muted-2)! -bottom-3 rounded-full border-2 border-white"
        style={{ left: '60%' }}
      />

      {data.isPillar && <div className="absolute -top-2 left-3 rounded-full bg-[#F36141] px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">Pilar</div>}
      {data.role === "SUPPORT" && <div className="absolute -top-2 left-3 rounded-full bg-[#F59E0B] px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">Suporte</div>}
      {isOrphan && <div className="absolute -top-2 right-3 rounded-full bg-[#EF4444] px-2 py-0.5 text-[9px] font-bold uppercase text-white shadow-sm">Órfão</div>}

      <div className="mb-2 flex items-start justify-between gap-2 pt-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-(--ink)">{data.title}</h3>
        <div className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium uppercase text-white" style={{ backgroundColor: statusColor }}>
          {STATUS_LABELS[data.status || "draft"] || "Draft"}
        </div>
      </div>
      <div className="mb-3 text-[10px] text-(--muted-2)">/{data.slug}</div>
      <div className="flex items-center justify-between text-[11px] font-medium text-(--muted)">
        <span>In: {data.inbound}</span>
        <span>Out: {data.outbound}</span>
      </div>
    </div>
  );
}

// ... helper calculateHierarchicalLayout mantido ...
type LayerMap = Map<string, number>;
function calculateHierarchicalLayout(
  posts: SiloPostSummary[],
  adjacency: SiloMetrics["adjacency"],
  metricsMap: Map<string, any>
): { layers: LayerMap; pillarId: string | null } {
  const layers: LayerMap = new Map();
  let pillarId: string | null = null;
  const hasDefinedHierarchy = posts.some((p) => p.role);
  if (hasDefinedHierarchy) {
    posts.forEach((post) => {
      if (post.role === "PILLAR") { layers.set(post.id, 0); pillarId = post.id; }
      else if (post.role === "SUPPORT") { layers.set(post.id, 1); }
      else if (post.role === "AUX") { layers.set(post.id, 2); }
      else { layers.set(post.id, 3); }
    });
    return { layers, pillarId };
  }
  const pillarCandidate = posts.find((p) => p.isPillar);
  pillarId = pillarCandidate?.id || null;
  if (!pillarId) {
    let maxInbound = -1;
    posts.forEach((post) => {
      const metric = metricsMap.get(post.id);
      if ((metric?.inboundWithinSilo ?? 0) > maxInbound) {
        maxInbound = metric?.inboundWithinSilo ?? 0;
        pillarId = post.id;
      }
    });
  }
  if (pillarId) layers.set(pillarId, 0);
  const maxLayer = Math.max(...Array.from(layers.values()), 0);
  posts.forEach((post) => {
    if (!layers.has(post.id)) layers.set(post.id, maxLayer + 1);
  });
  return { layers, pillarId };
}

export function SiloLinkGraph({ silo, posts, metrics, linkOccurrences, linkEdges, auditsByOccurrenceId, linkAudits, siloAudit }: SiloLinkGraphProps) {
  const [filterOrphans, setFilterOrphans] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [selectedOccurrenceFallback, setSelectedOccurrenceFallback] = useState<LinkOccurrence | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [auditsByOccurrenceIdState, setAuditsByOccurrenceIdState] = useState<Record<string, LinkAudit>>(
    auditsByOccurrenceId ?? buildAuditMap(linkAudits || [])
  );
  const [siloAuditState, setSiloAuditState] = useState<SiloAudit | null>(siloAudit || null);

  const [isAuditing, startAudit] = useTransition();

  const nodeTypes = useMemo(() => ({ postCard: PostCard }), []);
  const edgeTypes = useMemo(() => ({ orthogonal: OrthogonalMultiEdge }), []);

  const metricsMap = useMemo(() => new Map(metrics.perPostMetrics.map((metric) => [metric.postId, metric])), [metrics]);
  const { layers, pillarId } = useMemo(() => calculateHierarchicalLayout(posts, metrics.adjacency, metricsMap), [posts, metrics.adjacency, metricsMap]);
  const linkAuditsState = useMemo(() => Object.values(auditsByOccurrenceIdState), [auditsByOccurrenceIdState]);
  const auditsMap = useMemo(() => new Map(Object.entries(auditsByOccurrenceIdState)), [auditsByOccurrenceIdState]);

  useEffect(() => {
    if (auditsByOccurrenceId) {
      setAuditsByOccurrenceIdState(auditsByOccurrenceId);
    } else {
      setAuditsByOccurrenceIdState(buildAuditMap(linkAudits || []));
    }
  }, [auditsByOccurrenceId, linkAudits]);

  useEffect(() => {
    setSiloAuditState(siloAudit || null);
  }, [siloAudit]);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (filterOrphans) {
      result = result.filter((post) => {
        const metric = metricsMap.get(post.id);
        return (metric?.inboundWithinSilo ?? 0) > 0 || (metric?.outboundWithinSilo ?? 0) > 0;
      });
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(term) || p.slug.toLowerCase().includes(term));
    }
    return result;
  }, [posts, filterOrphans, searchTerm, metricsMap]);

  const normalizedLinkEdges = useMemo<LinkOccurrenceEdge[]>(() => {
    if (linkEdges && linkEdges.length > 0) {
      return linkEdges.map((edge) => ({
        ...edge,
        occurrence_ids: (edge.occurrence_ids || []).map((id) => String(id)),
      }));
    }

    const map = new Map<string, LinkOccurrenceEdge>();
    (linkOccurrences || []).forEach((occ) => {
      if (!occ.target_post_id) return;
      if (String(occ.link_type ?? "INTERNAL") !== "INTERNAL") return;
      const sourceId = String(occ.source_post_id ?? "");
      const targetId = String(occ.target_post_id ?? "");
      const occurrenceId = String(occ.id ?? "");
      if (!sourceId || !targetId || !occurrenceId) return;
      const key = `${sourceId}::${targetId}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: `edge-${sourceId}-${targetId}`,
          source_post_id: sourceId,
          target_post_id: targetId,
          occurrence_ids: [occurrenceId],
        });
        return;
      }
      existing.occurrence_ids.push(occurrenceId);
    });
    return Array.from(map.values());
  }, [linkEdges, linkOccurrences]);

  const nodes = useMemo<Node<PostCardData>[]>(() => {
    const layerGroups = new Map<number, string[]>();
    filteredPosts.forEach((post) => {
      const layer = layers.get(post.id) ?? 0;
      if (!layerGroups.has(layer)) layerGroups.set(layer, []);
      layerGroups.get(layer)!.push(post.id);
    });

    const nodesList: Node<PostCardData>[] = [];
    const layerHeight = 110;
    const topOffset = 40;
    const nodeWidth = 300;

    layerGroups.forEach((postIds, layer) => {
      const count = postIds.length;
      postIds.forEach((postId, index) => {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        const metric = metricsMap.get(postId);
        const x = (index - (count - 1) / 2) * nodeWidth;
        const y = topOffset + layer * layerHeight;

        // Lógica de Opacidade
        const isSelected = selectedNodeId === postId;
        let isDimmed = false;

        if (selectedNodeId || selectedEdgeId) {
          // Se algo está selecionado, nodes não relacionados ficam dimmed
          if (isSelected) isDimmed = false; // O selecionado brilha
          else if (selectedEdgeId) isDimmed = true; // Se tem edge selecionada, nodes não conectados poderiam brilhar se fossem source/target da edge
          // mas vamos simplificar: nodes dimmed se não forem o selecionado.
          else isDimmed = true;

          // Re-habilitar se conectado ao selecionado? (Focus Mode mais rico)
          // Mas o user pediu "opacity 1" por default. A lógica aqui é: dimmed=true => opacity 0.2.
        }

        nodesList.push({
          id: postId,
          position: { x, y },
          data: {
            id: postId,
            title: post.title,
            slug: post.slug,
            status: post.status ?? "draft",
            focusKeyword: post.focus_keyword,
            inbound: metric?.inboundWithinSilo ?? 0,
            outbound: metric?.outboundWithinSilo ?? 0,
            isPillar: postId === pillarId,
            layer,
            role: post.role,
            isSelected,
            isDimmed,
          },
          type: "postCard",
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      });
    });
    return nodesList;
  }, [filteredPosts, layers, pillarId, posts, metricsMap, selectedNodeId, selectedEdgeId]);

  const { edges, hiddenEdgeCounts, occurrenceToEdgeId } = useMemo(() => {
    const postIdSet = new Set(filteredPosts.map((p) => p.id));
    const resultEdges: Edge[] = [];
    const hiddenEdgeCounts = new Map<string, { outgoingHidden: number; incomingHidden: number }>();
    const occurrenceToEdgeId = new Map<string, string>();
    const labelPriority: Record<string, number> = { WEAK: 0, OK: 1, STRONG: 2 };

    const getEdgeColor = (label?: string | null) => {
      if (label === "STRONG") return "#10B981";
      if (label === "OK") return "#F59E0B";
      if (label === "WEAK") return "#EF4444";
      return "#94A3B8";
    };

    normalizedLinkEdges.forEach((edge) => {
      if (!postIdSet.has(edge.source_post_id) || !postIdSet.has(edge.target_post_id)) return;

      const occurrenceIds = (edge.occurrence_ids || []).map((id) => String(id)).filter(Boolean);

      const labelBuckets: Record<"WEAK" | "OK" | "STRONG" | "NA", string[]> = {
        WEAK: [],
        OK: [],
        STRONG: [],
        NA: [],
      };

      occurrenceIds.forEach((id) => {
        const audit = auditsMap.get(id);
        if (!audit) {
          labelBuckets.NA.push(id);
          return;
        }
        if (audit.label === "WEAK") labelBuckets.WEAK.push(id);
        else if (audit.label === "OK") labelBuckets.OK.push(id);
        else if (audit.label === "STRONG") labelBuckets.STRONG.push(id);
        else labelBuckets.NA.push(id);
      });

      const countsByLabel = {
        strong: labelBuckets.STRONG.length,
        ok: labelBuckets.OK.length,
        weak: labelBuckets.WEAK.length,
      };

      const labelOrder: Array<"WEAK" | "OK" | "STRONG" | "NA"> = ["WEAK", "OK", "STRONG", "NA"];
      const activeLabels = labelOrder.filter((label) => labelBuckets[label].length > 0);
      const offsetStep = 10;

      const sourceLayer = layers.get(edge.source_post_id) || 0;
      const targetLayer = layers.get(edge.target_post_id) || 0;

      let sourceHandle = "bottom-source";
      let targetHandle = "top-target";
      if (sourceLayer > targetLayer) { sourceHandle = "top-source"; targetHandle = "bottom-target"; }
      else if (sourceLayer === targetLayer) { sourceHandle = "bottom-source"; targetHandle = "bottom-target"; }

      activeLabels.forEach((label, index) => {
        const ids = labelBuckets[label];
        if (!ids.length) return;

        let worstOccurrenceId = ids[0] ?? null;
        let worstAudit: LinkAudit | null = null;
        const auditedItems = ids
          .map((id) => {
            const audit = auditsMap.get(id);
            return audit ? { id, audit } : null;
          })
          .filter(Boolean) as Array<{ id: string; audit: LinkAudit }>;

        if (auditedItems.length > 0) {
          const worst = auditedItems.reduce((current, item) => {
            const currentRank = labelPriority[current.audit.label] ?? 3;
            const itemRank = labelPriority[item.audit.label] ?? 3;
            if (itemRank !== currentRank) return itemRank < currentRank ? item : current;
            const currentScore = current.audit.score ?? 0;
            const itemScore = item.audit.score ?? 0;
            return itemScore < currentScore ? item : current;
          });
          worstOccurrenceId = worst.id;
          worstAudit = worst.audit;
        }

        const color = getEdgeColor(label === "NA" ? null : label);
        const totalCount = ids.length;
        const baseWidth = label === "WEAK" ? 1.8 : label === "OK" ? 1.4 : label === "STRONG" ? 1.1 : 0.9;
        const countBoost = Math.min(1.6, Math.max(0, (totalCount - 1) * 0.2));
        const strokeWidth = baseWidth + countBoost;

        let opacity = 1;
        const isSelected = selectedEdgeId === `${edge.id}-${label}`;
        if (selectedNodeId || selectedEdgeId) {
          if (isSelected) opacity = 1;
          else if (edge.source_post_id === selectedNodeId || edge.target_post_id === selectedNodeId) opacity = 1;
          else opacity = 0.15;
        }

        const offset = (index - (activeLabels.length - 1) / 2) * offsetStep;

        const edgeId = `${edge.id}-${label}`;
        ids.forEach((id) => occurrenceToEdgeId.set(id, edgeId));

        resultEdges.push({
          id: edgeId,
          source: edge.source_post_id,
          target: edge.target_post_id,
          type: "orthogonal",
          sourceHandle,
          targetHandle,
          data: {
            offset,
            occurrenceIds: ids,
            worstOccurrenceId,
            worstLabel: label === "NA" ? null : label,
            worstScore: worstAudit?.score ?? 0,
            countsByLabel,
            totalCount,
            sourcePostId: edge.source_post_id,
            targetPostId: edge.target_post_id,
          },
          style: {
            stroke: color,
            strokeWidth: isSelected ? strokeWidth + 0.6 : strokeWidth,
            opacity,
            zIndex: isSelected ? 20 : 10,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        });
      });
    });

    return { edges: resultEdges, hiddenEdgeCounts, occurrenceToEdgeId };
  }, [filteredPosts, normalizedLinkEdges, layers, auditsMap, selectedEdgeId, selectedNodeId]);


  useEffect(() => {
    const totalEdges = edges.length;
    const edgesWithOccurrenceIds = edges.filter((edge) => {
      const ids = (edge as any)?.data?.occurrenceIds;
      return Array.isArray(ids) && ids.length > 0;
    }).length;
    const edgesWithAudits = edges.filter((edge) => Boolean((edge as any)?.data?.worstLabel)).length;
    const auditsCount = auditsMap.size;
    const sampleAuditOccurrenceIds = Array.from(auditsMap.keys()).slice(0, 5);
    const edgesByLabel = edges.reduce<Record<string, number>>((acc, edge) => {
      const label = (edge as any)?.data?.worstLabel ?? "NA";
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
    const sampleEdges = edges.slice(0, 3).map((edge) => ({
      id: edge.id,
      occurrenceIds: (edge as any)?.data?.occurrenceIds?.slice(0, 3) ?? [],
      worstOccurrenceId: (edge as any)?.data?.worstOccurrenceId ?? null,
    }));
    const joinedAuditsCount = (linkOccurrences || []).filter((occ) => auditsMap.has(String(occ.id ?? ""))).length;
    console.log("[SILO-GRAPH] edges:", {
      totalEdges,
      edgesWithOccurrenceIds,
      edgesWithAudits,
      edgesByLabel,
      auditsCount,
      joinedEdgesWithAudit: edgesWithAudits,
      sampleAuditOccurrenceIds,
      joinedAuditsCount,
      sampleEdges,
      linkOccurrences: linkOccurrences?.length || 0,
      linkAudits: linkAuditsState?.length || 0,
    });
  }, [edges, linkOccurrences, auditsMap, linkAuditsState]);

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    setSelectedEdgeId(null);
    setSelectedOccurrenceId(null);
    setSelectedOccurrenceFallback(null);
    if (node.id !== selectedNodeId) setShowPanel(true);
  };
  const handleEdgeClick = (_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    const occId = (edge.data as any)?.worstOccurrenceId ?? (edge.data as any)?.occurrenceId ?? null;
    setSelectedOccurrenceId(occId);
    const fallback = (linkOccurrences || []).find((occ) => String(occ.id ?? "") === String(occId ?? ""));
    setSelectedOccurrenceFallback(fallback ?? null);
    setShowPanel(true);
  };
  const handleAudit = () => {
    startAudit(async () => {
      const res = await auditSiloAction({
        siloId: silo.id,
        siloSlug: silo.slug,
        force: false
      });

      console.log("[SILO-AUDIT] response:", res);

      if (res?.linkAudits) {
        setAuditsByOccurrenceIdState(buildAuditMap(res.linkAudits));
      }
      if (res?.siloAudit) {
        setSiloAuditState(res.siloAudit);
      }

      if (res?.aiStatus === 'failed') {
        // Toast nativo simples
        alert("Auditoria completa, mas a IA estava indisponível. Resultados baseados em regras padrão.");
      }
    });
  };

  const orphanCount = posts.filter(p => !metricsMap.get(p.id)?.inboundWithinSilo && !metricsMap.get(p.id)?.outboundWithinSilo).length;
  const siloSummary = useMemo(() => {
    const raw = siloAuditState?.summary;
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw as any;
  }, [siloAuditState]);
  const readyForPublish = useMemo(() => {
    const weak = linkAuditsState.filter((a: any) => a.label === "WEAK").length;
    const ok = linkAuditsState.filter((a: any) => a.label === "OK").length;
    const supportsMissing = siloSummary?.supports_without_pillar_count ?? 0;
    return linkAuditsState.length > 0 && weak === 0 && ok === 0 && supportsMissing === 0;
  }, [linkAuditsState, siloSummary]);

  return (
    <div className="relative space-y-4">
      {/* Barra de Ferramentas */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-(--border) bg-white p-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filterOrphans} onChange={(e) => setFilterOrphans(e.target.checked)} className="h-4 w-4 rounded" />
          <span>Ocultar órfãos ({orphanCount})</span>
        </label>

        <div className="ml-auto flex items-center gap-2">
          {siloAuditState ? (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${siloAuditState.health_score > 75 ? 'text-green-600' : siloAuditState.health_score > 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                Saúde: {siloAuditState.health_score}%
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${readyForPublish ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                {readyForPublish ? "Pronto para publicar" : "Pendencias"}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-500 italic">Sem auditoria</span>
          )}

          <button
            onClick={handleAudit}
            disabled={isAuditing}
            className="rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {isAuditing ? "Auditando..." : "Auditar Silo"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative h-[650px] w-full rounded-2xl border border-(--border) bg-[#F8F9FA] overflow-hidden">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            fitView
            attributionPosition="bottom-right"
            minZoom={0.1}
            maxZoom={1.5}
          >
            <Background color="#E2E8F0" gap={20} size={1} />
            <Controls className="bg-white border shadow-sm" />
          </ReactFlow>
        </ReactFlowProvider>

        {showPanel && (
          <SiloInspectorPanel
            siloName={silo.name}
            posts={posts}
            metrics={metrics}
            linkOccurrences={linkOccurrences}
            linkAudits={linkAuditsState}
            auditsByOccurrenceId={auditsByOccurrenceIdState}
            siloAudit={siloAuditState}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            selectedOccurrenceId={selectedOccurrenceId}
            selectedOccurrenceFallback={selectedOccurrenceFallback}
            hiddenEdgeCounts={hiddenEdgeCounts}
            onClose={() => setShowPanel(false)}
            onSelectNode={setSelectedNodeId}
            onSelectOccurrence={(occurrenceId) => {
              setSelectedOccurrenceId(occurrenceId);
              const nextEdgeId = occurrenceId ? occurrenceToEdgeId.get(String(occurrenceId)) ?? null : null;
              setSelectedEdgeId(nextEdgeId);
              setSelectedNodeId(null);
              setShowPanel(true);
              const fallback = (linkOccurrences || []).find((occ) => String(occ.id ?? "") === String(occurrenceId ?? ""));
              setSelectedOccurrenceFallback(fallback ?? null);
            }}
          />
        )}
      </div>
    </div>
  );
}
