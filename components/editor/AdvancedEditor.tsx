"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BubbleMenu, EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Monitor,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { PostWithSilo, Silo } from "@/lib/types";
import { AffiliateProductCard } from "./extensions/AffiliateProductCard";
import { EntityLink } from "./extensions/EntityLink";
import { InternalLinkMention } from "./extensions/InternalLinkMention";
import { EditorImage } from "./extensions/EditorImage";
import { YoutubeEmbed, normalizeYoutubeUrl } from "./extensions/YoutubeEmbed";
import { FixedToolbar } from "./FixedToolbar";
import { EditorInspector, type EditorMetaState } from "./EditorInspector";
import { LinkDialog } from "./LinkDialog";
import { saveEditorPost, setEditorPublishState } from "@/app/admin/editor/actions";

type OutlineItem = {
  id: string;
  level: 2 | 3;
  text: string;
  pos: number;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatRelativeTime(value?: string) {
  if (!value) return "nunca";
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return value;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function extractAffiliateProducts(json: any) {
  const products: any[] = [];
  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);

    if (node.type === "affiliateProduct" && node.attrs) {
      products.push({
        title: node.attrs.title,
        image: node.attrs.image,
        price: node.attrs.price,
        rating: node.attrs.rating,
        features: node.attrs.features,
        url: node.attrs.href,
        currency: "BRL",
      });
    }

    if (node.content) walk(node.content);
  }
  walk(json);
  return products;
}

function getOutline(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading" && (node.attrs.level === 2 || node.attrs.level === 3)) {
      const text = node.textContent || "Sem título";
      const id = `${node.attrs.level}-${slugify(text)}-${pos}`;
      items.push({ id, level: node.attrs.level, text, pos });
    }
  });
  return items;
}

