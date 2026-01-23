"use client";

import type { Editor } from "@tiptap/react";
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
  List,
  ListOrdered,
  Quote,
  Redo2,
  ShoppingCart,
  Strikethrough,
  Table as TableIcon,
  Undo2,
  Underline,
  Youtube,
} from "lucide-react";

type Props = {
  editor: Editor | null;
  onOpenLink: () => void;
  onOpenMedia: () => void;
  onInsertProduct: () => void;
  onInsertYoutube: () => void;
  onInsertTable: () => void;
  onInsertCallout: () => void;
  onAlignImage?: (align: "left" | "center" | "right") => void;
};

export function FixedToolbar({
  editor,
  onOpenLink,
  onOpenMedia,
  onInsertProduct,
  onInsertYoutube,
  onInsertTable,
  onInsertCallout,
  onAlignImage,
}: Props) {
  if (!editor) return null;

  const headingValue = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : editor.isActive("heading", { level: 4 })
        ? "h4"
        : "paragraph";

  const selection = editor.state.selection as any;
  const isImageSelected = Boolean(selection?.node?.type?.name === "image");
  const imageAlign = isImageSelected ? selection.node.attrs["data-align"] ?? "left" : null;

  return (
    <div className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-100">
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
            className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] font-medium text-zinc-100 outline-none"
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
        <ToolbarButton label="Tabela" onClick={onInsertTable}>
          <TableIcon size={16} />
        </ToolbarButton>
        <ToolbarButton label="Produto" onClick={onInsertProduct}>
          <ShoppingCart size={16} />
        </ToolbarButton>

        {onAlignImage ? (
          <>
            <Separator />
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
          </>
        ) : null}
      </div>
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
      className={`rounded-md border px-2 py-1 text-xs transition ${
        active
          ? "border-emerald-500 bg-emerald-900/60 text-emerald-100"
          : "border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-800"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="hidden h-5 w-px bg-zinc-800 md:inline-flex" />;
}
