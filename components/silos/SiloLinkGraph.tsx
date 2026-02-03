"use client";

import { useMemo } from "react";
import ReactFlow, { Background, Controls, type Edge, type Node, type NodeProps } from "reactflow";
import "reactflow/dist/style.css";
import type { SiloMetrics } from "@/lib/seo/buildSiloMetrics";
import type { SiloPostSummary } from "@/components/silos/SiloIntelligenceTabs";

type SiloLinkGraphProps = {
  siloName: string;
  posts: SiloPostSummary[];
  metrics: SiloMetrics;
};

type GraphNodeData = {
  label: string;
  status?: string | null;
  size: number;
  metrics?: {
    internal: number;
    external: number;
    amazon: number;
    nofollow: number;
    sponsored: number;
    inbound: number;
    outbound: number;
  };
  href?: string;
  isSilo?: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#64748B",
  review: "#F59E0B",
  scheduled: "#0EA5E9",
  published: "#10B981",
};

function GraphNode({ data }: NodeProps<GraphNodeData>) {
  const baseColor = data.isSilo ? "#7C3AED" : STATUS_COLORS[data.status || "draft"] || "#64748B";
  return (
    <div className="group relative flex items-center justify-center" style={{ width: data.size, height: data.size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full border-2 text-center text-[11px] font-semibold text-white shadow-sm"
        style={{ background: baseColor, borderColor: "#ffffff55" }}
      >
        <span className="px-1 leading-tight line-clamp-2">{data.label}</span>
      </div>
      {data.metrics ? (
        <div className="pointer-events-none absolute top-full z-10 hidden min-w-[180px] translate-y-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-2 text-[10px] text-[color:var(--text)] shadow-md group-hover:block">
          <div className="font-semibold">{data.label}</div>
          <div className="mt-1 space-y-0.5 text-[color:var(--muted)]">
            <div>Internos: {data.metrics.internal}</div>
            <div>Externos: {data.metrics.external}</div>
            <div>Amazon: {data.metrics.amazon}</div>
            <div>Nofollow: {data.metrics.nofollow}</div>
            <div>Sponsored: {data.metrics.sponsored}</div>
            <div>Inbound silo: {data.metrics.inbound}</div>
            <div>Outbound silo: {data.metrics.outbound}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SiloLinkGraph({ siloName, posts, metrics }: SiloLinkGraphProps) {
  const metricsMap = useMemo(() => new Map(metrics.perPostMetrics.map((metric) => [metric.postId, metric])), [metrics]);

  const nodes = useMemo<Node<GraphNodeData>[]>(() => {
    const radius = 220;
    const nodesList: Node<GraphNodeData>[] = [];
    const count = posts.length || 1;

    nodesList.push({
      id: "silo",
      position: { x: 0, y: 0 },
      data: {
        label: siloName,
        size: 90,
        isSilo: true,
      },
      type: "siloNode",
    });

    posts.forEach((post, index) => {
      const metric = metricsMap.get(post.id);
      const inbound = metric?.inboundWithinSilo ?? 0;
      const size = Math.min(90, 52 + inbound * 6);
      const angle = (2 * Math.PI * index) / count;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      nodesList.push({
        id: post.id,
        position: { x, y },
        data: {
          label: post.title,
          status: post.status ?? "draft",
          size,
          metrics: metric
            ? {
              internal: metric.internalLinks,
              external: metric.externalLinks,
              amazon: metric.amazonLinks,
              nofollow: metric.nofollow,
              sponsored: metric.sponsored,
              inbound: metric.inboundWithinSilo,
              outbound: metric.outboundWithinSilo,
            }
            : undefined,
          href: `/admin/editor/${post.id}`,
        },
        type: "postNode",
      });
    });

    return nodesList;
  }, [posts, metricsMap, siloName]);

  const edges = useMemo<Edge[]>(() => {
    const items: Edge[] = [];
    posts.forEach((post) => {
      items.push({
        id: `silo-${post.id}`,
        source: "silo",
        target: post.id,
        type: "smoothstep",
        style: { stroke: "#94A3B8" },
      });
    });

    metrics.adjacency.forEach((edge) => {
      items.push({
        id: `edge-${edge.sourceId}-${edge.targetId}`,
        source: edge.sourceId,
        target: edge.targetId,
        label: edge.count > 1 ? String(edge.count) : undefined,
        type: "smoothstep",
        style: { stroke: "#F97316" },
      });
    });

    return items;
  }, [metrics.adjacency, posts]);

  const handleNodeClick = (_: any, node: Node<GraphNodeData>) => {
    if (node.data?.href) {
      window.open(node.data.href, "_blank");
    }
  };

  return (
    <div className="h-[560px] w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={{
          postNode: GraphNode,
          siloNode: GraphNode,
        }}
        fitView
        nodesDraggable={false}
        onNodeClick={handleNodeClick}
      >
        <Background gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
