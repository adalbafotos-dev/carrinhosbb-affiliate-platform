"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BubbleMenu, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";

import { EditorImage } from "@/components/editor/extensions/EditorImage";
import { EntityLink } from "@/components/editor/extensions/EntityLink";
import { InternalLinkMention } from "@/components/editor/extensions/InternalLinkMention";
import { AffiliateProductCard } from "@/components/editor/extensions/AffiliateProductCard";
import { YoutubeEmbed, normalizeYoutubeUrl } from "@/components/editor/extensions/YoutubeEmbed";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { ContentIntelligence } from "@/components/editor/ContentIntelligence";
import { EditorInspector } from "@/components/editor/EditorInspector";
import { AdvancedLinkDialog } from "@/components/editor/AdvancedLinkDialog";
import { useAdminShell } from "@/components/admin/AdminShell";
import { saveEditorPost } from "@/app/admin/editor/actions";
import type { EditorMeta, ImageAsset, LinkItem, OutlineItem } from "@/components/editor/types";
import type { PostWithSilo, Silo } from "@/lib/types";
import { EditorProvider } from "@/components/editor/EditorContext";
import { EditorHeader } from "@/components/editor/EditorHeader";

type Props = {
  post: PostWithSilo;
  silos?: Silo[];
};

type MetaPatch = Partial<EditorMeta>;

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

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoString(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatRelativeTime(value?: Date | null) {
  if (!value) return "Sem salvamento recente";
  const diff = Date.now() - value.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes <= 0) return "Salvo agora";
  if (minutes === 1) return "Salvo ha 1 min";
  return `Salvo ha ${minutes} min`;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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

function extractOutline(editor: Editor | null): OutlineItem[] {
  if (!editor) return [];
  const items: OutlineItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      const level = node.attrs.level;
      if (level === 2 || level === 3 || level === 4) {
        items.push({
          id: `${pos}-${level}`,
          level,
          text: node.textContent,
          pos: pos + 1,
        });
      }
    }
    return true;
  });
  return items;
}

function resolveLinkType(attrs: Record<string, any>, href: string): LinkItem["type"] {
  const explicit = attrs["data-link-type"] as LinkItem["type"] | undefined;
  if (explicit) return explicit;
  const entity = attrs["data-entity-type"] ?? attrs["data-entity"];
  if (entity === "about") return "about";
  if (entity === "mention") return "mention";
  if (href.startsWith("/")) return "internal";
  const rel = String(attrs.rel ?? "");
  if (rel.includes("sponsored")) return "affiliate";
  return "external";
}

function extractLinks(editor: Editor | null): LinkItem[] {
  if (!editor) return [];
  const items: LinkItem[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "mention") {
      const attrs = node.attrs as any;
      const href = attrs.href ?? "";
      if (!href) return true;
      items.push({
        id: `${pos}-mention`,
        href,
        text: attrs.label ?? "",
        type: "mention",
        target: null,
        rel: null,
        from: pos,
        to: pos + node.nodeSize,
        dataPostId: attrs.id ?? null,
        dataEntityType: "mention",
      });
      return true;
    }

    if (!node.isText) return true;
    const marks = node.marks ?? [];
    const linkMark = marks.find((mark) => mark.type.name === "link");
    if (!linkMark) return true;
    const attrs = linkMark.attrs as any;
    const href = attrs.href ?? "";
    if (!href) return true;
    items.push({
      id: `${pos}-${href}`,
      href,
      text: node.text ?? "",
      type: resolveLinkType(attrs, href),
      target: attrs.target ?? null,
      rel: attrs.rel ?? null,
      from: pos,
      to: pos + node.nodeSize,
      dataPostId: attrs["data-post-id"] ?? null,
      dataEntityType: attrs["data-entity-type"] ?? attrs["data-entity"] ?? null,
    });
    return true;
  });

  return items;
}

async function readImageMeta(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const loaded = new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Image load failed"));
    });
    img.src = url;
    return await loaded;
  } catch {
    return { width: 0, height: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function updateImageById(editor: Editor | null, id: string, attrs: Record<string, any>) {
  if (!editor) return;
  editor.commands.command(({ tr }) => {
    let updated = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs["data-id"] === id) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
        updated = true;
        return false;
      }
      return true;
    });
    return updated;
  });
}

