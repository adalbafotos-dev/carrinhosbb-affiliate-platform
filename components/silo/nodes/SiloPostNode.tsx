"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { SiloPostNode as SiloPostNodeData } from "../types";

type Props = {
    data: SiloPostNodeData & { isSelected?: boolean };
};

const roleLabels = {
    PILLAR: "🏛️ Pilar",
    SUPPORT: "🔧 Suporte",
    AUX: "📎 Apoio",
};

const roleColors = {
    PILLAR: "bg-purple-500/10 border-purple-500 text-purple-700",
    SUPPORT: "bg-blue-500/10 border-blue-500 text-blue-700",
    AUX: "bg-gray-500/10 border-gray-500 text-gray-700",
};

export const SiloPostNode = memo(function SiloPostNode({ data }: Props) {
    const roleColor = roleColors[data.role];
    const isSelected = data.isSelected;

    return (
        <div
            className={`min-w-[200px] rounded-lg border-2 bg-white shadow-lg transition-all ${isSelected ? "ring-4 ring-blue-500/50 shadow-2xl" : "hover:shadow-xl"
                } ${roleColor}`}
        >
            <Handle type="target" position={Position.Top} className="!bg-blue-500" />

            <div className="p-4">
                {/* Role Badge */}
                <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-full bg-white/80 px-2 py-1 text-xs font-semibold">
                        {roleLabels[data.role]}
                    </span>
                    <span className="text-xs font-mono text-gray-500">#{data.position}</span>
                </div>

                {/* Title */}
                <h3 className="mb-3 text-sm font-bold text-gray-900 line-clamp-2">{data.title}</h3>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span title="Links de saída">
                        →&nbsp;<strong>{data.outCount}</strong>
                    </span>
                    <span title="Links de entrada">
                        ←&nbsp;<strong>{data.inCount}</strong>
                    </span>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
        </div>
    );
});
