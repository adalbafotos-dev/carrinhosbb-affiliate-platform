"use client";

import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  MessageCircleQuestion,
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
  onInsertSection: () => void;
  onInsertFaq: () => void;
  onInsertHowTo: () => void;
  onInsertCtaBest: () => void;
  onInsertCtaValue: () => void;
  onInsertCtaTable: () => void;
  onAlignImage?: (align: "left" | "center" | "right") => void;
};

export function FixedToolbar({
  editor,
  onOpenLink,
  onOpenMedia,
  onInsertProduct,
  onInsertYoutube,
  onInsertTable,
  onInsertSection,
  onInsertFaq,
  onInsertHowTo,
  onInsertCtaBest,
  onInsertCtaValue,
  onInsertCtaTable,
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
    <div className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 px-3 py-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
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
            className="rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 outline-none"
          >
            <option value="paragraph">Paragrafo</option>
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
          label="Italico"
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
        <ToolbarButton
          label="Codigo"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Citar"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
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
        <ToolbarButton label="Produto" onClick={onInsertProduct}>
          <ShoppingCart size={16} />
        </ToolbarButton>
        <ToolbarButton label="Tabela" onClick={onInsertTable}>
          <TableIcon size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton label="Secao" onClick={onInsertSection}>
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton label="FAQ" onClick={onInsertFaq}>
          <MessageCircleQuestion size={16} />
        </ToolbarButton>
        <ToolbarButton label="HowTo" onClick={onInsertHowTo}>
          <ListChecks size={16} />
        </ToolbarButton>

        <Separator />

        <ToolbarButton label="CTA Melhor escolha" onClick={onInsertCtaBest}>
          <Heading3 size={16} />
        </ToolbarButton>
        <ToolbarButton label="CTA Custo-beneficio" onClick={onInsertCtaValue}>
          <Heading4 size={16} />
        </ToolbarButton>
        <ToolbarButton label="CTA Tabela comparativa" onClick={onInsertCtaTable}>
          <TableIcon size={16} />
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
          ? "border-zinc-300 bg-zinc-100 text-zinc-900"
          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="hidden h-5 w-px bg-zinc-200 md:inline-flex" />;
}
