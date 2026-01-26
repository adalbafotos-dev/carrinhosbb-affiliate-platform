"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

export type AffiliateProductAttrs = {
  title?: string;
  image?: string;
  price?: string;
  rating?: number;
  features?: string[];
  href?: string;
};

type ProductPreview = {
  title?: string;
  image?: string;
  price?: string;
  rating?: number;
};

const URL_PREFIX = /^https?:\/\//i;

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : ""))
    .join(" ")
    .trim();
}

function extractAmazonTitle(href: string) {
  try {
    const url = new URL(href);
    const parts = url.pathname.split("/").filter(Boolean);
    const stop = new Set(["gp", "product", "dp", "ref", "s", "k", "b", "gp", "aw", "sspa", "d"]);
    const slug = parts.find((part) => part.includes("-") && !stop.has(part.toLowerCase())) ?? "";
    const fallback = url.searchParams.get("k") ?? url.searchParams.get("keywords") ?? "";
    const raw = slug || fallback;
    if (!raw) return "";
    const cleaned = raw.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned ? toTitleCase(cleaned) : "";
  } catch {
    return "";
  }
}

function basicPreviewFromUrl(href: string): ProductPreview {
  const title = extractAmazonTitle(href);
  if (!title) return {};
  return { title };
}

function normalizeHref(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  if (URL_PREFIX.test(trimmed)) return trimmed;
  // assume https if protocolo ausente
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

function clampRating(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 5) return 5;
  return value;
}

function Stars({ rating = 0 }: { rating?: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="text-xs text-[color:var(--brand-hot)]">
      {"★★★★★".slice(0, r)}
      <span className="text-[color:rgba(165,119,100,0.35)]">{"★★★★★".slice(r)}</span>
    </div>
  );
}

