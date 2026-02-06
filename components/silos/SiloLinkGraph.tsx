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
import type { LinkOccurrence, LinkAudit, SiloAudit } from "@/lib/silo/types";
import { SiloInspectorPanel } from "@/components/silos/SiloInspectorPanel";
import { auditSiloAction } from "@/app/actions/audit-silo";

// Props atualizadas para receber objeto Silo completo
type SiloLinkGraphProps = {
  silo: { id: string; name: string; slug: string };
  posts: SiloPostSummary[];
  metrics: SiloMetrics;
  linkOccurrences?: LinkOccurrence[];
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

type AggregatedEdgeCandidate = {
  id: string;
  sourceId: string;
  targetId: string;
  label: "STRONG" | "OK" | "WEAK";
  representativeOccurrenceId: string;
  representativeOccurrence?: LinkOccurrence | null;
  representativeAudit: LinkAudit | null;
  countsByLabel: { strong: number; ok: number; weak: number };
  totalCount: number;
  score: number;
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
  if (sourceY < targetY - 40) {
    // DESCENDO
    const midY = (sourceY + targetY) / 2;
    path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;
  } else if (sourceY > targetY + 40) {
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

export function SiloLinkGraph({ silo, posts, metrics, linkOccurrences, linkAudits, siloAudit }: SiloLinkGraphProps) {
  const [filterOrphans, setFilterOrphans] = useState(false);
  const [highlightPillar, setHighlightPillar] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [selectedOccurrenceFallback, setSelectedOccurrenceFallback] = useState<LinkOccurrence | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [linkAuditsState, setLinkAuditsState] = useState<LinkAudit[]>(linkAudits || []);
  const [siloAuditState, setSiloAuditState] = useState<SiloAudit | null>(siloAudit || null);

  const [isAuditing, startAudit] = useTransition();

  const nodeTypes = useMemo(() => ({ postCard: PostCard }), []);
  const edgeTypes = useMemo(() => ({ orthogonal: OrthogonalMultiEdge }), []);

  const metricsMap = useMemo(() => new Map(metrics.perPostMetrics.map((metric) => [metric.postId, metric])), [metrics]);
  const { layers, pillarId } = useMemo(() => calculateHierarchicalLayout(posts, metrics.adjacency, metricsMap), [posts, metrics.adjacency, metricsMap]);
  const auditsMap = useMemo(() => {
    return new Map(
      (linkAuditsState || []).map((audit: any) => {
        const key = String(audit.occurrence_id ?? audit.occurrenceId ?? "");
        return [key, audit];
      })
    );
  }, [linkAuditsState]);

  useEffect(() => {
    setLinkAuditsState(linkAudits || []);
  }, [linkAudits]);

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

  const nodes = useMemo<Node<PostCardData>[]>(() => {
    const layerGroups = new Map<number, string[]>();
    filteredPosts.forEach((post) => {
      const layer = layers.get(post.id) ?? 0;
      if (!layerGroups.has(layer)) layerGroups.set(layer, []);
      layerGroups.get(layer)!.push(post.id);
    });

    const nodesList: Node<PostCardData>[] = [];
    const layerHeight = 160; // REDUZIDO: Compacto
    const nodeWidth = 320;

    layerGroups.forEach((postIds, layer) => {
      const count = postIds.length;
      postIds.forEach((postId, index) => {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        const metric = metricsMap.get(postId);
        const x = (index - (count - 1) / 2) * nodeWidth;
        const y = layer * layerHeight;

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

  const { edges, hiddenEdgeCounts } = useMemo(() => {
    const postIdSet = new Set(filteredPosts.map((p) => p.id));
    const resultEdges: Edge[] = [];

    const candidates: AggregatedEdgeCandidate[] = [];

    if (!linkOccurrences || linkOccurrences.length === 0) {
      metrics.adjacency.forEach((adj) => {
        if (!postIdSet.has(adj.sourceId) || !postIdSet.has(adj.targetId)) return;
        const repId = `virtual-${adj.sourceId}-${adj.targetId}`;
        candidates.push({
          id: repId,
          sourceId: adj.sourceId,
          targetId: adj.targetId,
          label: "OK",
          representativeOccurrenceId: repId,
          representativeAudit: null,
          countsByLabel: { strong: 0, ok: 0, weak: 0 },
          totalCount: adj.count || 1,
          score: 0,
        });
      });
    } else {
      const groupMap = new Map<string, {
        sourceId: string;
        targetId: string;
        strong: Array<{ occurrenceId: string; occurrence: LinkOccurrence; audit: LinkAudit | null; score: number }>;
        ok: Array<{ occurrenceId: string; occurrence: LinkOccurrence; audit: LinkAudit | null; score: number }>;
        weak: Array<{ occurrenceId: string; occurrence: LinkOccurrence; audit: LinkAudit | null; score: number }>;
        totalCount: number;
        fallbackOccurrenceId: string;
        fallbackOccurrence?: LinkOccurrence | null;
      }>();

      linkOccurrences.forEach((occ) => {
        if (!occ.target_post_id) return;
        if (!postIdSet.has(occ.source_post_id) || !postIdSet.has(occ.target_post_id)) return;
        const occId = occ.id ? String(occ.id) : "";
        const audit = auditsMap.get(occId) ?? null;
        const label = audit?.label;
        const score = audit?.score ?? 0;
        const key = `${occ.source_post_id}::${occ.target_post_id}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            sourceId: occ.source_post_id,
            targetId: occ.target_post_id,
            strong: [],
            ok: [],
            weak: [],
            totalCount: 0,
            fallbackOccurrenceId: occId,
            fallbackOccurrence: occ,
          });
        }
        const group = groupMap.get(key)!;
        group.totalCount += 1;
        if (!group.fallbackOccurrenceId) {
          group.fallbackOccurrenceId = occId;
          group.fallbackOccurrence = occ;
        }
        if (label === "STRONG") group.strong.push({ occurrenceId: occId, occurrence: occ, audit, score });
        else if (label === "OK") group.ok.push({ occurrenceId: occId, occurrence: occ, audit, score });
        else if (label === "WEAK") group.weak.push({ occurrenceId: occId, occurrence: occ, audit, score });
      });

      const pickRepresentative = (
        list: Array<{ occurrenceId: string; occurrence: LinkOccurrence; audit: LinkAudit | null; score: number }>,
        label: "STRONG" | "OK" | "WEAK"
      ) => {
        if (!list.length) return null;
        if (label === "WEAK") {
          return list.reduce((best, item) => (item.score < best.score ? item : best));
        }
        if (label === "STRONG") {
          return list.reduce((best, item) => (item.score > best.score ? item : best));
        }
        // OK: score mais próximo de 60 (neutro)
        return list.reduce((best, item) =>
          Math.abs(item.score - 60) < Math.abs(best.score - 60) ? item : best
        );
      };

      groupMap.forEach((group) => {
        const countsByLabel = {
          strong: group.strong.length,
          ok: group.ok.length,
          weak: group.weak.length,
        };
        const totalCount = group.totalCount;

        (['WEAK', 'OK', 'STRONG'] as const).forEach((label) => {
          const list = label === "WEAK" ? group.weak : label === "OK" ? group.ok : group.strong;
          const rep = pickRepresentative(list, label);
          if (!rep) return;
          candidates.push({
            id: `occ_${rep.occurrenceId}`,
            sourceId: group.sourceId,
            targetId: group.targetId,
            label,
            representativeOccurrenceId: rep.occurrenceId,
            representativeOccurrence: rep.occurrence,
            representativeAudit: rep.audit,
            countsByLabel,
            totalCount,
            score: rep.score,
          });
        });

        if (countsByLabel.strong + countsByLabel.ok + countsByLabel.weak === 0 && group.fallbackOccurrenceId) {
          candidates.push({
            id: `occ_${group.fallbackOccurrenceId}`,
            sourceId: group.sourceId,
            targetId: group.targetId,
            label: "OK",
            representativeOccurrenceId: group.fallbackOccurrenceId,
            representativeOccurrence: group.fallbackOccurrence ?? null,
            representativeAudit: null,
            countsByLabel,
            totalCount,
            score: 0,
          });
        }
      });
    }

    const priorityRank: Record<string, number> = { WEAK: 0, OK: 1, STRONG: 2 };
    const sortEdges = (a: AggregatedEdgeCandidate, b: AggregatedEdgeCandidate) => {
      const rankDiff = (priorityRank[a.label] ?? 3) - (priorityRank[b.label] ?? 3);
      if (rankDiff !== 0) return rankDiff;
      if (a.score !== b.score) return a.score - b.score;
      return b.totalCount - a.totalCount;
    };

    const outgoingVisible = new Set<string>(candidates.map((edge) => edge.id));
    const incomingVisible = new Set<string>(candidates.map((edge) => edge.id));
    const hiddenEdgeCounts = new Map<string, { outgoingHidden: number; incomingHidden: number }>();

    const getEdgeColor = (label?: string, audit?: LinkAudit | null) => {
      const resolved = audit?.label ?? label;
      if (resolved === "STRONG") return "#10B981";
      if (resolved === "OK") return "#F59E0B";
      if (resolved === "WEAK") return "#EF4444";
      return "#94A3B8";
    };

    const LANE_WIDTH = 8;

    const groups = new Map<string, AggregatedEdgeCandidate[]>();
    candidates.forEach((edge) => {
      const key = `${edge.sourceId}::${edge.targetId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(edge);
    });

    groups.forEach((edges, key) => {
      const [sourceId, targetId] = key.split("::");
      const visibleEdges = edges
        .filter((edge) => outgoingVisible.has(edge.id) && incomingVisible.has(edge.id))
        .sort(sortEdges);
      const totalLanes = visibleEdges.length;
      const sourceLayer = layers.get(sourceId) || 0;
      const targetLayer = layers.get(targetId) || 0;

      let sourceHandle = "bottom-source";
      let targetHandle = "top-target";
      if (sourceLayer > targetLayer) { sourceHandle = "top-source"; targetHandle = "bottom-target"; }
      else if (sourceLayer === targetLayer) { sourceHandle = "bottom-source"; targetHandle = "bottom-target"; }

      visibleEdges.forEach((edge, index) => {
        const p = index - (totalLanes - 1) / 2;
        const offset = p * LANE_WIDTH;
        const color = getEdgeColor(edge.label, edge.representativeAudit);
        const isSelected = selectedEdgeId === edge.id;
        const baseWidth = edge.label === "WEAK" ? 3.5 : edge.label === "OK" ? 2.5 : 1.5;
        const countBoost = Math.min(3, Math.max(0, (edge.totalCount - 1) * 0.4));
        const strokeWidth = baseWidth + countBoost;

        let opacity = 1;
        if (selectedNodeId || selectedEdgeId) {
          if (isSelected) opacity = 1;
          else if (sourceId === selectedNodeId || targetId === selectedNodeId) opacity = 1;
          else opacity = 0.15;
        }

        resultEdges.push({
          id: edge.id,
          source: sourceId,
          target: targetId,
          type: "orthogonal",
          sourceHandle,
          targetHandle,
          data: {
            offset,
            laneIndex: index,
            totalLanes,
            occurrenceId: edge.representativeOccurrenceId,
            occurrence: edge.representativeOccurrence ?? null,
            audit: edge.representativeAudit,
            label: edge.label,
            score: edge.representativeAudit?.score ?? edge.score,
            reasons: edge.representativeAudit?.reasons ?? [],
            suggestedAnchor: edge.representativeAudit?.suggested_anchor,
            spamRisk: edge.representativeAudit?.spam_risk,
            action: edge.representativeAudit?.action,
            recommendation: edge.representativeAudit?.recommendation,
            countsByLabel: edge.countsByLabel,
            totalCount: edge.totalCount,
            sourcePostId: edge.sourceId,
            targetPostId: edge.targetId,
          },
          style: {
            stroke: color,
            strokeWidth: isSelected ? strokeWidth + 1 : strokeWidth,
            opacity,
            zIndex: isSelected ? 20 : 10,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        });
      });
    });

    return { edges: resultEdges, hiddenEdgeCounts };
  }, [filteredPosts, linkOccurrences, metrics.adjacency, layers, auditsMap, selectedEdgeId, selectedNodeId]);

  useEffect(() => {
    const totalEdges = edges.length;
    const edgesWithOccurrenceId = edges.filter((edge) => (edge as any)?.data?.occurrenceId).length;
    const joinedAuditsCount = (linkOccurrences || []).filter((occ) => auditsMap.has(String(occ.id ?? ""))).length;
    console.log("[SILO-GRAPH] edges:", {
      totalEdges,
      edgesWithOccurrenceId,
      joinedAuditsCount,
      linkOccurrences: linkOccurrences?.length || 0,
      linkAudits: linkAuditsState?.length || 0,
    });
  }, [edges, linkOccurrences, auditsMap, linkAuditsState]);

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
    setSelectedOccurrenceId(null);
    setSelectedOccurrenceFallback(null);
    if (node.id !== selectedNodeId) setShowPanel(true);
  };
  const handleEdgeClick = (_: any, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    const occId = (edge.data as any)?.occurrenceId || (edge.id.startsWith("occ_") ? edge.id.substring(4) : null);
    setSelectedOccurrenceId(occId);
    setSelectedOccurrenceFallback(((edge.data as any)?.occurrence as LinkOccurrence | null) ?? null);
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
        setLinkAuditsState(res.linkAudits);
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

  const edgeIdSet = useMemo(() => new Set(edges.map((edge) => edge.id)), [edges]);

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
            siloAudit={siloAuditState}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId ? (selectedEdgeId.startsWith('occ_') ? selectedEdgeId.substring(4) : selectedEdgeId) : null}
            selectedOccurrenceId={selectedOccurrenceId}
            selectedOccurrenceFallback={selectedOccurrenceFallback}
            hiddenEdgeCounts={hiddenEdgeCounts}
            onClose={() => setShowPanel(false)}
            onSelectNode={setSelectedNodeId}
            onSelectOccurrence={(occurrenceId) => {
              setSelectedOccurrenceId(occurrenceId);
              const nextEdgeId = occurrenceId ? `occ_${occurrenceId}` : null;
              setSelectedEdgeId(nextEdgeId && edgeIdSet.has(nextEdgeId) ? nextEdgeId : null);
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
