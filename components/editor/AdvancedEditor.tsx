"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";

import { EditorImage } from "@/components/editor/extensions/EditorImage";
import { EntityLink } from "@/components/editor/extensions/EntityLink";
import { InternalLinkMention } from "@/components/editor/extensions/InternalLinkMention";
import AffiliateProductCard from "@/components/editor/extensions/AffiliateProductCard";
import { YoutubeEmbed, normalizeYoutubeUrl } from "@/components/editor/extensions/YoutubeEmbed";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { ContentIntelligence } from "@/components/editor/ContentIntelligence";
import { EditorInspector } from "@/components/editor/EditorInspector";
import { AdvancedLinkDialog } from "@/components/editor/AdvancedLinkDialog";
import { LinkBubbleMenu } from "@/components/editor/LinkBubbleMenu";
import { saveEditorPost } from "@/app/admin/editor/actions";
import type { EditorMeta, ImageAsset, LinkItem, OutlineItem } from "@/components/editor/types";
import type { PostWithSilo, Silo } from "@/lib/types";
import { EditorProvider } from "@/components/editor/EditorContext";

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

type HighlightOccurrence = {
  id: string;
  source_post_id: string;
  target_post_id?: string | null;
  anchor_text: string;
  href_normalized: string;
  context_snippet?: string | null;
  start_index?: number | null;
  end_index?: number | null;
  occurrence_key?: string | null;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeHref(href: string) {
  if (!href) return "";
  try {
    const url = new URL(href, "http://local");
    return url.pathname.replace(/\/+$/g, "");
  } catch {
    return href.split(/[?#]/)[0].replace(/\/+$/g, "");
  }
}

function highlightOccurrenceInEditor(editor: Editor, occurrence: HighlightOccurrence) {
  const candidates: Array<{ pos: number; nodeSize: number; hrefMatch: boolean; anchorMatch: boolean }> = [];
  const targetHref = normalizeHref(occurrence.href_normalized);
  const targetAnchor = normalizeText(occurrence.anchor_text);

  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    const linkMark = node.marks.find((mark) => mark.type.name === "link");
    if (!linkMark) return;
    const href = normalizeHref(String(linkMark.attrs?.href ?? ""));
    const text = normalizeText(node.text || "");
    const hrefMatch = Boolean(targetHref && href === targetHref);
    const anchorMatch = Boolean(targetAnchor && text === targetAnchor);
    if (hrefMatch || anchorMatch) {
      candidates.push({ pos, nodeSize: node.nodeSize, hrefMatch, anchorMatch });
    }
  });

  if (!candidates.length) return false;
  candidates.sort((a, b) => {
    const aScore = (a.hrefMatch ? 2 : 0) + (a.anchorMatch ? 1 : 0);
    const bScore = (b.hrefMatch ? 2 : 0) + (b.anchorMatch ? 1 : 0);
    return bScore - aScore;
  });
  const match = candidates[0];
  const from = match.pos;
  const to = match.pos + match.nodeSize;
  editor
    .chain()
    .focus()
    .setTextSelection({ from, to })
    .setMark("highlight", { color: "#FDE68A" })
    .scrollIntoView()
    .run();
  return true;
}

function hasBoldStyle(style: string) {
  const match = /font-weight\s*:\s*([^;]+)/i.exec(style);
  if (!match) return false;
  const value = match[1].trim().toLowerCase();
  if (value === "bold" || value === "bolder") return true;
  const weight = Number.parseInt(value, 10);
  return Number.isFinite(weight) && weight >= 600;
}

function hasItalicStyle(style: string) {
  return /font-style\s*:\s*italic/i.test(style);
}

function hasUnderlineStyle(style: string) {
  return /text-decoration\s*:\s*[^;]*underline/i.test(style) || /text-decoration-line\s*:\s*underline/i.test(style);
}

function transformGoogleDocsPaste(html: string) {
  if (!html || typeof window === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const spans = Array.from(doc.querySelectorAll("span"));

    spans.forEach((span) => {
      const style = (span.getAttribute("style") ?? "").toLowerCase();
      const isBold = hasBoldStyle(style);
      const isItalic = hasItalicStyle(style);
      const isUnderline = hasUnderlineStyle(style);
      if (!isBold && !isItalic && !isUnderline) return;

      const tags: Array<"strong" | "em" | "u"> = [];
      if (isBold) tags.push("strong");
      if (isItalic) tags.push("em");
      if (isUnderline) tags.push("u");

      let wrapper: HTMLElement | null = null;
      let current: HTMLElement | null = null;
      tags.forEach((tag) => {
        const el = doc.createElement(tag);
        if (!wrapper) wrapper = el;
        if (current) current.appendChild(el);
        current = el;
      });

      if (!wrapper || !current) return;

      while (span.firstChild) {
        (current as HTMLElement).appendChild(span.firstChild);
      }

      span.replaceWith(wrapper);
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
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

function extractAffiliateProducts(json: any) {
  const products: any[] = [];

  function walk(node: any) {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);

    if ((node.type === "affiliateProduct" || node.type === "affiliateProductCard") && node.attrs) {
      products.push({
        title: node.attrs.title,
        image: node.attrs.image,
        price: node.attrs.price,
        rating: node.attrs.rating,
        features: node.attrs.features,
        url: node.attrs.url || node.attrs.href,
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
  const rel = String(attrs.rel ?? "");
  const entity = attrs["data-entity-type"] ?? attrs["data-entity"];
  if (entity === "about" || rel.includes("about")) return "about";
  if (entity === "mention" || rel.includes("mention")) return "mention";

  const explicit = attrs["data-link-type"] as LinkItem["type"] | undefined;
  if (explicit) return explicit;
  if (rel.includes("sponsored")) return "affiliate";
  if (href.startsWith("/")) return "internal";
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

function defaultDoc(meta: EditorMeta) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: meta.targetKeyword ? `Comece falando sobre ${meta.targetKeyword}.` : "Comece a escrever seu review.",
          },
        ],
      },
    ],
  };
}

export function AdvancedEditor({ post, silos: initialSilos = [] }: Props) {
  const searchParams = useSearchParams();
  const highlightOccurrenceId = searchParams.get("highlightOccurrenceId");
  const openLinkDialogParam = searchParams.get("openLinkDialog");
  const metaFromJson = (post.content_json as any)?.meta ?? {};
  const [meta, updateMeta] = useReducer(
    (state: EditorMeta, patch: MetaPatch) => ({ ...state, ...patch }),
    {
      title: post.title ?? "",
      metaTitle: post.meta_title ?? post.seo_title ?? post.title ?? "",
      slug: post.slug ?? "",
      targetKeyword: post.target_keyword ?? "",
      metaDescription: post.meta_description ?? "",
      supportingKeywords: Array.isArray(post.supporting_keywords) ? post.supporting_keywords : [],
      entities: Array.isArray(post.entities) ? post.entities : [],
      schemaType: (post.schema_type as EditorMeta["schemaType"]) ?? "article",
      status: (post.status as EditorMeta["status"]) ?? (post.published ? "published" : "draft"),
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
      authorLinks: Array.isArray(metaFromJson.authorLinks) ? metaFromJson.authorLinks : [],
      sources: Array.isArray(post.sources) ? post.sources : [],
      disclaimer: post.disclaimer ?? "",
      faq: Array.isArray(post.faq_json) ? post.faq_json : [],
      howto: Array.isArray(post.howto_json) ? post.howto_json : [],
      amazonProducts: Array.isArray(post.amazon_products) ? post.amazon_products : [],
      siloId: post.silo_id ?? "",
    }
  );

  const metaRef = useRef(meta);
  const [silos, setSilos] = useState<Silo[]>(initialSilos);
  const [slugTouched, setSlugTouched] = useState(false);
  const [metaTitleTouched, setMetaTitleTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [docJson, setDocJson] = useState<any>(post.content_json ?? null);
  const [docHtml, setDocHtml] = useState<string>(post.content_html ?? "");
  const [docText, setDocText] = useState<string>("");
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const heroInputRef = useRef<HTMLInputElement | null>(null);
  const bodyInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDropRef = useRef<((file: File, pos?: number) => void) | null>(null);
  const autoTimer = useRef<NodeJS.Timeout | null>(null);
  const dirtyRef = useRef(false);
  const silosRefreshRef = useRef(false);
  const openedHighlightRef = useRef<string | null>(null);

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
    if (!metaTitleTouched && meta.metaTitle !== meta.title) {
      updateMeta({ metaTitle: meta.title });
    }
  }, [meta.title, meta.metaTitle, metaTitleTouched]);

  // HYDRATION: Sync state from 'post' prop if it changes
  useEffect(() => {
    if (!post) return;

    // Parse meta from json if needed
    const metaFromJson = (post.content_json as any)?.meta ?? {};

    updateMeta({
      title: post.title ?? "",
      metaTitle: post.meta_title ?? post.seo_title ?? post.title ?? "",
      slug: post.slug ?? "",
      targetKeyword: post.target_keyword ?? "",
      metaDescription: post.meta_description ?? "",
      supportingKeywords: Array.isArray(post.supporting_keywords) ? post.supporting_keywords : [],
      entities: Array.isArray(post.entities) ? post.entities : [],
      schemaType: (post.schema_type as EditorMeta["schemaType"]) ?? "article",
      status: (post.status as EditorMeta["status"]) ?? (post.published ? "published" : "draft"),
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
      amazonProducts: Array.isArray(post.amazon_products) ? post.amazon_products : [],
      expertCredentials: post.expert_credentials ?? "",
      reviewedBy: post.reviewed_by ?? "",
      reviewedAt: toLocalInput(post.reviewed_at),
      authorLinks: Array.isArray(metaFromJson.authorLinks) ? metaFromJson.authorLinks : [],
      sources: Array.isArray(post.sources) ? post.sources : [],
      disclaimer: post.disclaimer ?? "",
      faq: Array.isArray(post.faq_json) ? post.faq_json : [],
      howto: Array.isArray(post.howto_json) ? post.howto_json : [],
      siloId: post.silo_id ?? "",
    });

    setDocJson(post.content_json ?? null);
    setDocHtml(post.content_html ?? "");

    // Also ensure editor content is updated if editor instance exists? 
    // Usually Tiptap handles content update via useEditor({ content }) but if content changes later need commands.setContent
    // But be careful not to overwrite unsaved changes if 'post' prop updates from a revalidation while editing.
    // For now, assume this effect is mostly for initial hydration or explicit resets.
  }, [post.id]); // Only re-hydrate if post ID changes to avoid overwriting typing

  // Also sync silos if initialSilos changes
  useEffect(() => {
    if (initialSilos.length) setSilos(initialSilos);
  }, [initialSilos]);

  // Load silo hierarchy (role + position) from database
  useEffect(() => {
    async function loadHierarchy() {
      if (!post.silo_id || !post.id) return;

      try {
        const response = await fetch(`/api/admin/silo-posts?siloId=${post.silo_id}&postId=${post.id}`);
        if (!response.ok) return;

        const data = await response.json();
        if (data?.role || typeof data?.position === "number") {
          updateMeta({
            siloRole: data.role || undefined,
            siloPosition: data.position || undefined,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar hierarquia do silo:", error);
      }
    }

    void loadHierarchy();
  }, [post.id, post.silo_id]);

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

  const refreshSilos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/silos");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.items)) {
        setSilos(data.items);
      }
    } catch {
      return;
    }
  }, []);

  const createSilo = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const res = await fetch("/api/admin/silos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const item = data?.item as Silo | undefined;
      if (item) {
        setSilos((prev) => (prev.some((silo) => silo.id === item.id) ? prev : [...prev, item]));
      }
      return item ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (silos.length > 0) return;
    if (silosRefreshRef.current) return;
    silosRefreshRef.current = true;
    void refreshSilos();
  }, [refreshSilos, silos.length]);

  const editor = useEditor({
    immediatelyRender: false,
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
    content: post.content_html || post.content_json || defaultDoc(meta),
    editorProps: {
      attributes: {
        class: "editor-content min-h-[520px] outline-none prose max-w-none",
      },
      transformPastedHTML: (html) => transformGoogleDocsPaste(html),
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
    if (!editor || !highlightOccurrenceId) return;
    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(`/api/admin/link-occurrences/${highlightOccurrenceId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const occurrence = data?.occurrence as HighlightOccurrence | undefined;
        if (!occurrence) return;
        setTimeout(() => {
          if (editor.isDestroyed) return;
          const highlighted = highlightOccurrenceInEditor(editor, occurrence);
          if (highlighted && openLinkDialogParam && openedHighlightRef.current !== highlightOccurrenceId) {
            openedHighlightRef.current = highlightOccurrenceId;
            setLinkDialogOpen(true);
          }
        }, 200);
      } catch (error) {
        console.error("Erro ao buscar ocorrência para highlight:", error);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [editor, highlightOccurrenceId, openLinkDialogParam]);

  useEffect(() => {
    if (!editor) return;
    setOutline(extractOutline(editor));
    setLinks(extractLinks(editor));
    setDocJson(editor.getJSON());
    setDocHtml(editor.getHTML());
    setDocText(editor.getText());
    dirtyRef.current = true;
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
      const nextImages = metaRef.current.images.map((image) => (image.url === url ? { ...image, alt } : image));
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

  const onInsertCallout = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .toggleBlockquote()
      .run();
  }, [editor]);

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

      const enrichedJson =
        docJson && typeof docJson === "object"
          ? { ...docJson, meta: { ...(docJson.meta ?? {}), authorLinks: metaRef.current.authorLinks } }
          : { type: "doc", content: [], meta: { authorLinks: metaRef.current.authorLinks } };

      const payload = {
        id: post.id,
        silo_id: metaRef.current.siloId || post.silo_id || null,
        silo_role: metaRef.current.siloRole || null,
        silo_position: metaRef.current.siloPosition || null,
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
        content_json: enrichedJson,
        content_html: docHtml,
        amazon_products: extractAffiliateProducts(enrichedJson),
      };

      setSaving(true);
      try {
        await saveEditorPost(payload);
        setLastSavedAt(new Date());
        dirtyRef.current = false;
        if (nextStatus) updateMeta({ status: nextStatus });
      } catch (error: any) {
        console.error("Falha ao salvar post", error);
        const message = typeof error?.message === "string" ? error.message : "Nao foi possivel salvar o rascunho.";
        alert(message);
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [docHtml, docJson, post.id, post.silo_id, siloSlug]
  );

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

  const openHeroPicker = useCallback(() => heroInputRef.current?.click(), []);
  const openMediaPicker = useCallback(() => bodyInputRef.current?.click(), []);
  const openLinkDialog = useCallback(() => setLinkDialogOpen(true), []);

  const contextValue = useMemo(
    () => ({
      editor,
      postId: post.id,
      meta,
      setMeta: handleMetaChange,
      outline,
      links,
      docText,
      docHtml,
      silos,
      refreshSilos,
      createSilo,
      slugStatus,
      saving,
      previewMode,
      setPreviewMode,
      lastSavedAt,
      onSave,
      onHeroUpload: uploadHero,
      onOpenHeroPicker: openHeroPicker,
      onOpenMedia: openMediaPicker,
      onOpenLinkDialog: openLinkDialog,
      onInsertProduct,
      onInsertYoutube,
      onInsertTable,
      onInsertSection: () => undefined,
      onInsertCallout,
      onInsertFaq: () => undefined,
      onInsertHowTo: () => undefined,
      onInsertCtaBest: () => undefined,
      onInsertCtaValue: () => undefined,
      onInsertCtaTable: () => undefined,
      onAlignImage,
      onSelectLink,
      onInsertImage,
      onUpdateImageAlt,
      onRemoveImage,
      onJumpToHeading,
    }),
    [
      editor,
      post.id,
      meta,
      handleMetaChange,
      outline,
      links,
      docText,
      docHtml,
      silos,
      refreshSilos,
      createSilo,
      slugStatus,
      saving,
      previewMode,
      setPreviewMode,
      lastSavedAt,
      onSave,
      uploadHero,
      openHeroPicker,
      openMediaPicker,
      openLinkDialog,
      onInsertProduct,
      onInsertYoutube,
      onInsertTable,
      onInsertCallout,
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
      <div className="flex h-full w-full overflow-hidden bg-(--bg) text-(--text)">
        <ContentIntelligence />

        <div className="flex h-full flex-1 flex-col">
          <EditorCanvas />
          <AdvancedLinkDialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} />
          <LinkBubbleMenu editor={editor} onOpenLinkDialog={() => setLinkDialogOpen(true)} />
        </div>

        <EditorInspector />

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
      </div>
    </EditorProvider>
  );
}