function updateImageBySrc(editor: Editor | null, src: string, attrs: Record<string, any>) {
  if (!editor) return;
  editor.commands.command(({ tr }) => {
    let updated = false;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.src === src) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
        updated = true;
      }
      return true;
    });
    return updated;
  });
}

export function AdvancedEditor({ post, silos = [] }: Props) {
  const [meta, updateMeta] = useReducer((state: EditorMeta, patch: MetaPatch) => ({ ...state, ...patch }), {
    title: post.title ?? "",
    metaTitle: post.meta_title ?? post.seo_title ?? post.title ?? "",
    slug: post.slug ?? "",
    targetKeyword: post.target_keyword ?? "",
    metaDescription: post.meta_description ?? "",
    supportingKeywords: post.supporting_keywords ?? [],
    entities: post.entities ?? [],
    schemaType: post.schema_type ?? "article",
    status: post.status ?? (post.published ? "published" : "draft"),
    scheduledAt: toLocalInput(post.scheduled_at),
    canonicalPath: post.canonical_path ?? "",
    heroImageUrl: post.hero_image_url ?? "",
    heroImageAlt: post.hero_image_alt ?? "",
    ogImageUrl: post.og_image_url ?? "",
    images: Array.isArray(post.images) ? (post.images as ImageAsset[]) : [],
    authorName: post.author_name ?? "",
    expertName: post.expert_name ?? "",
    expertRole: post.expert_role ?? "",
    expertBio: post.expert_bio ?? "",
    expertCredentials: post.expert_credentials ?? "",
    reviewedBy: post.reviewed_by ?? "",
    reviewedAt: toLocalInput(post.reviewed_at),
    sources: Array.isArray(post.sources) ? post.sources : [],
    disclaimer: post.disclaimer ?? "",
    faq: Array.isArray(post.faq_json) ? post.faq_json : [],
    howto: Array.isArray(post.howto_json) ? post.howto_json : [],
    siloId: post.silo_id ?? "",
  });

  const metaRef = useRef(meta);
  const [slugTouched, setSlugTouched] = useState(false);
  const [metaTitleTouched, setMetaTitleTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState(meta.scheduledAt);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [docJson, setDocJson] = useState<any>(post.content_json ?? null);
  const [docHtml, setDocHtml] = useState<string>(post.content_html ?? "");
  const [docText, setDocText] = useState<string>("");
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [imageAltValue, setImageAltValue] = useState("");
  const [saving, setSaving] = useState(false);

  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const bodyInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDropRef = useRef<((file: File, pos?: number) => void) | null>(null);
  const autoTimer = useRef<NodeJS.Timeout | null>(null);
  const dirtyRef = useRef(false);

  const currentSilo = useMemo(() => {
    if (meta.siloId && silos.length) {
      return silos.find((silo) => silo.id === meta.siloId) ?? null;
    }
    if (post.silo) {
      return { id: post.silo_id ?? "", name: post.silo.name, slug: post.silo.slug } as Silo;
    }
    return null;
  }, [meta.siloId, post.silo, post.silo_id, silos]);

  const siloSlug = currentSilo?.slug ?? "silo";

  useEffect(() => {
    metaRef.current = meta;
  }, [meta]);

  useEffect(() => {
    if (!scheduleOpen) {
      setScheduleDraft(meta.scheduledAt);
    }
  }, [meta.scheduledAt, scheduleOpen]);

  useEffect(() => {
    if (autoTimer.current) {
      clearTimeout(autoTimer.current);
    }
    if (saving) return;
    if (!dirtyRef.current) return;
    autoTimer.current = setTimeout(() => {
      void onSave();
      dirtyRef.current = false;
    }, 12000);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [docHtml, docJson, meta, onSave, saving]);

  useEffect(() => {
    if (!metaTitleTouched && meta.metaTitle !== meta.title) {
      updateMeta({ metaTitle: meta.title });
    }
  }, [meta.title, meta.metaTitle, metaTitleTouched]);

  useEffect(() => {
    if (!slugTouched) {
      const next = slugify(meta.title);
      if (next && next !== meta.slug) {
        updateMeta({ slug: next });
      }
    }
  }, [meta.title, meta.slug, slugTouched]);

  useEffect(() => {
    const slug = meta.slug.trim();
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setSlugStatus("checking");
      const params = new URLSearchParams({
        slug,
        siloId: meta.siloId ?? "",
        id: post.id,
      });
      fetch(`/api/admin/slug-check?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data?.available) {
            setSlugStatus("ok");
          } else {
            setSlugStatus("taken");
          }
        })
        .catch(() => setSlugStatus("idle"));
    }, 450);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [meta.slug, meta.siloId, post.id]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      EntityLink.configure({ openOnClick: false }),
      EditorImage,
      YoutubeEmbed,
      InternalLinkMention,
      AffiliateProductCard,
      Placeholder.configure({
        placeholder: "Escreva aqui. Use a barra fixa para inserir blocos.",
      }),
    ],
    content:
      post.content_json ?? {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: meta.targetKeyword
                  ? `Comece falando sobre ${meta.targetKeyword}.`
                  : "Comece a escrever seu review.",
              },
            ],
          },
        ],
      },
    editorProps: {
      attributes: {
        class: "editor-content min-h-[520px] outline-none prose max-w-none",
      },
      handleDrop: (view, event) => {
        const hasFiles = event.dataTransfer?.files && event.dataTransfer.files.length > 0;
        if (!hasFiles) return false;
        const file = event.dataTransfer?.files?.[0];
        if (!file || !file.type.startsWith("image/")) return false;
        event.preventDefault();
        const coords = { left: event.clientX, top: event.clientY };
        const pos = view.posAtCoords(coords)?.pos;
        if (!pos) return false;
        uploadDropRef.current?.(file, pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      setDocJson(editor.getJSON());
      setDocHtml(editor.getHTML());
      setDocText(editor.getText());
      setOutline(extractOutline(editor));
      setLinks(extractLinks(editor));
      dirtyRef.current = true;
    },
  });

  useEffect(() => {
    if (!editor) return;
    setOutline(extractOutline(editor));
    setLinks(extractLinks(editor));
    setDocJson(editor.getJSON());
    setDocHtml(editor.getHTML());
    setDocText(editor.getText());
    dirtyRef.current = true;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const syncAlt = () => {
      const attrs = editor.getAttributes("image") as any;
      setImageAltValue(attrs?.alt ?? "");
    };
    syncAlt();
    editor.on("selectionUpdate", syncAlt);
    editor.on("transaction", syncAlt);
    return () => {
      editor.off("selectionUpdate", syncAlt);
      editor.off("transaction", syncAlt);
    };
  }, [editor]);

  const handleMetaChange = useCallback(
    (patch: MetaPatch) => {
      if (typeof patch.slug === "string") setSlugTouched(true);
      if (typeof patch.metaTitle === "string") setMetaTitleTouched(true);
      updateMeta(patch);
    },
    [updateMeta]
  );

  const uploadFile = useCallback(
    async (file: File, options: { alt: string; kind: "hero" | "body"; width?: number; height?: number }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("postId", post.id);
      formData.append("siloSlug", siloSlug);
      formData.append("postSlug", metaRef.current.slug || post.slug);
      formData.append("alt", options.alt);
      formData.append("kind", options.kind);
      if (options.width) formData.append("width", String(options.width));
      if (options.height) formData.append("height", String(options.height));

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Upload failed");
      }

      return (await res.json()) as {
        url: string;
        fileName?: string;
        width?: number;
        height?: number;
        createdAt?: string;
      };
    },
    [post.id, post.slug, siloSlug]
  );

  const uploadHero = useCallback(
    async (file: File) => {
      const alt = metaRef.current.heroImageAlt || metaRef.current.title || "Hero image";
      const metaData = await readImageMeta(file);
      const result = await uploadFile(file, { alt, kind: "hero", width: metaData.width, height: metaData.height });
      updateMeta({
        heroImageUrl: result.url,
        ogImageUrl: metaRef.current.ogImageUrl || result.url,
        heroImageAlt: alt,
        images: [
          ...metaRef.current.images,
          {
            url: result.url,
            alt,
            width: result.width ?? metaData.width,
            height: result.height ?? metaData.height,
            fileName: result.fileName,
            createdAt: result.createdAt,
          },
        ],
      });
    },
    [uploadFile]
  );

  const uploadAndInsertImage = useCallback(
    async (file: File, insertPos?: number) => {
      if (!editor) return;
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const localUrl = URL.createObjectURL(file);
      const metaData = await readImageMeta(file);
      const alt = metaRef.current.title ? `${metaRef.current.title} imagem` : "Imagem";

      const attrs = {
        src: localUrl,
        alt,
        title: "",
        width: metaData.width || null,
        height: metaData.height || null,
        "data-id": uploadId,
        "data-uploading": "true",
        "data-align": "left",
      };

      if (typeof insertPos === "number") {
        editor.chain().focus().insertContentAt(insertPos, { type: "image", attrs }).run();
      } else {
        editor.chain().focus().insertContent({ type: "image", attrs }).run();
      }

      try {
        const result = await uploadFile(file, { alt, kind: "body", width: metaData.width, height: metaData.height });
        updateImageById(editor, uploadId, {
          src: result.url,
          "data-uploading": null,
          width: result.width ?? metaData.width ?? null,
          height: result.height ?? metaData.height ?? null,
        });

        const nextImages = [
          ...metaRef.current.images,
          {
            url: result.url,
            alt,
            width: result.width ?? metaData.width,
            height: result.height ?? metaData.height,
            fileName: result.fileName,
            createdAt: result.createdAt,
          },
        ];
        updateMeta({ images: nextImages });
      } finally {
        URL.revokeObjectURL(localUrl);
      }
    },
    [editor, uploadFile]
  );

  useEffect(() => {
    uploadDropRef.current = uploadAndInsertImage;
  }, [uploadAndInsertImage]);

  const onInsertImage = useCallback(
    (asset: ImageAsset) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: {
            src: asset.url,
            alt: asset.alt,
            width: asset.width ?? null,
            height: asset.height ?? null,
            "data-align": "left",
          },
        })
        .run();
    },
    [editor]
  );

  const onUpdateImageAlt = useCallback(
    (url: string, alt: string) => {
      const nextImages = metaRef.current.images.map((image) =>
        image.url === url ? { ...image, alt } : image
      );
      updateMeta({ images: nextImages });
      updateImageBySrc(editor, url, { alt });
    },
    [editor]
  );

  const onRemoveImage = useCallback((url: string) => {
    const nextImages = metaRef.current.images.filter((image) => image.url !== url);
    updateMeta({ images: nextImages });
  }, []);

  const onAlignImage = useCallback(
    (align: "left" | "center" | "right") => {
      if (!editor) return;
      editor.chain().focus().updateAttributes("image", { "data-align": align }).run();
    },
    [editor]
  );

  const onInsertProduct = useCallback(() => {
    if (!editor) return;
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
  }, [editor]);

  const onInsertYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("URL do YouTube");
    if (url === null) return;
    const normalized = normalizeYoutubeUrl(url);
    editor.chain().focus().insertContent({ type: "youtubeEmbed", attrs: { src: normalized } }).run();
  }, [editor]);

  const onInsertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const onInsertSection = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Nova secao" }] },
        { type: "paragraph", content: [{ type: "text", text: "Escreva o conteudo aqui." }] },
      ])
      .run();
  }, [editor]);

  const onInsertFaq = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "FAQ" }] },
        { type: "paragraph", content: [{ type: "text", text: "Pergunta 1:" }] },
        { type: "paragraph", content: [{ type: "text", text: "Resposta 1..." }] },
      ])
      .run();
  }, [editor]);

  const onInsertHowTo = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Passo a passo" }] },
        { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Passo 1" }] }] }] },
      ])
      .run();
  }, [editor]);

  const onInsertCtaBest = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Melhor escolha" }] },
      ])
      .run();
    onInsertProduct();
  }, [editor, onInsertProduct]);

  const onInsertCtaValue = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Melhor custo-beneficio" }] },
      ])
      .run();
    onInsertProduct();
  }, [editor, onInsertProduct]);

  const onInsertCtaTable = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Tabela comparativa" }] },
      ])
      .run();
    onInsertTable();
  }, [editor, onInsertTable]);

  const onSelectLink = useCallback(
    (link: LinkItem) => {
      if (!editor) return;
      editor.commands.focus();
      editor.commands.setTextSelection({ from: link.from, to: link.to });
    },
    [editor]
  );

  const onJumpToHeading = useCallback(
    (pos: number) => {
      if (!editor) return;
      editor.commands.focus();
      editor.commands.setTextSelection(pos);
    },
    [editor]
  );

  const onSave = useCallback(
    async (nextStatus?: EditorMeta["status"]) => {
      const statusToSave = nextStatus ?? metaRef.current.status;
      const canonicalPath =
        metaRef.current.canonicalPath ||
        (siloSlug && metaRef.current.slug ? `/${siloSlug}/${metaRef.current.slug}` : null);

      const payload = {
        id: post.id,
        silo_id: metaRef.current.siloId || post.silo_id || null,
        title: metaRef.current.title,
        seo_title: metaRef.current.metaTitle || metaRef.current.title,
        meta_title: metaRef.current.metaTitle || metaRef.current.title,
        slug: metaRef.current.slug,
        target_keyword: metaRef.current.targetKeyword,
        supporting_keywords: metaRef.current.supportingKeywords ?? [],
        meta_description: metaRef.current.metaDescription || null,
        canonical_path: canonicalPath,
        entities: metaRef.current.entities ?? [],
        schema_type: metaRef.current.schemaType,
        faq_json: metaRef.current.faq ?? [],
        howto_json: metaRef.current.howto ?? [],
        hero_image_url: metaRef.current.heroImageUrl || null,
        hero_image_alt: metaRef.current.heroImageAlt || null,
        og_image_url: metaRef.current.ogImageUrl || null,
        images: metaRef.current.images ?? [],
        author_name: metaRef.current.authorName || null,
        expert_name: metaRef.current.expertName || null,
        expert_role: metaRef.current.expertRole || null,
        expert_bio: metaRef.current.expertBio || null,
        expert_credentials: metaRef.current.expertCredentials || null,
        reviewed_by: metaRef.current.reviewedBy || null,
        reviewed_at: toIsoString(metaRef.current.reviewedAt) ?? null,
        sources: metaRef.current.sources ?? [],
        disclaimer: metaRef.current.disclaimer || null,
        scheduled_at: toIsoString(metaRef.current.scheduledAt) ?? null,
        status: statusToSave,
        content_json: docJson,
        content_html: docHtml,
        amazon_products: extractAffiliateProducts(docJson),
      };

      setSaving(true);
      try {
        await saveEditorPost(payload);
        setLastSavedAt(new Date());
        dirtyRef.current = false;
        if (nextStatus) updateMeta({ status: nextStatus });
      } finally {
        setSaving(false);
      }
    },
    [docHtml, docJson, post.id, post.silo_id, siloSlug]
  );

  const { setHeader, resetHeader } = useAdminShell();

  useEffect(() => {
    const rightExtra = (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowLeft((value) => !value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
        >
          {showLeft ? "Ocultar LSI" : "Mostrar LSI"}
        </button>
        <button
          type="button"
          onClick={() => setShowRight((value) => !value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
        >
          {showRight ? "Ocultar painel" : "Mostrar painel"}
        </button>
        <span className="text-[11px] text-zinc-500">{formatRelativeTime(lastSavedAt)}</span>
      </div>
    );

    setHeader({
      custom: (
        <EditorHeader
          breadcrumb={[
            { label: "Admin", href: "/admin" },
            { label: currentSilo?.name ?? "Sem silo", href: currentSilo ? `/admin/silos/${currentSilo.slug}` : undefined },
            { label: meta.title || "Sem titulo" },
          ]}
          status={meta.status}
          saving={saving}
          previewMode={previewMode}
          onPreviewChange={setPreviewMode}
          onSave={() => void onSave()}
          onPublish={() => setPublishOpen(true)}
          rightExtra={rightExtra}
        />
      ),
      layout: "full",
    });
    return () => resetHeader();
  }, [currentSilo, lastSavedAt, meta.status, meta.title, onSave, previewMode, resetHeader, saving, setHeader, setPreviewMode, showLeft, showRight]);

  const openHeroPicker = useCallback(() => heroInputRef.current?.click(), []);
  const openMediaPicker = useCallback(() => bodyInputRef.current?.click(), []);
  const openLinkDialog = useCallback(() => setLinkDialogOpen(true), []);

  const contextValue = useMemo(
    () => ({
      editor,
      meta,
      setMeta: handleMetaChange,
      outline,
      links,
      docText,
      docHtml,
      silos,
      slugStatus,
      saving,
      previewMode,
      setPreviewMode,
      onHeroUpload: uploadHero,
      onOpenHeroPicker: openHeroPicker,
      onOpenMedia: openMediaPicker,
      onOpenLinkDialog: openLinkDialog,
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
      onSelectLink,
      onInsertImage,
      onUpdateImageAlt,
      onRemoveImage,
      onJumpToHeading,
    }),
    [
      editor,
      meta,
      handleMetaChange,
      outline,
      links,
      docText,
      docHtml,
      silos,
      slugStatus,
      saving,
      previewMode,
      setPreviewMode,
      uploadHero,
      openHeroPicker,
      openMediaPicker,
      openLinkDialog,
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
      onSelectLink,
      onInsertImage,
      onUpdateImageAlt,
      onRemoveImage,
      onJumpToHeading,
    ]
  );

  return (
    <EditorProvider value={contextValue}>
      <div className="flex h-full w-full overflow-hidden">
        {showLeft ? <ContentIntelligence /> : null}

        <div className="flex h-full flex-1 flex-col">
          <EditorCanvas />

          <AdvancedLinkDialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} />

          {editor ? (
            <BubbleMenu
              editor={editor}
              shouldShow={() => editor.isActive("image")}
              tippyOptions={{ duration: 100, placement: "top" }}
              className="rounded-lg border border-zinc-200 bg-white p-2 shadow-lg"
            >
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <span>Alt</span>
                <input
                  value={imageAltValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    setImageAltValue(value);
                    editor.chain().focus().updateAttributes("image", { alt: value }).run();
                  }}
                  className="w-48 rounded-md border border-zinc-200 px-2 py-1 text-xs outline-none"
                  placeholder="Alt text"
                />
              </div>
            </BubbleMenu>
          ) : null}
        </div>

        {showRight ? <EditorInspector /> : null}

      <input
        ref={heroInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void uploadHero(file);
        }}
      />

      <input
        ref={bodyInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void uploadAndInsertImage(file);
        }}
      />

      {publishOpen ? (
        <Modal title="Confirmar publicacao" onClose={() => setPublishOpen(false)}>
          <p className="text-xs text-zinc-600">O post sera publicado e estara visivel no site.</p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPublishOpen(false)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                await onSave("published");
                setPublishOpen(false);
              }}
              className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Publicar agora
            </button>
          </div>
        </Modal>
      ) : null}

      {scheduleOpen ? (
        <Modal title="Agendar publicacao" onClose={() => setScheduleOpen(false)}>
          <p className="text-xs text-zinc-600">Defina a data e hora para publicar.</p>
          <input
            type="datetime-local"
            value={scheduleDraft}
            onChange={(event) => setScheduleDraft(event.target.value)}
            className="mt-3 w-full rounded-md border border-zinc-200 px-3 py-2 text-xs outline-none"
          />
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setScheduleOpen(false)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                metaRef.current = {
                  ...metaRef.current,
                  scheduledAt: scheduleDraft,
                  status: "scheduled",
                };
                updateMeta({ scheduledAt: scheduleDraft, status: "scheduled" });
                await onSave("scheduled");
                setScheduleOpen(false);
              }}
              className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Agendar
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
    </EditorProvider>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600"
          >
            Fechar
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
