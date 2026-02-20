"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent } from "@tiptap/react";
import Link from "next/link";
import { ArrowLeft, Laptop, Tablet, Smartphone } from "lucide-react";
import { FixedToolbar } from "@/components/editor/FixedToolbar";
import { useEditorContext } from "@/components/editor/EditorContext";

type PreviewMode = "desktop" | "tablet" | "mobile";

function formatRelativeTime(value?: Date | null) {
  if (!value) return "Sem salvamento recente";
  const diff = Date.now() - value.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes <= 0) return "Salvo agora";
  if (minutes === 1) return "Salvo ha 1 min";
  return `Salvo ha ${minutes} min`;
}

function parseHiddenColumns(raw: string | null) {
  if (!raw) return new Set<number>();
  const values = raw
    .split(/[\s,;|]+/)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0);
  return new Set(values);
}

function parsePositiveInt(raw: string | null) {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function findHeaderLabels(table: HTMLTableElement) {
  const explicitHeaderRow = table.tHead?.rows?.[0] ?? null;
  const fallbackHeaderRow = explicitHeaderRow
    ? null
    : Array.from(table.rows).find((row) =>
        Array.from(row.cells).some((cell) => cell.tagName.toLowerCase() === "th")
      ) ?? null;
  const headerRow = explicitHeaderRow ?? fallbackHeaderRow;
  if (!headerRow) return { labels: [] as string[], headerRow: null as HTMLTableRowElement | null };
  const labels = Array.from(headerRow.cells).map((cell, index) => {
    const text = (cell.textContent || "").replace(/\s+/g, " ").trim();
    return text || `Coluna ${index + 1}`;
  });
  return { labels, headerRow };
}

function setFlag(el: Element, attr: string, enabled: boolean) {
  if (enabled) {
    el.setAttribute(attr, "true");
    return;
  }
  el.removeAttribute(attr);
}

function enhanceResponsiveTablePreview(table: HTMLTableElement, mode: PreviewMode) {
  const { labels, headerRow } = findHeaderLabels(table);
  const allRows = table.tBodies.length
    ? Array.from(table.tBodies).flatMap((tbody) => Array.from(tbody.rows))
    : Array.from(table.rows).filter((row) => row !== headerRow);

  const hiddenDesktop = parseHiddenColumns(table.getAttribute("data-hidden-columns"));
  const hiddenTablet = parseHiddenColumns(
    table.getAttribute("data-hidden-columns-tablet") || table.getAttribute("data-hidden-columns")
  );
  const hiddenMobile = parseHiddenColumns(
    table.getAttribute("data-hidden-columns-mobile") ||
      table.getAttribute("data-hidden-columns-tablet") ||
      table.getAttribute("data-hidden-columns")
  );
  const keyDesktop = parsePositiveInt(table.getAttribute("data-stack-key-column"));
  const keyTablet =
    parsePositiveInt(table.getAttribute("data-stack-key-column-tablet")) ??
    parsePositiveInt(table.getAttribute("data-stack-key-column"));
  const keyMobile =
    parsePositiveInt(table.getAttribute("data-stack-key-column-mobile")) ??
    parsePositiveInt(table.getAttribute("data-stack-key-column-tablet")) ??
    parsePositiveInt(table.getAttribute("data-stack-key-column"));

  const activeKey = mode === "mobile" ? keyMobile : mode === "tablet" ? keyTablet : keyDesktop;
  const activeHidden = mode === "mobile" ? hiddenMobile : mode === "tablet" ? hiddenTablet : hiddenDesktop;

  allRows.forEach((row) => {
    const cells = Array.from(row.cells);
    let stackTitle = "";

    cells.forEach((cell, index) => {
      const col = index + 1;
      const isTd = cell.tagName.toLowerCase() === "td";
      const label = labels[index] || `Coluna ${col}`;
      cell.setAttribute("data-col-index", String(col));
      if (isTd) {
        cell.setAttribute("data-label", label);
      }

      const hasImage = Boolean(cell.querySelector("img"));
      const hasCta = Boolean(
        cell.querySelector(
          '[data-type="cta-button"], .cta-button, [data-type="affiliate-cta"], a[rel*="sponsored"], a[href*="amazon."], a[href*="a.co"], a[href*="amzn.to"]'
        )
      );
      const kind = hasCta ? "cta" : hasImage ? "media" : "text";
      if (isTd) {
        cell.setAttribute("data-cell-kind", kind);
      }

      setFlag(cell, "data-key-desktop", keyDesktop === col);
      setFlag(cell, "data-key-tablet", keyTablet === col);
      setFlag(cell, "data-key-mobile", keyMobile === col);
      setFlag(cell, "data-hidden-desktop", hiddenDesktop.has(col));
      setFlag(cell, "data-hidden-tablet", hiddenTablet.has(col));
      setFlag(cell, "data-hidden-mobile", hiddenMobile.has(col));
      setFlag(cell, "data-hidden-active", activeHidden.has(col));

      if (activeKey === col) {
        const candidateTitle = (cell.textContent || "").replace(/\s+/g, " ").trim();
        if (candidateTitle) stackTitle = candidateTitle;
      }
    });

    if (stackTitle) {
      row.setAttribute("data-stack-title", stackTitle);
    } else {
      row.removeAttribute("data-stack-title");
    }
  });
}

export function EditorCanvas() {
  const {
    editor,
    postId,
    onOpenLinkDialog,
    onOpenMedia,
    onInsertProduct,
    onInsertYoutube,
    onInsertTable,
    onInsertCallout,
    onInsertFaq,
    onInsertIconBlock,
    onInsertCarouselBlock,
    onAlignImage,
    onUpdateImageResponsive,
    onUpdateImageVisibility,
    onResetImageResponsive,
    onClearImageResponsive,
    onSetTableRenderMode,
    onApplyTableMobileSlide,
    onApplyTableMobileCards,
    onResetTableRenderMode,
    onUpdateTableResponsive,
    onUpdateTableVisibility,
    onResetTableResponsive,
    onClearTableResponsive,
    onMoveBlockUp,
    onMoveBlockDown,
    saving,
    lastSavedAt,
    onSave,
    meta,
    silos,
    previewMode,
    setPreviewMode,
  } = useEditorContext();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const onScroll = () => {
      const max = element.scrollHeight - element.clientHeight;
      setScrollProgress(max > 0 ? element.scrollTop / max : 0);
    };
    onScroll();
    element.addEventListener("scroll", onScroll);
    return () => element.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!editor) return;

    const syncTables = () => {
      const root = scrollRef.current;
      if (!root) return;
      const tables = root.querySelectorAll(".editor-content table");
      tables.forEach((table) => {
        enhanceResponsiveTablePreview(table as HTMLTableElement, previewMode);
      });
    };

    const syncOnNextFrame = () => {
      if (typeof window === "undefined") return;
      window.requestAnimationFrame(syncTables);
    };

    syncOnNextFrame();
    editor.on("transaction", syncOnNextFrame);
    editor.on("selectionUpdate", syncOnNextFrame);

    return () => {
      editor.off("transaction", syncOnNextFrame);
      editor.off("selectionUpdate", syncOnNextFrame);
    };
  }, [editor, previewMode]);

  const savedLabel = useMemo(() => formatRelativeTime(lastSavedAt), [lastSavedAt]);
  const previewPath = useMemo(() => (postId ? `/admin/preview/${postId}` : ""), [postId]);
  const canPreview = Boolean(previewPath);
  const previewWidths: Record<typeof previewMode, number> = {
    desktop: 1200,
    tablet: 768,
    mobile: 390,
  };
  const previewWidth = previewMode === "desktop" ? "100%" : `${previewWidths[previewMode]}px`;

  return (
    <div className="flex h-full flex-1 flex-col bg-(--bg)">
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="sticky top-0 z-30 border-b border-(--border) bg-(--surface)">
          <div className="flex items-center justify-between px-4 py-2 text-[11px] text-(--muted)">
            <div className="flex items-center gap-2">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 rounded-md border border-(--border) bg-(--surface) px-2 py-1 text-[10px] font-semibold text-(--text) hover:bg-(--surface-muted)"
              >
                <ArrowLeft size={12} />
                Voltar ao admin
              </Link>
              <span className="text-(--text)">Editor</span>
              <span className="h-1 w-24 rounded-full bg-(--surface-muted)">
                <span
                  className="block h-1 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, scrollProgress * 100)}%` }}
                />
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-1 rounded-full border border-(--border) bg-(--surface) p-1 md:flex">
                <button
                  type="button"
                  onClick={() => setPreviewMode("desktop")}
                  className={`rounded-full p-1 ${
                    previewMode === "desktop"
                      ? "bg-(--brand-accent) text-(--paper)"
                      : "text-(--muted-2)"
                  }`}
                  title="Desktop"
                >
                  <Laptop size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("tablet")}
                  className={`rounded-full p-1 ${
                    previewMode === "tablet"
                      ? "bg-(--brand-accent) text-(--paper)"
                      : "text-(--muted-2)"
                  }`}
                  title="Tablet"
                >
                  <Tablet size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("mobile")}
                  className={`rounded-full p-1 ${
                    previewMode === "mobile"
                      ? "bg-(--brand-accent) text-(--paper)"
                      : "text-(--muted-2)"
                  }`}
                  title="Mobile"
                >
                  <Smartphone size={14} />
                </button>
              </div>
              <span className="rounded-full border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] uppercase tracking-wide text-(--muted-2)">
                Editando:{" "}
                {previewMode === "desktop"
                  ? "Desktop"
                  : previewMode === "tablet"
                    ? "Tablet (estilos por modo)"
                    : "Mobile (estilos por modo)"}
              </span>
              <span className={saving ? "text-amber-400" : "text-(--muted)"}>
                {saving ? "Salvando..." : savedLabel}
              </span>
              <button
                type="button"
                onClick={() => void onSave()}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canPreview) return;
                  window.open(previewPath, "_blank", "noopener,noreferrer");
                }}
                disabled={!canPreview}
                className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${
                  canPreview
                    ? "border border-(--border) bg-(--surface) text-(--text) hover:bg-(--surface-muted)"
                    : "border border-transparent bg-(--surface-muted) text-(--muted-2)"
                }`}
                title={canPreview ? "Abrir preview do rascunho" : "Salve o rascunho para habilitar o preview"}
              >
                Preview
              </button>
            </div>
          </div>
          <FixedToolbar
            editor={editor}
            previewMode={previewMode}
            onOpenLink={onOpenLinkDialog}
            onOpenMedia={onOpenMedia}
            onInsertProduct={onInsertProduct}
            onInsertYoutube={onInsertYoutube}
            onInsertTable={onInsertTable}
            onInsertCallout={onInsertCallout}
            onInsertFaq={onInsertFaq}
            onInsertIconBlock={onInsertIconBlock}
            onInsertCarouselBlock={onInsertCarouselBlock}
            onAlignImage={onAlignImage}
            onUpdateImageResponsive={onUpdateImageResponsive}
            onUpdateImageVisibility={onUpdateImageVisibility}
            onResetImageResponsive={onResetImageResponsive}
            onClearImageResponsive={onClearImageResponsive}
            onSetTableRenderMode={onSetTableRenderMode}
            onApplyTableMobileSlide={onApplyTableMobileSlide}
            onApplyTableMobileCards={onApplyTableMobileCards}
            onResetTableRenderMode={onResetTableRenderMode}
            onUpdateTableResponsive={onUpdateTableResponsive}
            onUpdateTableVisibility={onUpdateTableVisibility}
            onResetTableResponsive={onResetTableResponsive}
            onClearTableResponsive={onClearTableResponsive}
            onMoveBlockUp={onMoveBlockUp}
            onMoveBlockDown={onMoveBlockDown}
            onPreviewModeChange={setPreviewMode}
          />
        </div>

        <div className="mx-auto w-full px-6 py-6 min-h-screen">
          {editor ? (
            <div
              data-preview-mode={previewMode}
              data-editor-preview="true"
              className={`editor-preview-shell mx-auto w-full ${
                previewMode === "desktop" ? "max-w-5xl" : "rounded-2xl border border-(--border) bg-(--surface) shadow-sm"
              }`}
              style={previewMode === "desktop" ? undefined : { maxWidth: previewWidth }}
            >
              <div className="prose max-w-none p-6">
                <EditorContent editor={editor} className="editor-content" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
