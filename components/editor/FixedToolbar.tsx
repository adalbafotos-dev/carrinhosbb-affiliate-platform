"use client";

import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  MessageCircleQuestion,
  MoveDown,
  MoveUp,
  List,
  ListOrdered,
  Quote,
  Redo2,
  ShoppingCart,
  Strikethrough,
  Table as TableIcon,
  Sparkles,
  Undo2,
  Underline,
  Youtube,
} from "lucide-react";
import { useEffect, useState } from "react";
import ProductDialog from "@/components/editor/ProductDialog";
import CtaButtonDialog from "@/components/editor/CtaButtonDialog";
import { getBpAttrs, normalizeResponsiveMap, resolveDeviceVisibility } from "@/lib/editor/responsive";

type Props = {
  editor: Editor | null;
  previewMode: "desktop" | "tablet" | "mobile";
  onOpenLink: () => void;
  onOpenMedia: () => void;
  onInsertProduct: () => void;
  onInsertYoutube: () => void;
  onInsertTable: () => void;
  onInsertCallout: () => void;
  onInsertFaq: () => void;
  onInsertIconBlock: () => void;
  onInsertCarouselBlock: () => void;
  onAlignImage?: (align: "left" | "center" | "right") => void;
  onUpdateImageResponsive?: (patch: {
    align?: "left" | "center" | "right";
    widthMode?: "full" | "content" | "px";
    maxWidth?: number | null;
    wrap?: "none" | "wrap-left" | "wrap-right";
    spacingY?: "none" | "sm" | "md" | "lg";
  }) => void;
  onUpdateImageVisibility?: (patch: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  }) => void;
  onResetImageResponsive?: (fields?: Array<"align" | "widthMode" | "maxWidth" | "wrap" | "spacingY">) => void;
  onClearImageResponsive?: (fields?: Array<"align" | "widthMode" | "maxWidth" | "wrap" | "spacingY">) => void;
  onSetTableRenderMode?: (mode: "table" | "scroll" | "stack") => void;
  onResetTableRenderMode?: () => void;
  onUpdateTableResponsive?: (patch: {
    renderMode?: "table" | "scroll" | "stack";
    wrapCells?: boolean;
    hiddenColumns?: string;
    columnWidths?: string | number[];
    stackKeyColumn?: number | null;
  }) => void;
  onUpdateTableVisibility?: (patch: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  }) => void;
  onResetTableResponsive?: (
    fields?: Array<"renderMode" | "wrapCells" | "hiddenColumns" | "columnWidths" | "stackKeyColumn">
  ) => void;
  onClearTableResponsive?: (
    fields?: Array<"renderMode" | "wrapCells" | "hiddenColumns" | "columnWidths" | "stackKeyColumn">
  ) => void;
  onMoveBlockUp?: () => void;
  onMoveBlockDown?: () => void;
};

type ClosestNodeMatch = {
  node: any;
  pos: number;
};

function toHiddenColumnsInput(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const tokens = raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => String(item));
  if (!tokens.length) {
    return raw
      .split(/[\s,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  }
  return Array.from(new Set(tokens)).join(", ");
}

function toColumnWidthsInput(value: unknown) {
  if (Array.isArray(value)) {
    const nums = value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => String(Math.round(item * 100) / 100));
    return nums.join(", ");
  }
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const parsed = raw
    .replace(/^\[|\]$/g, "")
    .split(/[\s,;|]+/)
    .map((item) => Number.parseFloat(item))
    .filter((item) => Number.isFinite(item) && item > 0)
    .map((item) => String(Math.round(item * 100) / 100));
  return Array.from(new Set(parsed)).join(", ");
}

function findClosestNodeByType(editor: Editor, nodeTypeName: string): ClosestNodeMatch | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== nodeTypeName) continue;
    const pos = depth > 0 ? $from.before(depth) : 0;
    return { node, pos };
  }
  return null;
}

function findFirstCellTextPosFromTable(tableMatch: ClosestNodeMatch | null) {
  if (!tableMatch) return null;
  let textPos: number | null = null;
  tableMatch.node.descendants((node: any, pos: number) => {
    if (node.type?.name !== "tableCell" && node.type?.name !== "tableHeader") return true;
    textPos = tableMatch.pos + pos + 2;
    return false;
  });
  return textPos;
}

