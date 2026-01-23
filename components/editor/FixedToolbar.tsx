"use client";

import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  MessageSquare,
  Redo2,
  ShoppingCart,
  Strikethrough,
  Table as TableIcon,
  Undo2,
  Youtube,
} from "lucide-react";

const HIGHLIGHT_COLOR = "#FDE68A";

type Props = {
  editor: Editor | null;
  onOpenLink: () => void;
  onAddImage: () => void;
  onAddProduct: () => void;
  onAddYoutube: () => void;
  onAddTable: () => void;
  onAddCallout: () => void;
  onAlignImage: (align: "left" | "center" | "right") => void;
};

export function FixedToolbar({
  editor,
  onOpenLink,
  onAddImage,
  onAddProduct,
  onAddYoutube,
  onAddTable,
  onAddCallout,
  onAlignImage,
}: Props) {
  if (!editor) return null;

  const headingValue = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : "paragraph";

  const selection = editor.state.selection as any;
  const isImageSelected = Boolean(selection?.node?.type?.name === "image");
  const imageAlign = isImageSelected ? selection.node.attrs["data-align"] ?? "left" : null;

  return (
    <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
        <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1">
          <span className="text-[10px] font-semibold text-zinc-400">Texto</span>
          <select
            value={headingValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "paragraph") {
                editor.chain().focus().setParagraph().run();
              } else if (value === "h2") {
                editor.chain().focus().setHeading({ level: 2 }).run();
              } else {
                editor.chain().focus().setHeading({ level: 3 }).run();
              }
            }}
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 outline-none"
          >
            <option value="paragraph">Paragrafo</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
          </select>
        </div>

        <Divider />

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

        <Divider />

        <ToolbarButton
          label="Negrito"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Italico"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Riscado"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Highlight"
          active={editor.isActive("highlight", { color: HIGHLIGHT_COLOR })}
          onClick={() =>
            editor.chain().focus().toggleHighlight({ color: HIGHLIGHT_COLOR }).run()
          }
        >
          <Highlighter size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          label="Alinhar esquerda"
          active={imageAlign === "left"}
          disabled={!isImageSelected}
          onClick={() => onAlignImage("left")}
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Centralizar imagem"
          active={imageAlign === "center"}
          disabled={!isImageSelected}
          onClick={() => onAlignImage("center")}
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Alinhar direita"
          active={imageAlign === "right"}
          disabled={!isImageSelected}
          onClick={() => onAlignImage("right")}
        >
          <AlignRight size={16} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Link" onClick={onOpenLink}>
          <LinkIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Imagem" onClick={onAddImage}>
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Produto" onClick={onAddProduct}>
          <ShoppingCart size={16} />
        </ToolbarButton>
        <ToolbarButton label="Youtube" onClick={onAddYoutube}>
          <Youtube size={16} />
        </ToolbarButton>
        <ToolbarButton label="Tabela" onClick={onAddTable}>
          <TableIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Callout" onClick={onAddCallout}>
          <MessageSquare size={16} />
        </ToolbarButton>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="hidden h-6 w-px bg-zinc-200 md:inline-flex" />;
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
      className={`rounded-md border px-2 py-1 text-xs transition ${
        active
          ? "border-zinc-300 bg-zinc-100 text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}