function renameFileForSlug(file: File, slug: string) {
  const extension = file.name.split(".").pop() || "jpg";
  const safeSlug = slugify(slug || "imagem");
  const filename = `${safeSlug}-${Date.now()}.${extension}`;
  return new File([file], filename, { type: file.type });
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AdvancedEditor({ post, silos }: { post: PostWithSilo; silos: Silo[] }) {
  const [meta, setMeta] = useState<EditorMetaState>({
    title: post.title ?? "",
    seoTitle: post.seo_title ?? post.title ?? "",
    slug: post.slug ?? "",
    focusKeyword: post.target_keyword ?? "",
    metaDescription: post.meta_description ?? "",
    coverImage: post.cover_image ?? "",
    coverImageAlt: "",
    author: post.author_name ?? "Equipe",
    publicationDate: post.scheduled_at
      ? new Date(post.scheduled_at).toISOString().slice(0, 16)
      : "",
    siloId: post.silo_id ?? "",
  });
  const [supportingRaw] = useState((post.supporting_keywords ?? []).join("\n"));
  const [slugTouched, setSlugTouched] = useState(false);
  const [seoTouched, setSeoTouched] = useState(false);

  const [docJson, setDocJson] = useState<any>(post.content_json ?? { type: "doc", content: [] });
  const [docHtml, setDocHtml] = useState(post.content_html ?? "");
  const [docText, setDocText] = useState("");
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("");
  const [published, setPublished] = useState(Boolean(post.published));
  const [lastSavedAt, setLastSavedAt] = useState(post.updated_at ?? "");
  const [dirty, setDirty] = useState(false);
  const [changeTick, setChangeTick] = useState(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [imageAlt, setImageAlt] = useState("");
  const [imageSelected, setImageSelected] = useState(false);
  const [reviewPending, setReviewPending] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const content = useMemo(() => post.content_json ?? { type: "doc", content: [] }, [post.content_json]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      EntityLink.configure({
        openOnClick: false,
      }),
      EditorImage.configure({
        allowBase64: false,
      }),
      YoutubeEmbed,
      Placeholder.configure({
        placeholder: "Escreva aqui... Use @ para sugerir links internos.",
      }),
      InternalLinkMention,
      AffiliateProductCard,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "editor-content prose prose-zinc max-w-none focus:outline-none text-[15px] leading-relaxed",
      },
      handleDrop: (_view, event) => {
        if (!(event instanceof DragEvent)) return false;
        if (!event.dataTransfer?.files?.length) return false;
        const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith("image/"));
        if (!files.length) return false;
        event.preventDefault();
        files.forEach((file) => {
          void insertImageFile(file);
        });
        return true;
      },
      handlePaste: (_view, event) => {
        if (!(event instanceof ClipboardEvent)) return false;
        if (!event.clipboardData?.files?.length) return false;
        const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
        if (!files.length) return false;
        files.forEach((file) => {
          void insertImageFile(file);
        });
        return true;
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
      setOutline(getOutline(editor));
    },
    onUpdate: ({ editor }) => {
      setDocJson(editor.getJSON());
      setDocHtml(editor.getHTML());
      setDocText(editor.getText());
      setOutline(getOutline(editor));
      markDirty();
    },
  });

  useEffect(() => {
    if (!editor) return;
    setDocJson(editor.getJSON());
    setDocHtml(editor.getHTML());
    setDocText(editor.getText());
    setOutline(getOutline(editor));
  }, [editor]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    if (!dirty || pending) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void handleSave(true);
    }, 8000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [changeTick, dirty, pending]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const selection: any = editor.state.selection;
      if (selection?.node?.type?.name === "image") {
        setImageSelected(true);
        setImageAlt(selection.node.attrs.alt ?? "");
      } else {
        setImageSelected(false);
      }
    };
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("transaction", handler);
    };
  }, [editor]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const onScroll = () => {
      const max = element.scrollHeight - element.clientHeight;
      setScrollProgress(max > 0 ? element.scrollTop / max : 0);
    };
    onScroll();
    element.addEventListener("scroll", onScroll);
    return () => element.removeEventListener("scroll", onScroll);
  }, [canvasRef]);

  function markDirty() {
    setDirty(true);
    setChangeTick((value) => value + 1);
  }

  function updateMeta(patch: Partial<EditorMetaState>) {
    setMeta((prev) => ({ ...prev, ...patch }));
    if ("slug" in patch) setSlugTouched(true);
    if ("seoTitle" in patch) setSeoTouched(true);
    markDirty();
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("postId", post.id);

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error ?? "Falha ao enviar imagem.");
    }

    const data = await res.json();
    return data.url as string;
  }

  function updateImageNode(uploadId: string, url: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const { state, view } = editor;
    const tr = state.tr;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs["data-id"] === uploadId) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: url,
          "data-uploading": null,
          "data-id": null,
        });
      }
    });
    if (tr.docChanged) view.dispatch(tr);
  }

  async function insertImageFile(file: File) {
    const editor = editorRef.current;
    if (!editor) return;
    const renamed = renameFileForSlug(file, meta.slug);
    const uploadId = createId();
    const previewUrl = URL.createObjectURL(renamed);

    setUploadCount((count) => count + 1);
    editor
      .chain()
      .focus()
      .setImage({
        src: previewUrl,
        alt: renamed.name,
        "data-uploading": "true",
        "data-id": uploadId,
      })
      .run();

    try {
      const url = await uploadImage(renamed);
      updateImageNode(uploadId, url);
      markDirty();
    } catch (error: any) {
      setStatus(error?.message ?? "Erro ao enviar imagem.");
    } finally {
      setUploadCount((count) => Math.max(0, count - 1));
      URL.revokeObjectURL(previewUrl);
    }
  }

  async function handleCoverImage(file: File) {
    const renamed = renameFileForSlug(file, `${meta.slug}-capa`);
    setUploadCount((count) => count + 1);
    try {
      const url = await uploadImage(renamed);
      updateMeta({ coverImage: url });
    } catch (error: any) {
      setStatus(error?.message ?? "Erro ao enviar imagem.");
    } finally {
      setUploadCount((count) => Math.max(0, count - 1));
    }
  }

  function handleTitleChange(value: string) {
    setMeta((prev) => {
      const next = { ...prev, title: value };
      if (!slugTouched) next.slug = slugify(value);
      if (!seoTouched) next.seoTitle = value;
      return next;
    });
    markDirty();
  }

  function handleSave(silent = false) {
    if (pending) return;
    if (!silent) setStatus("");
    const supporting = supportingRaw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const products = extractAffiliateProducts(docJson);

    startTransition(async () => {
      try {
        await saveEditorPost({
          id: post.id,
          title: meta.title,
          seo_title: meta.seoTitle || meta.title,
          slug: meta.slug,
          target_keyword: meta.focusKeyword,
          meta_description: meta.metaDescription,
          supporting_keywords: supporting,
          cover_image: meta.coverImage,
          author_name: meta.author,
          scheduled_at: meta.publicationDate,
          content_json: docJson,
          content_html: docHtml,
          amazon_products: products,
          silo_id: meta.siloId || null,
        });
        setLastSavedAt(new Date().toISOString());
        setDirty(false);
        if (!silent) {
          setStatus("Rascunho salvo.");
        }
      } catch (error: any) {
        setStatus(error?.message ?? "Erro ao salvar.");
      }
    });
  }

  function handlePublish(next: boolean) {
    if (pending) return;
    setStatus("");
    startTransition(async () => {
      try {
        await setEditorPublishState({ id: post.id, published: next });
        setPublished(next);
        setStatus(next ? "Post publicado." : "Post despublicado.");
      } catch (error: any) {
        setStatus(error?.message ?? "Erro ao atualizar status.");
      }
    });
  }

  function insertProductCard() {
    editor
      ?.chain()
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

  function insertTable() {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  function insertCallout() {
    editor?.chain().focus().toggleBlockquote().run();
  }

  function insertYoutube() {
    const url = window.prompt("Cole a URL do YouTube");
    if (!url) return;
    const embed = normalizeYoutubeUrl(url);
    editor?.chain().focus().insertContent({ type: "youtubeEmbed", attrs: { src: embed } }).run();
  }

  function alignImage(align: "left" | "center" | "right") {
    const editor = editorRef.current;
    if (!editor) return;
    const selection: any = editor.state.selection;
    if (selection?.node?.type?.name !== "image") return;
    editor.chain().focus().updateAttributes("image", { "data-align": align }).run();
  }

  function jumpToHeading(pos: number) {
    editor?.chain().focus().setTextSelection(pos).run();
  }

  const activeSilo = silos.find((silo) => silo.id === meta.siloId) ?? post.silo;
  const siloLabel = activeSilo?.name ?? "Sem silo";
  const scheduledAt = meta.publicationDate ? new Date(meta.publicationDate) : null;
  const isScheduled = scheduledAt && scheduledAt > new Date();
  const statusLabel = published
    ? "Publicado"
    : isScheduled
      ? "Agendado"
      : reviewPending
        ? "Revisão"
        : "Rascunho";
  const statusLocked = published || isScheduled;

  return (
    <div className="fixed inset-0 z-50 flex h-screen flex-col overflow-hidden bg-zinc-100">
      <header className="relative flex h-[60px] items-center border-b border-zinc-200 bg-white px-4">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="text-xs text-zinc-500">
              <span className="font-semibold text-zinc-700">Home</span>
              <span className="mx-1 text-zinc-300">/</span>
              <span>{siloLabel}</span>
              <span className="mx-1 text-zinc-300">/</span>
              <span className="text-zinc-700">{meta.title || "Post"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 font-semibold">
              <Sparkles size={12} className="text-amber-500" />
              {statusLabel}
            </span>
            <span className="inline-flex items-center gap-2 text-[11px] text-zinc-500">
              <Clock size={12} />
              Last saved {formatRelativeTime(lastSavedAt)} ago
            </span>
            {dirty ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                <UploadCloud size={12} />
                Alterações pendentes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                <CheckCircle2 size={12} />
                Sincronizado
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`rounded-full p-1 ${previewMode === "desktop" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
              >
                <Monitor size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`rounded-full p-1 ${previewMode === "mobile" ? "bg-zinc-900 text-white" : "text-zinc-500"}`}
              >
                <Smartphone size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
            >
              <Save size={14} />
              Salvar
            </button>

            <button
              type="button"
              onClick={() => setConfirmPublishOpen(true)}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              <ShieldCheck size={14} />
              Publicar
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-zinc-100">
          <div
            className="h-[2px] bg-zinc-900"
            style={{ width: `${Math.min(100, scrollProgress * 100)}%` }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex h-full w-[280px] flex-col border-r border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3 text-xs font-semibold uppercase text-zinc-500">
            Outline & Blocks
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <section className="space-y-2">
              <p className="text-[11px] font-semibold uppercase text-zinc-400">Estrutura</p>
              {outline.length === 0 ? (
                <p className="text-xs text-zinc-400">Nenhum heading ainda.</p>
              ) : (
                <div className="space-y-1">
                  {outline.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => jumpToHeading(item.pos)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100 ${
                        item.level === 3 ? "pl-5 text-zinc-500" : ""
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
                      {item.text}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <div className="my-5 h-px bg-zinc-200" />

            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase text-zinc-400">Inserir bloco</p>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="group flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  Imagem
                  <span className="text-[10px] text-zinc-400 group-hover:text-zinc-600">upload</span>
                </button>
                <button
                  type="button"
                  onClick={insertProductCard}
                  className="group flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  Produto afiliado
                  <span className="text-[10px] text-zinc-400 group-hover:text-zinc-600">card</span>
                </button>
                <button
                  type="button"
                  onClick={insertYoutube}
                  className="group flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  YouTube
                  <span className="text-[10px] text-zinc-400 group-hover:text-zinc-600">embed</span>
                </button>
                <button
                  type="button"
                  onClick={insertTable}
                  className="group flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  Tabela 3x3
                  <span className="text-[10px] text-zinc-400 group-hover:text-zinc-600">comparativo</span>
                </button>
                <button
                  type="button"
                  onClick={insertCallout}
                  className="group flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
                >
                  Callout
                  <span className="text-[10px] text-zinc-400 group-hover:text-zinc-600">alerta</span>
                </button>
              </div>
            </section>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-zinc-100">
          <div ref={canvasRef} className="h-full overflow-y-auto">
            <FixedToolbar
              editor={editor}
              onOpenLink={() => {
                editor?.chain().focus().run();
                setLinkDialogOpen(true);
              }}
              onAddImage={() => imageInputRef.current?.click()}
              onAddProduct={insertProductCard}
              onAddYoutube={insertYoutube}
              onAddTable={insertTable}
              onAddCallout={insertCallout}
              onAlignImage={alignImage}
            />

            <div className="mx-auto w-full max-w-[850px] px-6 py-6">
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-200 px-6 py-5">
                  <textarea
                    placeholder="Título do post (H1)"
                    value={meta.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    rows={1}
                    className="w-full resize-none bg-transparent text-3xl font-semibold text-zinc-900 outline-none placeholder:text-zinc-300"
                    onInput={(e) => {
                      const element = e.currentTarget;
                      element.style.height = "auto";
                      element.style.height = `${element.scrollHeight}px`;
                    }}
                  />
                </div>

                <div
                  className={`px-6 py-6 ${
                    previewMode === "mobile" ? "mx-auto max-w-[420px]" : ""
                  }`}
                >
                  <EditorContent editor={editor} />
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void insertImageFile(file);
                      e.currentTarget.value = "";
                    }
                  }}
                />
              </div>

              {uploadCount > 0 ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
                  Enviando {uploadCount} imagem(ns)...
                </div>
              ) : null}
              {status ? (
                <div className="mt-3 text-xs text-zinc-500">{status}</div>
              ) : null}
            </div>
          </div>
        </div>

        <EditorInspector
          meta={meta}
          silos={silos}
          contentText={docText}
          onChange={updateMeta}
          onCoverImageFile={handleCoverImage}
          reviewPending={reviewPending}
          statusLocked={statusLocked}
          statusLabel={statusLabel}
          onReviewChange={setReviewPending}
        />
      </div>

      {editor ? (
        <BubbleMenu
          editor={editor}
          shouldShow={() => imageSelected}
          tippyOptions={{ duration: 100, placement: "top" }}
          className="rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-xl"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-zinc-500">Alt</span>
            <input
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              onBlur={() => editor.chain().focus().updateAttributes("image", { alt: imageAlt }).run()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  editor.chain().focus().updateAttributes("image", { alt: imageAlt }).run();
                }
              }}
              className="w-48 rounded border border-zinc-200 px-2 py-1 text-xs outline-none"
              placeholder="Texto alternativo"
            />
          </div>
        </BubbleMenu>
      ) : null}

      <LinkDialog editor={editor} open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} />

      {confirmPublishOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-zinc-900">Confirmar publicação</h3>
            <p className="mt-2 text-xs text-zinc-500">
              Tem certeza que deseja publicar este conteúdo? Essa ação ficará visível no site.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPublishOpen(false)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmPublishOpen(false);
                  handlePublish(true);
                }}
                className="rounded-md bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Publicar agora
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
