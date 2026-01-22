"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import Image from "next/image";

export type AffiliateProductAttrs = {
  title?: string;
  image?: string;
  price?: string;
  rating?: number;
  features?: string[];
  href?: string;
};

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

  function edit() {
    const title = prompt("Título do produto", attrs.title ?? "") ?? attrs.title ?? "";
    const image = prompt("URL da imagem", attrs.image ?? "") ?? attrs.image ?? "";
    const price = prompt("Preço (opcional)", attrs.price ?? "") ?? attrs.price ?? "";
    const ratingRaw = prompt("Rating (0 a 5, opcional)", attrs.rating?.toString() ?? "") ?? "";
    const rating = ratingRaw ? Number(ratingRaw) : attrs.rating ?? 0;
    const href = prompt("Link de afiliado (Amazon)", attrs.href ?? "") ?? attrs.href ?? "";
    const featuresRaw = prompt("Features (separe por |)", (attrs.features ?? []).join(" | ")) ?? "";
    const features = featuresRaw ? featuresRaw.split("|").map((s) => s.trim()).filter(Boolean) : attrs.features ?? [];

    props.updateAttributes({ title, image, price, rating, href, features });
  }

  return (
    <NodeViewWrapper className="affiliateProduct">
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-4">
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)]">
            {attrs.image ? (
              <Image src={attrs.image} alt={attrs.title ?? "Produto"} fill sizes="80px" className="object-cover" />
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
              <p className="mt-2 text-xs text-[color:var(--muted-3)]">Dica: adicione 3–5 features claras.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={edit}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
            >
              Editar
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[color:var(--muted-3)]">
          Obs.: na publicação, o link deve usar <span className="text-[color:var(--muted-2)]">rel=&quot;sponsored&quot;</span>.
        </p>
      </div>
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
        class: "affiliate-card",
        "data-title": title,
        "data-image": image,
        "data-price": price,
        "data-rating": String(rating),
        "data-features": JSON.stringify(features),
        "data-href": attrs.href || "",
      }),
      ["div", { class: "flex gap-4 items-start" },
        ["div", { class: "shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface-muted)]" },
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

