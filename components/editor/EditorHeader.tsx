"use client";

import Link from "next/link";
import { ArrowLeft, Laptop, MonitorSmartphone, Smartphone, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  breadcrumb: Array<{ label: string; href?: string }>;
  status: "draft" | "review" | "scheduled" | "published";
  saving?: boolean;
  previewMode: "desktop" | "mobile";
  onPreviewChange: (mode: "desktop" | "mobile") => void;
  onSave: () => void;
  onPublish: () => void;
  rightExtra?: ReactNode;
};

function statusTone(status: Props["status"]) {
  if (status === "published") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "scheduled") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "review") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

export function EditorHeader({
  breadcrumb,
  status,
  saving = false,
  previewMode,
  onPreviewChange,
  onSave,
  onPublish,
  rightExtra,
}: Props) {
  return (
    <div className="flex h-[60px] items-center gap-4">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          <ArrowLeft size={14} />
          Admin
        </Link>
        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
          {breadcrumb.map((item, index) => (
            <span key={item.label} className="flex items-center gap-1">
              {index > 0 ? <span className="text-zinc-400">/</span> : null}
              {item.href ? (
                <Link href={item.href} className="hover:text-zinc-800">
                  {item.label}
                </Link>
              ) : (
                <span className="text-zinc-800 font-semibold">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${statusTone(status)}`}>
          {status === "draft" && "Rascunho"}
          {status === "review" && "Revisao"}
          {status === "scheduled" && "Agendado"}
          {status === "published" && "Publicado"}
        </span>
        {saving ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <Loader2 size={12} className="animate-spin" />
            Salvando...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <MonitorSmartphone size={12} />
            Pronto
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1">
          <button
            type="button"
            onClick={() => onPreviewChange("desktop")}
            className={`rounded-full p-1 ${previewMode === "desktop" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
            title="Desktop"
          >
            <Laptop size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPreviewChange("mobile")}
            className={`rounded-full p-1 ${previewMode === "mobile" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
            title="Mobile"
          >
            <Smartphone size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
        >
          Publicar
        </button>
        {rightExtra}
      </div>
    </div>
  );
}
