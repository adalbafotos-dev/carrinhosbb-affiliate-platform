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
  return "bg-[color:var(--surface-muted)] text-[color:var(--text)] border-[color:var(--border)]";
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
          className="inline-flex items-center gap-1 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-[11px] font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface-muted)]"
        >
          <ArrowLeft size={14} />
          Admin
        </Link>
        <div className="flex items-center gap-1 text-[11px] text-[color:var(--muted-2)]">
          {breadcrumb.map((item, index) => (
            <span key={item.label} className="flex items-center gap-1">
              {index > 0 ? <span className="text-[color:var(--muted-2)]">/</span> : null}
              {item.href ? (
                <Link href={item.href} className="hover:text-[color:var(--text)]">
                  {item.label}
                </Link>
              ) : (
                <span className="text-[color:var(--text)] font-semibold">{item.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${statusTone(status)}`}>
          {status === "draft" && "Rascunho"}
          {status === "review" && "Revisao"}
          {status === "scheduled" && "Agendado"}
          {status === "published" && "Publicado"}
        </span>
        {saving ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--muted-2)]">
            <Loader2 size={12} className="animate-spin" />
            Salvando...
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--muted-2)]">
            <MonitorSmartphone size={12} />
            Pronto
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1">
          <button
            type="button"
            onClick={() => onPreviewChange("desktop")}
            className={`rounded-full p-1 ${
              previewMode === "desktop"
                ? "bg-[color:var(--brand-accent)] text-[color:var(--paper)]"
                : "text-[color:var(--muted-2)]"
            }`}
            title="Desktop"
          >
            <Laptop size={16} />
          </button>
          <button
            type="button"
            onClick={() => onPreviewChange("mobile")}
            className={`rounded-full p-1 ${
              previewMode === "mobile"
                ? "bg-[color:var(--brand-accent)] text-[color:var(--paper)]"
                : "text-[color:var(--muted-2)]"
            }`}
            title="Mobile"
          >
            <Smartphone size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={onSave}
          className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text)] hover:bg-[color:var(--surface-muted)]"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="rounded-md bg-[color:var(--brand-hot)] px-4 py-2 text-xs font-semibold text-[color:var(--paper)] hover:bg-[color:var(--brand-accent)]"
        >
          Publicar
        </button>
        {rightExtra}
      </div>
    </div>
  );
}