function runTableCommand(editor: Editor, commandName: "addRowAfter" | "deleteRow" | "addColumnAfter" | "deleteColumn") {
  const runByName = (name: "addRowAfter" | "deleteRow" | "addColumnAfter" | "deleteColumn") => {
    const chain = editor.chain().focus();
    if (name === "addRowAfter") return chain.addRowAfter().run();
    if (name === "deleteRow") return chain.deleteRow().run();
    if (name === "addColumnAfter") return chain.addColumnAfter().run();
    return chain.deleteColumn().run();
  };

  if (runByName(commandName)) return true;

  const cellMatch = findClosestNodeByType(editor, "tableCell") || findClosestNodeByType(editor, "tableHeader");
  if (cellMatch) {
    if (editor.chain().focus().setTextSelection(cellMatch.pos + 1).run() && runByName(commandName)) {
      return true;
    }
  }

  const tableMatch = findClosestNodeByType(editor, "table");
  const firstCellPos = findFirstCellTextPosFromTable(tableMatch);
  if (firstCellPos !== null) {
    const maxPos = Math.max(1, editor.state.doc.content.size - 1);
    const safePos = Math.max(1, Math.min(firstCellPos, maxPos));
    const tr = editor.state.tr.setSelection(TextSelection.near(editor.state.doc.resolve(safePos)));
    editor.view.dispatch(tr);
    if (runByName(commandName)) return true;
  }

  return false;
}

