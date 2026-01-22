"use client";

import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import {
  Bold,
  Eraser,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  ShoppingCart,
  Strikethrough,
  Underline,
} from "lucide-react";

type Props = {
  editor: Editor | null;
  onAddImage: () => void;
  onAddProduct: () => void;
  onOpenLink: () => void;
};

export function EditorToolbar({ editor, onAddImage, onAddProduct, onOpenLink }: Props) {
  if (!editor) return null;

  const headingValue = editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
      ? "h3"
      : "paragraph";

  return (
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Pilcrow size={14} className="text-zinc-400" />
        <select
          value={headingValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "paragraph") {
              editor.chain().focus().setParagraph().run();
            } else if (value === "h2") {
              editor.chain().focus().setHeading({ level: 2 }).run();
            } else if (value === "h3") {
              editor.chain().focus().setHeading({ level: 3 }).run();
            }
          }}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 outline-none"
        >
          <option value="paragraph">Paragrafo</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>
      </div>

      <span className="h-5 w-px bg-zinc-200" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Negrito"
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Italico"
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        label="Sublinhado"
      >
        <Underline size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        label="Riscado"
      >
        <Strikethrough size={16} />
      </ToolbarButton>

      <span className="h-5 w-px bg-zinc-200" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Lista"
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Lista ordenada"
      >
        <ListOrdered size={16} />
      </ToolbarButton>

      <span className="h-5 w-px bg-zinc-200" />

      <ToolbarButton onClick={onOpenLink} label="Link">
        <LinkIcon size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={onAddImage} label="Imagem">
        <ImageIcon size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={onAddProduct} label="Produto">
        <ShoppingCart size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        label="Limpar"
      >
        <Eraser size={16} />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton(props: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-lg border px-2 py-1 text-xs transition ${props.active ? "border-zinc-300 bg-zinc-100 text-zinc-900" : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"}`}
      title={props.label}
    >
      {props.children}
    </button>
  );
}
