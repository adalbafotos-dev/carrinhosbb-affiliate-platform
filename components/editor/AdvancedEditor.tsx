"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { ArrowLeft, Calendar, Eye, Save, ShieldCheck, Sparkles } from "lucide-react";
import type { PostWithSilo } from "@/lib/types";
import { EntityLink } from "./extensions/EntityLink";
import { InternalLinkMention } from "./extensions/InternalLinkMention";
import { AffiliateProductCard } from "./extensions/AffiliateProductCard";
import { LinkBubbleMenu } from "./LinkBubbleMenu";
import { EditorSidebar, type EditorMeta } from "./EditorSidebar";
import { EditorToolbar } from "./EditorToolbar";
import { saveEditorPost, setEditorPublishState } from "@/app/admin/editor/actions";

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

function formatTimestamp(value?: string) {
  if (!value) return "Nunca";
  try {
    return new Date(value).toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return value;
  }
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

export function AdvancedEditor({ post }: { post: PostWithSilo }) {
  const [meta, setMeta] = useState<EditorMeta>({
    title: post.title ?? "",
    seoTitle: post.seo_title ?? post.title ?? "",
    slug: post.slug ?? "",
    focusKeyword: post.target_keyword ?? "",
    metaDescription: post.meta_description ?? "",
    coverImage: post.cover_image ?? "",
    published: Boolean(post.published),
    author: "Equipe",
    publicationDate: "",
  });
  const [supportingRaw, setSupportingRaw] = useState((post.supporting_keywords ?? []).join("\n"));
  const [slugTouched, setSlugTouched] = useState(false);
  const [seoTouched, setSeoTouched] = useState(false);

  const [docJson, setDocJson] = useState<any>(post.content_json ?? { type: "doc", content: [] });
  const [docHtml, setDocHtml] = useState(post.content_html ?? "");
  const [docText, setDocText] = useState("");

  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(post.updated_at ?? "");
  const [dirty, setDirty] = useState(false);
  const [changeTick, setChangeTick] = useState(0);
  const [uploading, setUploading] = useState(false);

  const editorRef = useRef<Editor | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const content = useMemo(() => post.content_json ?? { type: "doc", content: [] }, [post.content_json]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      EntityLink.configure({
        openOnClick: false,
      }),
      Image.configure({
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: "Tell your story...",
      }),
      InternalLinkMention,
      AffiliateProductCard,
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-lg prose-slate text-zinc-900 max-w-none min-h-[60vh] focus:outline-none",
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
      handleDoubleClick: (view, pos) => {
        const node = view.state.doc.nodeAt(pos);
        if (!node || node.type.name !== "image") return false;
        const currentAlt = node.attrs.alt ?? "";
        const nextAlt = window.prompt("Texto alternativo", currentAlt);
        if (nextAlt === null) return true;
        const tr = view.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          alt: nextAlt,
        });
        view.dispatch(tr);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => {
      setDocJson(editor.getJSON());
      setDocHtml(editor.getHTML());
      setDocText(editor.getText());
      markDirty();
    },
  });

  useEffect(() => {
    if (!editor) return;
    setDocJson(editor.getJSON());
    setDocHtml(editor.getHTML());
    setDocText(editor.getText());
  }, [editor]);

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

  function markDirty() {
    setDirty(true);
    setChangeTick((value) => value + 1);
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

  async function insertImageFile(file: File) {
    if (uploading) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      editorRef.current?.chain().focus().setImage({ src: url, alt: file.name }).run();
      markDirty();
    } catch (error: any) {
      setStatus(error?.message ?? "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
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

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setMeta((prev) => ({ ...prev, slug: value }));
    markDirty();
  }

  function handleSeoTitleChange(value: string) {
    setSeoTouched(true);
    setMeta((prev) => ({ ...prev, seoTitle: value }));
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
          meta_description: meta.metaDescription || undefined,
          supporting_keywords: supporting,
          cover_image: meta.coverImage || undefined,
          content_json: docJson,
          content_html: docHtml,
          amazon_products: products,
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
        setMeta((prev) => ({ ...prev, published: next }));
        setStatus(next ? "Post publicado." : "Post despublicado.");
      } catch (error: any) {
        setStatus(error?.message ?? "Erro ao atualizar status.");
      }
    });
  }

  function handlePrimaryAction() {
    if (meta.published) {
      handleSave(false);
      return;
    }
    handlePublish(true);
  }

  const previewHref = post.silo ? `/${post.silo.slug}/${meta.slug}` : `/${meta.slug}`;
  const scheduledAt = meta.publicationDate ? new Date(meta.publicationDate) : null;
  const isScheduled = !meta.published && scheduledAt && scheduledAt > new Date();
  const statusLabel = meta.published ? "Publicado" : isScheduled ? "Agendado" : "Rascunho";

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            <ArrowLeft size={14} />
            Voltar ao painel
          </Link>

          <div className="flex flex-col items-center text-xs text-zinc-500">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-700">
              <Sparkles size={12} className="text-amber-500" />
              {statusLabel}
              <span className="text-zinc-300">?</span>
              Ultimo salvamento: {formatTimestamp(lastSavedAt)}
            </div>
            {status ? <span className="mt-1 text-[11px] text-zinc-500">{status}</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              SEO
            </button>
            <a
              href={previewHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              <Eye size={14} />
              Visualizar
            </a>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
            >
              <Save size={14} />
              Salvar rascunho
            </button>
            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              <Calendar size={14} />
              Agendar
            </button>
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              <ShieldCheck size={14} />
              {meta.published ? "Atualizar" : "Publicar"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 px-6 py-10">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <textarea
              placeholder="Post Title..."
              value={meta.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              rows={1}
              className="w-full resize-none bg-transparent text-4xl font-semibold leading-tight text-zinc-900 outline-none placeholder:text-zinc-300"
              onInput={(e) => {
                const element = e.currentTarget;
                element.style.height = "auto";
                element.style.height = `${element.scrollHeight}px`;
              }}
            />

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <EditorToolbar
                editor={editor}
                onAddImage={() => imageInputRef.current?.click()}
                onAddProduct={() => {
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
                }}
                onOpenLink={() => {
                  setLinkMenuOpen(true);
                  editor?.chain().focus().run();
                }}
              />

              {editor ? (
                <LinkBubbleMenu
                  editor={editor}
                  forceOpen={linkMenuOpen}
                  onClose={() => setLinkMenuOpen(false)}
                />
              ) : null}

              <EditorContent editor={editor} />

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

            {uploading ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-600">
                Enviando imagem...
              </div>
            ) : null}
          </div>
        </main>

        {sidebarOpen ? (
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/20 xl:hidden"
            aria-label="Fechar sidebar"
          />
        ) : null}

        <EditorSidebar
          meta={meta}
          supportingRaw={supportingRaw}
          contentHtml={docHtml}
          contentText={docText}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSlugChange={handleSlugChange}
          onSeoTitleChange={handleSeoTitleChange}
          onMetaDescriptionChange={(value) => {
            setMeta((prev) => ({ ...prev, metaDescription: value }));
            markDirty();
          }}
          onFocusKeywordChange={(value) => {
            setMeta((prev) => ({ ...prev, focusKeyword: value }));
            markDirty();
          }}
          onCoverImageChange={(value) => {
            setMeta((prev) => ({ ...prev, coverImage: value }));
            markDirty();
          }}
          onSupportingChange={(value) => {
            setSupportingRaw(value);
            markDirty();
          }}
          onAuthorChange={(value) => {
            setMeta((prev) => ({ ...prev, author: value }));
            markDirty();
          }}
          onPublicationDateChange={(value) => {
            setMeta((prev) => ({ ...prev, publicationDate: value }));
            markDirty();
          }}
        />
      </div>

      {scheduleOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-zinc-900">Agendar publicacao</p>
            <p className="mt-2 text-xs text-zinc-500">Defina a data e horario para publicar.</p>
            <input
              type="datetime-local"
              value={meta.publicationDate}
              onChange={(e) => {
                setMeta((prev) => ({ ...prev, publicationDate: e.target.value }));
                markDirty();
              }}
              className="mt-4 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-zinc-400"
            />
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMeta((prev) => ({ ...prev, publicationDate: "" }));
                  setScheduleOpen(false);
                }}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-700"
              >
                Limpar
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleOpen(false)}
                  className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleOpen(false)}
                  className="rounded-full border border-zinc-900 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