export function AffiliateProductCardView(props: any) {
  const attrs = props.node.attrs as AffiliateProductAttrs;
  const [editing, setEditing] = useState(false);
  const [autoFillStatus, setAutoFillStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const attrsRef = useRef(attrs);
  const lastAutoUrlRef = useRef("");
  const autoFilledRef = useRef(false);

  useEffect(() => {
    attrsRef.current = attrs;
  }, [attrs.features, attrs.href, attrs.image, attrs.price, attrs.rating, attrs.title]);

  function applyAutofill(preview: ProductPreview) {
    if (!preview) return false;
    const current = attrsRef.current;
    const patch: Partial<AffiliateProductAttrs> = {};
    const titleValue = (current.title ?? "").trim();
    const shouldFillTitle = !titleValue || titleValue.toLowerCase() === "produto";
    const shouldFillRating = !current.rating || current.rating <= 0;

    if (shouldFillTitle && preview.title) patch.title = preview.title;
    if (!current.image && preview.image) patch.image = preview.image;
    if (!current.price && preview.price) patch.price = preview.price;
    if (shouldFillRating && preview.rating) patch.rating = clampRating(preview.rating);

    if (!Object.keys(patch).length) return false;
    props.updateAttributes(patch);
    return true;
  }

  useEffect(() => {
    const hrefRaw = (attrs.href ?? "").trim();
    if (!hrefRaw) {
      lastAutoUrlRef.current = "";
      autoFilledRef.current = false;
      setAutoFillStatus("idle");
      return;
    }
    const href = normalizeHref(hrefRaw);
    if (!URL_PREFIX.test(href)) return;
    if (href !== hrefRaw) {
      props.updateAttributes({ href });
    }
    if (href === lastAutoUrlRef.current) return;

    autoFilledRef.current = false;
    const basicPreview = basicPreviewFromUrl(href);
    if (applyAutofill(basicPreview)) {
      autoFilledRef.current = true;
      setAutoFillStatus("done");
    } else {
      setAutoFillStatus("loading");
    }
    lastAutoUrlRef.current = href;

    const controller = new AbortController();
    fetch("/api/admin/product-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: href }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as ProductPreview;
      })
      .then((data) => {
        if (!data) {
          if (!autoFilledRef.current) setAutoFillStatus("error");
          return;
        }
        const applied = applyAutofill(data);
        if (applied) {
          autoFilledRef.current = true;
          setAutoFillStatus("done");
        } else if (!autoFilledRef.current) {
          setAutoFillStatus("error");
        } else {
          setAutoFillStatus("done");
        }
      })
      .catch(() => {
        if (!autoFilledRef.current) setAutoFillStatus("error");
      });

    return () => controller.abort();
  }, [attrs.href]);

  const featuresText = Array.isArray(attrs.features) ? attrs.features.join("\n") : "";
  const autoLabel =
    autoFillStatus === "loading"
      ? "Buscando dados do link..."
      : autoFillStatus === "done"
        ? "Dados preenchidos. Edite se precisar."
        : autoFillStatus === "error"
          ? "Nao foi possivel puxar dados automaticamente. Verifique o link com https ou amzn.to/..."
          : "";

  return (
    <NodeViewWrapper className="affiliateProduct my-6">
      <div className="flex items-start gap-4 p-4">
        <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-[color:var(--surface-muted)]">
          {attrs.image ? (
            <img src={attrs.image} alt={attrs.title ?? "Produto"} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[color:var(--muted-3)]">
              imagem
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold">{attrs.title || "Produto (clique em editar)"}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <Stars rating={attrs.rating} />
            {attrs.price ? <span className="text-xs text-[color:var(--brand-hot)]">{attrs.price}</span> : null}
          </div>

          {Array.isArray(attrs.features) && attrs.features.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-[color:var(--muted-2)]">
              {attrs.features.slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-[color:var(--muted-3)]">Dica: adicione 3-5 features claras.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
          >
            {editing ? "Fechar" : "Editar"}
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-4 space-y-3 text-xs" contentEditable={false}>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-[color:var(--muted)]">Link do produto</label>
            <input
              value={attrs.href ?? ""}
              onChange={(event) => props.updateAttributes({ href: event.target.value })}
              placeholder="https://www.amazon.com.br/..."
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs outline-none"
            />
            {autoLabel ? <p className="text-[10px] text-[color:var(--muted-2)]">{autoLabel}</p> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[color:var(--muted)]">Titulo</label>
              <input
                value={attrs.title ?? ""}
                onChange={(event) => props.updateAttributes({ title: event.target.value })}
                placeholder="Nome do produto"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[color:var(--muted)]">Imagem</label>
              <input
                value={attrs.image ?? ""}
                onChange={(event) => props.updateAttributes({ image: event.target.value })}
                placeholder="URL da imagem"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[color:var(--muted)]">Preco</label>
              <input
                value={attrs.price ?? ""}
                onChange={(event) => props.updateAttributes({ price: event.target.value })}
                placeholder="R$ 0,00"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase text-[color:var(--muted)]">Rating</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={attrs.rating ? String(attrs.rating) : ""}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  props.updateAttributes({ rating: clampRating(Number.isFinite(next) ? next : 0) });
                }}
                placeholder="0 a 5"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase text-[color:var(--muted)]">Features (1 por linha)</label>
            <textarea
              rows={3}
              value={featuresText}
              onChange={(event) => {
                const features = event.target.value
                  .split(/\n+/)
                  .map((item) => item.trim())
                  .filter(Boolean);
                props.updateAttributes({ features });
              }}
              placeholder="Ponto forte 1"
              className="w-full resize-none rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs outline-none"
            />
          </div>
        </div>
      ) : null}
      <p className="mt-3 px-4 text-[11px] text-[color:var(--muted-3)]">
        Obs.: na publicacao, o link deve usar <span className="text-[color:var(--muted-2)]">rel=&quot;sponsored&quot;</span>.
      </p>
    </NodeViewWrapper>
  );
}
export const AffiliateProductCard = Node.create({
  name: "affiliateProduct",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      title: { default: "" },
      image: { default: "" },
      price: { default: "" },
      rating: { default: 0 },
      features: { default: [] },
      href: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='affiliate-product']" }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = HTMLAttributes as any;

    const title = attrs.title || "";
    const image = attrs.image || "";
    const price = attrs.price || "";
    const rating = Number(attrs.rating || 0);
    const features = Array.isArray(attrs.features) ? attrs.features : [];

    // Render em HTML estável (para o frontend)
    return [
      "div",
      mergeAttributes({
        "data-type": "affiliate-product",
        class: "affiliate-card py-6",
        "data-title": title,
        "data-image": image,
        "data-price": price,
        "data-rating": String(rating),
        "data-features": JSON.stringify(features),
        "data-href": attrs.href || "",
      }),
      ["div", { class: "flex gap-4 items-start" },
        ["div", { class: "shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-[color:var(--surface-muted)]" },
          image ? ["img", { src: image, alt: title, loading: "lazy", width: "80", height: "80", style: "object-fit: cover; width: 80px; height: 80px;" }] : ["span", { class: "text-xs" }, ""]
        ],
        ["div", { class: "flex-1" },
          ["p", { class: "text-sm font-semibold" }, title],
          ["p", { class: "text-xs text-[color:var(--muted-2)] mt-1" }, price ? `${price}` : ""],
          features?.length ? ["ul", { class: "mt-2" }, ...features.slice(0, 5).map((f: string) => ["li", {}, f])] : ["span", {}, ""],
          attrs.href ? ["p", { class: "mt-3" },
            ["a", { class: "cta", href: attrs.href, target: "_blank", rel: "nofollow sponsored" }, "Ver na Amazon"]
          ] : ["span", {}, ""]
        ]
      ]
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AffiliateProductCardView);
  },
});
