"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { EntityLink } from "./extensions/EntityLink";
import Placeholder from "@tiptap/extension-placeholder";
import { AffiliateProductCard } from "./extensions/AffiliateProductCard";
import { InternalLinkMention } from "./extensions/InternalLinkMention";
import { LinkBubbleMenu } from "./LinkBubbleMenu";

type Props = {
  initialJson: any | null;
  targetKeyword: string;
  onChange: (args: { json: any; html: string; text: string }) => void;
};

export function ReviewEditor({ initialJson, targetKeyword, onChange }: Props) {
  const content = useMemo(() => {
    if (initialJson) return initialJson;
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: `Comece este review falando sobre: ${targetKeyword}.` },
          ],
        },
      ],
    };
  }, [initialJson, targetKeyword]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      EntityLink.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Escreva aqui… (use @ para sugerir link interno e insira cards de produto no meio do texto)",
      }),
      InternalLinkMention,
      AffiliateProductCard,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "min-h-[520px] rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange({
        json: editor.getJSON(),
        html: editor.getHTML(),
        text: editor.getText(),
      });
    },
  });

  // dispara uma primeira atualização (para SEO sidebar já nascer com dados)
  useEffect(() => {
    if (!editor) return;
    onChange({ json: editor.getJSON(), html: editor.getHTML(), text: editor.getText() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  function insertProduct() {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "affiliateProduct",
        attrs: {
          title: "Produto",
          image: "",
          price: "",
          rating: 0,
          features: ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],
          href: "",
        },
      })
      .run();
  }

  function toggleH2() {
    editor.chain().focus().toggleHeading({ level: 2 }).run();
  }

  function toggleH3() {
    editor.chain().focus().toggleHeading({ level: 3 }).run();
  }

  function bulletList() {
    editor.chain().focus().toggleBulletList().run();
  }

  function setLink() {
    const previous = editor.getAttributes("link") as any;
    const url = prompt("Cole o link aqui", previous.href ?? "");
    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({
      href: url,
      target: "_blank",
      rel: "nofollow sponsored",
    }).run();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggleH2} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]">
          H2
        </button>
        <button type="button" onClick={toggleH3} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]">
          H3
        </button>
        <button type="button" onClick={bulletList} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]">
          Lista
        </button>
        <button type="button" onClick={setLink} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]">
          Link
        </button>
        <button type="button" onClick={insertProduct} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]">
          + Card de produto
        </button>

        <span className="ml-auto text-xs text-[color:var(--muted-3)]">
          Dica: selecione um link e ajuste {`target/nofollow/sponsored`} no menu flutuante.
        </span>
      </div>

      <LinkBubbleMenu editor={editor} />

      <EditorContent editor={editor} />
    </div>
  );
}