export function FixedToolbar({
  editor,
  previewMode,
  onOpenLink,
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
  onResetTableRenderMode,
  onUpdateTableResponsive,
  onUpdateTableVisibility,
  onResetTableResponsive,
  onClearTableResponsive,
  onMoveBlockUp,
  onMoveBlockDown,
}: Props) {
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isCtaOpen, setIsCtaOpen] = useState(false);
  const [headingValue, setHeadingValue] = useState<"paragraph" | "h2" | "h3" | "h4">("paragraph");
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [imageAlign, setImageAlign] = useState<"left" | "center" | "right" | null>(null);
  const [imageWidthMode, setImageWidthMode] = useState<"full" | "content" | "px">("content");
  const [imageWrap, setImageWrap] = useState<"none" | "wrap-left" | "wrap-right">("none");
  const [imageSpacingY, setImageSpacingY] = useState<"none" | "sm" | "md" | "lg">("md");
  const [imageMaxWidth, setImageMaxWidth] = useState<number | null>(null);
  const [imageOverrides, setImageOverrides] = useState({
    align: false,
    widthMode: false,
    maxWidth: false,
    wrap: false,
    spacingY: false,
  });
  const [imageVisibility, setImageVisibility] = useState({
    desktop: true,
    tablet: true,
    mobile: true,
  });
  const [isTableSelected, setIsTableSelected] = useState(false);
  const [tableRenderMode, setTableRenderMode] = useState<"table" | "scroll" | "stack">("table");
  const [tableModeOverride, setTableModeOverride] = useState(false);
  const [tableWrapCells, setTableWrapCells] = useState(true);
  const [tableWrapOverride, setTableWrapOverride] = useState(false);
  const [tableHiddenColumns, setTableHiddenColumns] = useState("");
  const [tableHiddenOverride, setTableHiddenOverride] = useState(false);
  const [tableColumnWidths, setTableColumnWidths] = useState("");
  const [tableColumnWidthsOverride, setTableColumnWidthsOverride] = useState(false);
  const [tableStackKeyColumn, setTableStackKeyColumn] = useState("");
  const [tableStackKeyOverride, setTableStackKeyOverride] = useState(false);
  const [tableVisibility, setTableVisibility] = useState({
    desktop: true,
    tablet: true,
    mobile: true,
  });
  const [canMoveUp, setCanMoveUp] = useState(false);
  const [canMoveDown, setCanMoveDown] = useState(false);
  const [globalStructureNotice, setGlobalStructureNotice] = useState<string | null>(null);
  const [modeScopedNotice, setModeScopedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;
    const updateState = () => {
      const nextHeading = editor.isActive("heading", { level: 2 })
        ? "h2"
        : editor.isActive("heading", { level: 3 })
          ? "h3"
          : editor.isActive("heading", { level: 4 })
            ? "h4"
            : "paragraph";
      setHeadingValue(nextHeading);

      const selection = editor.state.selection as any;
      const selectedImage = Boolean(selection?.node?.type?.name === "image");
      setIsImageSelected(selectedImage);
      if (selectedImage) {
        const attrs = selection.node.attrs ?? {};
        const responsive = normalizeResponsiveMap(attrs.responsive);
        const modeOverrides =
          previewMode === "desktop"
            ? {}
            : ((responsive[previewMode] ?? {}) as Record<string, unknown>);
        const effectiveAttrs = getBpAttrs(attrs, previewMode);
        const legacyAlign =
          previewMode === "mobile"
            ? attrs["data-mobile-align"] ?? attrs["data-tablet-align"]
            : previewMode === "tablet"
              ? attrs["data-tablet-align"]
              : attrs["data-align"];
        const resolvedAlign = (effectiveAttrs.align || legacyAlign || attrs["data-align"] || "left") as "left" | "center" | "right";
        const resolvedWidthMode = (effectiveAttrs.widthMode || attrs.widthMode || "content") as "full" | "content" | "px";
        const resolvedWrap = (effectiveAttrs.wrap || attrs.wrap || "none") as "none" | "wrap-left" | "wrap-right";
        const resolvedSpacing = (effectiveAttrs.spacingY || attrs.spacingY || "md") as "none" | "sm" | "md" | "lg";
        const resolvedMaxWidthRaw = effectiveAttrs.maxWidth ?? attrs.maxWidth ?? null;
        const resolvedMaxWidth = Number.parseInt(String(resolvedMaxWidthRaw ?? ""), 10);
        const resolvedVisibility = resolveDeviceVisibility(attrs);
        setImageAlign(resolvedAlign);
        setImageWidthMode(resolvedWidthMode);
        setImageWrap(resolvedWrap);
        setImageSpacingY(resolvedSpacing);
        setImageMaxWidth(Number.isFinite(resolvedMaxWidth) ? resolvedMaxWidth : null);
        setImageVisibility(resolvedVisibility);
        setImageOverrides({
          align: Object.prototype.hasOwnProperty.call(modeOverrides, "align"),
          widthMode: Object.prototype.hasOwnProperty.call(modeOverrides, "widthMode"),
          maxWidth: Object.prototype.hasOwnProperty.call(modeOverrides, "maxWidth"),
          wrap: Object.prototype.hasOwnProperty.call(modeOverrides, "wrap"),
          spacingY: Object.prototype.hasOwnProperty.call(modeOverrides, "spacingY"),
        });
      } else {
        setImageAlign(null);
        setImageWidthMode("content");
        setImageWrap("none");
        setImageSpacingY("md");
        setImageMaxWidth(null);
        setImageVisibility({
          desktop: true,
          tablet: true,
          mobile: true,
        });
        setImageOverrides({
          align: false,
          widthMode: false,
          maxWidth: false,
          wrap: false,
          spacingY: false,
        });
      }
      const tableSelected = editor.isActive("table");
      const tableMatch = tableSelected ? null : findClosestNodeByType(editor, "table");
      const hasTableSelection = tableSelected || Boolean(tableMatch);
      setIsTableSelected(hasTableSelection);
      if (hasTableSelection) {
        const attrs = (tableMatch?.node?.attrs ?? editor.getAttributes("table")) as Record<string, any>;
        const responsive = normalizeResponsiveMap(attrs.responsive);
        const modeOverrides =
          previewMode === "desktop"
            ? {}
            : ((responsive[previewMode] ?? {}) as Record<string, unknown>);
        const effectiveAttrs = getBpAttrs(attrs, previewMode);
        const legacyMode =
          previewMode === "mobile"
            ? attrs.renderModeMobile ?? attrs.renderModeTablet
            : previewMode === "tablet"
              ? attrs.renderModeTablet
              : attrs.renderMode;
        const legacyWrap =
          previewMode === "mobile"
            ? attrs.wrapCellsMobile ?? attrs.wrapCellsTablet
            : previewMode === "tablet"
              ? attrs.wrapCellsTablet
              : attrs.wrapCells;
        const legacyHiddenColumns =
          previewMode === "mobile"
            ? attrs.hiddenColumnsMobile ?? attrs.hiddenColumnsTablet
            : previewMode === "tablet"
              ? attrs.hiddenColumnsTablet
              : attrs.hiddenColumns;
        const legacyColumnWidths =
          previewMode === "mobile"
            ? attrs.columnWidthsMobile ?? attrs.columnWidthsTablet
            : previewMode === "tablet"
              ? attrs.columnWidthsTablet
              : attrs.columnWidths;
        const legacyStackKeyColumn =
          previewMode === "mobile"
            ? attrs.stackKeyColumnMobile ?? attrs.stackKeyColumnTablet
            : previewMode === "tablet"
              ? attrs.stackKeyColumnTablet
              : attrs.stackKeyColumn;
        const layoutBucket =
          previewMode === "mobile"
            ? attrs.layout?.mobile ?? attrs.layout?.tablet ?? attrs.layout?.desktop
            : previewMode === "tablet"
              ? attrs.layout?.tablet ?? attrs.layout?.desktop
              : attrs.layout?.desktop;
        const hasExplicitRenderMode =
          Object.prototype.hasOwnProperty.call(modeOverrides, "renderMode") ||
          Boolean(
            previewMode === "mobile"
              ? attrs.renderModeMobile
              : previewMode === "tablet"
                ? attrs.renderModeTablet
                : attrs.renderMode
          );
        const mode = (
          effectiveAttrs.renderMode ||
          layoutBucket?.renderMode ||
          legacyMode ||
          (previewMode === "mobile" && !hasExplicitRenderMode ? "stack" : attrs.renderMode) ||
          "table"
        ) as "table" | "scroll" | "stack";
        const resolvedWrapCells = Boolean(effectiveAttrs.wrapCells ?? layoutBucket?.wrap ?? legacyWrap ?? attrs.wrapCells ?? true);
        const resolvedHiddenColumns = String(
          effectiveAttrs.hiddenColumns || layoutBucket?.hideColumns?.join?.("|") || legacyHiddenColumns || attrs.hiddenColumns || ""
        );
        const resolvedColumnWidths = toColumnWidthsInput(
          effectiveAttrs.columnWidths ?? layoutBucket?.columnWidths ?? legacyColumnWidths ?? attrs.columnWidths ?? ""
        );
        const resolvedStackKeyRaw =
          effectiveAttrs.stackKeyColumn ??
          layoutBucket?.keyColumn ??
          legacyStackKeyColumn ??
          attrs.stackKeyColumn ??
          "";
        const resolvedStackKey = Number.parseInt(String(resolvedStackKeyRaw ?? ""), 10);
        const resolvedVisibility = resolveDeviceVisibility(attrs);
        setTableRenderMode(mode);
        setTableWrapCells(resolvedWrapCells);
        setTableHiddenColumns(toHiddenColumnsInput(resolvedHiddenColumns));
        setTableColumnWidths(resolvedColumnWidths);
        setTableStackKeyColumn(Number.isFinite(resolvedStackKey) && resolvedStackKey > 0 ? String(resolvedStackKey) : "");
        setTableVisibility(resolvedVisibility);
        setTableModeOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "renderMode"));
        setTableWrapOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "wrapCells"));
        setTableHiddenOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "hiddenColumns"));
        setTableColumnWidthsOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "columnWidths"));
        setTableStackKeyOverride(Object.prototype.hasOwnProperty.call(modeOverrides, "stackKeyColumn"));
      } else {
        setTableRenderMode("table");
        setTableWrapCells(true);
        setTableHiddenColumns("");
        setTableColumnWidths("");
        setTableStackKeyColumn("");
        setTableModeOverride(false);
        setTableWrapOverride(false);
        setTableHiddenOverride(false);
        setTableColumnWidthsOverride(false);
        setTableStackKeyOverride(false);
        setTableVisibility({
          desktop: true,
          tablet: true,
          mobile: true,
        });
      }

      const currentPos =
        editor.state.selection.$from.depth >= 1
          ? editor.state.selection.$from.before(1)
          : Math.max(0, editor.state.selection.from);
      let index = -1;
      let count = 0;
      editor.state.doc.forEach((_node, offset, i) => {
        count += 1;
        if (offset === currentPos) index = i;
      });
      setCanMoveUp(index > 0);
      setCanMoveDown(index >= 0 && index < count - 1);
    };

    updateState();
    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);
    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor, previewMode]);

  if (!editor) return null;

  const notifyGlobalStructure = () => {
    if (previewMode === "desktop") return;
    setGlobalStructureNotice("Acao estrutural global: isso afeta Desktop, Tablet e Mobile.");
    window.setTimeout(() => {
      setGlobalStructureNotice((current) =>
        current === "Acao estrutural global: isso afeta Desktop, Tablet e Mobile." ? null : current
      );
    }, 2200);
  };

  const notifyModeScoped = () => {
    if (previewMode === "desktop") return;
    const label = previewMode === "mobile" ? "MOBILE" : "TABLET";
    setModeScopedNotice(`Ajuste responsivo: afeta apenas ${label}.`);
    window.setTimeout(() => {
      setModeScopedNotice((current) =>
        current === `Ajuste responsivo: afeta apenas ${label}.` ? null : current
      );
    }, 2200);
  };

  const runGlobalTableAction = (handler: () => void) => {
    notifyGlobalStructure();
    if (previewMode !== "desktop") {
      const proceed = window.confirm(
        "Acao global: isso afeta Desktop, Tablet e Mobile. Continuar?"
      );
      if (!proceed) return;
    }
    handler();
  };

  const runGlobalBlockAction = (handler: () => void) => {
    notifyGlobalStructure();
    if (previewMode !== "desktop") {
      const proceed = window.confirm(
        "Acao global: inserir/remover/mover bloco afeta todos os modos. Continuar?"
      );
      if (!proceed) return;
    }
    handler();
  };

  const runGlobalStructureAction = (handler: () => void) => {
    notifyGlobalStructure();
    if (previewMode !== "desktop") {
      const proceed = window.confirm(
        "Acao global: isso afeta Desktop, Tablet e Mobile. Continuar?"
      );
      if (!proceed) return;
    }
    handler();
  };

  const runModeScopedAction = (handler: () => void) => {
    notifyModeScoped();
    handler();
  };

  const currentModeLabel =
    previewMode === "mobile" ? "mobile" : previewMode === "tablet" ? "tablet" : "desktop";
  const tableVisibleOnCurrentMode =
    previewMode === "mobile"
      ? tableVisibility.mobile
      : previewMode === "tablet"
        ? tableVisibility.tablet
        : tableVisibility.desktop;
  const imageVisibleOnCurrentMode =
    previewMode === "mobile"
      ? imageVisibility.mobile
      : previewMode === "tablet"
        ? imageVisibility.tablet
        : imageVisibility.desktop;

  return (
    <div className="sticky top-0 z-20 border-b border-(--border) bg-(--surface) px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-xs text-(--text)">
        <div className="flex items-center gap-2">
          <ToolbarButton
            label="Desfazer"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Refazer"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Mover bloco para cima"
            disabled={!canMoveUp}
            onClick={() => runGlobalStructureAction(() => onMoveBlockUp?.())}
          >
            <MoveUp size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Mover bloco para baixo"
            disabled={!canMoveDown}
            onClick={() => runGlobalStructureAction(() => onMoveBlockDown?.())}
          >
            <MoveDown size={16} />
          </ToolbarButton>
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <select
            value={headingValue}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "paragraph") {
                editor.chain().focus().setParagraph().run();
              } else if (value === "h2") {
                editor.chain().focus().setHeading({ level: 2 }).run();
              } else if (value === "h3") {
                editor.chain().focus().setHeading({ level: 3 }).run();
              } else {
                editor.chain().focus().setHeading({ level: 4 }).run();
              }
            }}
            className="rounded border border-(--border) bg-(--surface) px-2 py-1 text-[11px] font-medium text-(--text) outline-none"
          >
            <option value="paragraph">Parágrafo</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="h4">H4</option>
          </select>
        </div>

        <Separator />

        <ToolbarButton
          label="Negrito"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Itálico"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Sublinhado"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Riscado"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton
          label="Quote / Callout"
          active={editor.isActive("blockquote")}
          onClick={onInsertCallout}
        >
          <Quote size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton
          label="Lista"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Lista ordenada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton label="Link" onClick={onOpenLink}>
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Imagem" onClick={onOpenMedia}>
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="YouTube" onClick={onInsertYoutube}>
          <Youtube size={16} />
        </ToolbarButton>
        <ToolbarButton label="Tabela" onClick={() => runGlobalTableAction(onInsertTable)}>
          <TableIcon size={16} />
        </ToolbarButton>
        <div className="flex items-center gap-1">
          <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700">
            Global
          </span>
          <ToolbarButton
            label="Adicionar linha"
            disabled={!isTableSelected}
            onClick={() => runGlobalTableAction(() => void runTableCommand(editor, "addRowAfter"))}
          >
            <span className="text-[10px] font-semibold">Linha +</span>
          </ToolbarButton>
          <ToolbarButton
            label="Remover linha"
            disabled={!isTableSelected}
            onClick={() => runGlobalTableAction(() => void runTableCommand(editor, "deleteRow"))}
          >
            <span className="text-[10px] font-semibold">Linha -</span>
          </ToolbarButton>
          <ToolbarButton
            label="Adicionar coluna"
            disabled={!isTableSelected}
            onClick={() => runGlobalTableAction(() => void runTableCommand(editor, "addColumnAfter"))}
          >
            <span className="text-[10px] font-semibold">Coluna +</span>
          </ToolbarButton>
          <ToolbarButton
            label="Remover coluna"
            disabled={!isTableSelected}
            onClick={() => runGlobalTableAction(() => void runTableCommand(editor, "deleteColumn"))}
          >
            <span className="text-[10px] font-semibold">Coluna -</span>
          </ToolbarButton>
        </div>
        {isTableSelected ? (
          <div className="flex flex-wrap items-center gap-1 rounded border border-(--border) px-2 py-1 text-[10px] text-(--muted)">
            <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-emerald-700">
              Modo
            </span>
            <span>Render tabela {tableModeOverride && previewMode !== "desktop" ? "*" : ""}</span>
            <select
              value={tableRenderMode}
              onChange={(event) => {
                const mode = event.target.value as "table" | "scroll" | "stack";
                setTableRenderMode(mode);
                runModeScopedAction(() => onSetTableRenderMode?.(mode));
              }}
              className="rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]"
            >
              <option value="table">Table</option>
              <option value="scroll">Scroll</option>
              <option value="stack">Stack</option>
            </select>
            <label className="inline-flex items-center gap-1 rounded border border-(--border) bg-(--surface) px-1.5 py-0.5">
              <input
                type="checkbox"
                checked={tableWrapCells}
                onChange={(event) => {
                  const next = event.target.checked;
                  setTableWrapCells(next);
                  runModeScopedAction(() => onUpdateTableResponsive?.({ wrapCells: next }));
                }}
              />
              Wrap {tableWrapOverride && previewMode !== "desktop" ? "*" : ""}
            </label>
            <input
              type="text"
              value={tableHiddenColumns}
              onChange={(event) => {
                const next = event.target.value;
                setTableHiddenColumns(next);
                runModeScopedAction(() => onUpdateTableResponsive?.({ hiddenColumns: next }));
              }}
              placeholder={
                tableHiddenOverride && previewMode !== "desktop"
                  ? "Ocultar colunas * ex: 2,4"
                  : "Ocultar colunas ex: 2,4"
              }
              className="w-40 rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]"
            />
            <input
              type="text"
              value={tableColumnWidths}
              onChange={(event) => {
                const next = event.target.value;
                setTableColumnWidths(next);
                runModeScopedAction(() => onUpdateTableResponsive?.({ columnWidths: next }));
              }}
              placeholder={
                tableColumnWidthsOverride && previewMode !== "desktop"
                  ? "Larguras * ex: 20,35,45"
                  : "Larguras ex: 20,35,45"
              }
              className="w-44 rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]"
            />
            <span>Titulo stack {tableStackKeyOverride && previewMode !== "desktop" ? "*" : ""}</span>
            <input
              type="number"
              min={1}
              value={tableStackKeyColumn}
              onChange={(event) => {
                const raw = event.target.value;
                setTableStackKeyColumn(raw);
                const parsed = Number.parseInt(raw, 10);
                runModeScopedAction(() =>
                  onUpdateTableResponsive?.({
                    stackKeyColumn: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                  })
                );
              }}
              placeholder={tableStackKeyOverride && previewMode !== "desktop" ? "Titulo* col" : "Titulo col"}
              title="Coluna-chave para o titulo do card no modo stack"
              className="w-24 rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]"
            />
            <label className="inline-flex items-center gap-1 rounded border border-(--border) bg-(--surface) px-1.5 py-0.5">
              <input
                type="checkbox"
                checked={tableVisibleOnCurrentMode}
                onChange={(event) => {
                  const next = event.target.checked;
                  const patch =
                    previewMode === "mobile"
                      ? ({ mobile: next } as { mobile: boolean })
                      : previewMode === "tablet"
                        ? ({ tablet: next } as { tablet: boolean })
                        : ({ desktop: next } as { desktop: boolean });
                  setTableVisibility((current) => ({ ...current, [previewMode]: next }));
                  runModeScopedAction(() => onUpdateTableVisibility?.(patch));
                }}
              />
              Visivel no {currentModeLabel}
            </label>
            {previewMode !== "desktop" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    runModeScopedAction(() => {
                      onResetTableResponsive?.();
                      onResetTableRenderMode?.();
                    });
                  }}
                  className="rounded border border-(--border) bg-(--surface) px-1.5 py-0.5 text-[10px] hover:bg-(--surface-muted)"
                >
                  Herdar desktop
                </button>
                <button
                  type="button"
                  onClick={() => runModeScopedAction(() => onClearTableResponsive?.())}
                  className="rounded border border-(--border) bg-(--surface) px-1.5 py-0.5 text-[10px] hover:bg-(--surface-muted)"
                >
                  Limpar override
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => runGlobalBlockAction(onInsertFaq)}
          className="ml-1 flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 shadow-sm transition-all hover:bg-sky-100"
        >
          <MessageCircleQuestion size={16} />
          FAQ
        </button>
        <button
          type="button"
          onClick={() => runGlobalBlockAction(onInsertIconBlock)}
          className="ml-1 flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-100"
        >
          <List size={16} />
          Icones
        </button>
        <button
          type="button"
          onClick={() => runGlobalBlockAction(onInsertCarouselBlock)}
          className="ml-1 flex items-center gap-2 rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-bold text-fuchsia-700 shadow-sm transition-all hover:bg-fuchsia-100"
        >
          <ImageIcon size={16} />
          Carousel
        </button>
        <button
          type="button"
          onClick={() => runGlobalBlockAction(() => setIsCtaOpen(true))}
          className="ml-1 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-100"
        >
          <Sparkles size={16} />
          CTA
        </button>
        <button
          type="button"
          onClick={() => runGlobalBlockAction(() => setIsProductOpen(true))}
          className="ml-2 flex items-center gap-2 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-500"
        >
          <ShoppingCart size={16} />
          Produto
        </button>
      </div>

      <ProductDialog isOpen={isProductOpen} onClose={() => setIsProductOpen(false)} editor={editor} />
      <CtaButtonDialog isOpen={isCtaOpen} onClose={() => setIsCtaOpen(false)} editor={editor} />

      {onAlignImage ? (
        <>
          <Separator />
          <ToolbarButton
            label="Alinhar esquerda"
            active={imageAlign === "left"}
            disabled={!isImageSelected}
            onClick={() => runModeScopedAction(() => onAlignImage("left"))}
          >
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Centralizar imagem"
            active={imageAlign === "center"}
            disabled={!isImageSelected}
            onClick={() => runModeScopedAction(() => onAlignImage("center"))}
          >
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton
            label="Alinhar direita"
            active={imageAlign === "right"}
            disabled={!isImageSelected}
            onClick={() => runModeScopedAction(() => onAlignImage("right"))}
          >
            <AlignRight size={16} />
          </ToolbarButton>
          {isImageSelected ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-(--border) bg-(--surface-muted) px-2 py-1 text-[10px] text-(--muted)">
              <span className="rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-semibold uppercase tracking-wide text-emerald-700">
                Modo
              </span>
              <span className="font-semibold">
                Imagem ({previewMode}) {imageOverrides.align && previewMode !== "desktop" ? "* align" : ""}
              </span>
              <span>Largura {imageOverrides.widthMode && previewMode !== "desktop" ? "*" : ""}</span>
              <select
                value={imageWidthMode}
                onChange={(event) => {
                  const next = event.target.value as "full" | "content" | "px";
                  setImageWidthMode(next);
                  runModeScopedAction(() => onUpdateImageResponsive?.({ widthMode: next }));
                }}
                className="rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]"
              >
                <option value="content">Largura conteúdo</option>
                <option value="full">Largura total</option>
                <option value="px">Largura fixa (px)</option>
              </select>
              {imageWidthMode === "px" ? (
                <input
                  type="number"
                  value={imageMaxWidth ?? ""}
                  placeholder={previewMode !== "desktop" && imageOverrides.maxWidth ? "max px *" : "max px"}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    const parsed = Number.isFinite(next) ? next : null;
                    setImageMaxWidth(parsed);
                    runModeScopedAction(() => onUpdateImageResponsive?.({ maxWidth: parsed }));
                  }}
                  className="w-20 rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]"
                />
              ) : null}
              <span>Wrap {imageOverrides.wrap && previewMode !== "desktop" ? "*" : ""}</span>
              <select
                value={imageWrap}
                onChange={(event) => {
                  const next = event.target.value as "none" | "wrap-left" | "wrap-right";
                  setImageWrap(next);
                  runModeScopedAction(() => onUpdateImageResponsive?.({ wrap: next }));
                }}
                className="rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]"
              >
                <option value="none">Sem wrap</option>
                <option value="wrap-left">Wrap esquerda</option>
                <option value="wrap-right">Wrap direita</option>
              </select>
              <span>Spacing {imageOverrides.spacingY && previewMode !== "desktop" ? "*" : ""}</span>
              <select
                value={imageSpacingY}
                onChange={(event) => {
                  const next = event.target.value as "none" | "sm" | "md" | "lg";
                  setImageSpacingY(next);
                  runModeScopedAction(() => onUpdateImageResponsive?.({ spacingY: next }));
                }}
                className="rounded border border-(--border) bg-(--surface) px-1 py-0.5 text-[10px]"
              >
                <option value="none">Sem margem</option>
                <option value="sm">Espaço P</option>
                <option value="md">Espaço M</option>
                <option value="lg">Espaço G</option>
              </select>
              <label className="inline-flex items-center gap-1 rounded border border-(--border) bg-(--surface) px-1.5 py-0.5">
                <input
                  type="checkbox"
                  checked={imageVisibleOnCurrentMode}
                  onChange={(event) => {
                    const next = event.target.checked;
                    const patch =
                      previewMode === "mobile"
                        ? ({ mobile: next } as { mobile: boolean })
                        : previewMode === "tablet"
                          ? ({ tablet: next } as { tablet: boolean })
                          : ({ desktop: next } as { desktop: boolean });
                    setImageVisibility((current) => ({ ...current, [previewMode]: next }));
                    runModeScopedAction(() => onUpdateImageVisibility?.(patch));
                  }}
                />
                Visivel no {currentModeLabel}
              </label>
              {previewMode !== "desktop" ? (
                <>
                  <button
                    type="button"
                    onClick={() => runModeScopedAction(() => onResetImageResponsive?.())}
                    className="rounded border border-(--border) bg-(--surface) px-1.5 py-0.5 text-[10px] hover:bg-(--surface-muted)"
                  >
                    Herdar desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => runModeScopedAction(() => onClearImageResponsive?.())}
                    className="rounded border border-(--border) bg-(--surface) px-1.5 py-0.5 text-[10px] hover:bg-(--surface-muted)"
                  >
                    Limpar override
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {previewMode !== "desktop" ? (
        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700">
          [GLOBAL] editar texto, linhas/colunas da tabela, mover/apagar blocos afeta todos os modos. [MODO] largura, alinhamento, wrap, render da tabela e visibilidade no {currentModeLabel}.
        </div>
      ) : null}
      {globalStructureNotice ? (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">
          {globalStructureNotice}
        </div>
      ) : null}
      {modeScopedNotice ? (
        <div className="mt-2 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700">
          {modeScopedNotice}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md border px-2 py-1 text-xs transition ${active
        ? "border-emerald-500 bg-emerald-100 text-emerald-700"
        : "border-(--border) bg-(--surface) text-(--text) hover:bg-(--surface-muted)"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="hidden h-5 w-px bg-(--border) md:inline-flex" />;
}



