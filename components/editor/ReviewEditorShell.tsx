"use client";

import { useMemo, useState, useTransition } from "react";
import type { PostWithSilo } from "@/lib/types";
import { ReviewEditor } from "./ReviewEditor";
import { SeoSidebar } from "./SeoSidebar";
import { saveDraft, setPublishState } from "@/app/admin/actions";

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

export function ReviewEditorShell({ post }: { post: PostWithSilo }) {
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [targetKeyword, setTargetKeyword] = useState(post.target_keyword);
  const [metaDescription, setMetaDescription] = useState(post.meta_description ?? "");
  const [supportingRaw, setSupportingRaw] = useState((post.supporting_keywords ?? []).join("\n"));
  const [published, setPublished] = useState(Boolean(post.published));

  const [docJson, setDocJson] = useState<any>(post.content_json);
  const [docHtml, setDocHtml] = useState<string>(post.content_html ?? "");
  const [docText, setDocText] = useState<string>("");

  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string>("");

  const supportingKeywords = useMemo(
    () => supportingRaw.split(/\n+/).map((s) => s.trim()).filter(Boolean),
    [supportingRaw]
  );

  async function onSaveDraft() {
    setStatus("");
    const products = extractAffiliateProducts(docJson);

    startTransition(async () => {
      try {
        await saveDraft({
          id: post.id,
          title,
          slug,
          target_keyword: targetKeyword,
          supporting_keywords: supportingKeywords,
          meta_description: metaDescription || undefined,
          content_json: docJson,
          content_html: docHtml,
          amazon_products: products,
        });
        setStatus("Rascunho salvo.");
      } catch (e: any) {
        setStatus(e?.message ?? "Erro ao salvar.");
      }
    });
  }

  async function onPublish(nextPublished: boolean) {
    setStatus("");
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("id", post.id);
        formData.append("published", nextPublished ? "true" : "false");
        await setPublishState(formData);
        setPublished(nextPublished);
        setStatus(nextPublished ? "Post publicado." : "Post despublicado.");
      } catch (e: any) {
        setStatus(e?.message ?? "Erro ao atualizar status.");
      }
    });
  }

  const previewHref = post.silo ? `/${post.silo.slug}/${slug}` : `/${slug}`;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[color:var(--muted-2)]">Editor • {post.silo?.name ?? "Sem silo"}</p>
            <h1 className="mt-2 text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-xs text-[color:var(--muted-3)]">URL: {previewHref}</p>
            <p className="mt-1 text-xs text-[color:var(--brand-accent)]">Status: {published ? "Publicado" : "Rascunho"}</p>
          </div>

          <div className="flex items-center gap-2">
            <a
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs hover:bg-[color:var(--brand-primary)]"
              href={previewHref}
              target="_blank"
              rel="noreferrer"
            >
              Ver página
            </a>

            <button
              type="button"
              onClick={onSaveDraft}
              disabled={pending}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--brand-primary)] px-4 py-2 text-xs font-semibold hover:bg-[color:var(--brand-primary)] disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Salvar rascunho"}
            </button>

            <button
              type="button"
              onClick={() => onPublish(!published)}
              disabled={pending}
              className="rounded-xl border border-[color:rgba(243,97,65,0.45)] bg-[color:var(--brand-hot)] px-4 py-2 text-xs font-semibold text-[color:var(--paper)] hover:bg-[color:var(--brand-hot)] disabled:opacity-60"
            >
              {pending ? "Atualizando…" : published ? "Despublicar" : "Publicar"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Título (H1)">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </Field>

          <Field label="Slug">
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </Field>

          <Field label="Target keyword (KGR)">
            <input
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </Field>

          <Field label="Meta description">
            <input
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
              placeholder="Até 160–180 caracteres, focada em clique e clareza."
            />
          </Field>


          <Field label="Supporting keywords (1 por linha)" className="md:col-span-2">
            <textarea
              value={supportingRaw}
              onChange={(e) => setSupportingRaw(e.target.value)}
              className="h-28 w-full resize-none rounded-xl border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-sm outline-none"
            />
          </Field>

          {status ? (
            <div className="md:col-span-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] px-4 py-3 text-xs text-[color:var(--muted)]">
              {status}
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
        <ReviewEditor
          initialJson={post.content_json}
          targetKeyword={targetKeyword}
          onChange={({ json, html, text }) => {
            setDocJson(json);
            setDocHtml(html);
            setDocText(text);
          }}
        />

        <SeoSidebar
          targetKeyword={targetKeyword}
          supportingKeywords={supportingKeywords}
          html={docHtml}
          text={docText}
        />
      </div>

      <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--paper)] p-6 text-xs text-[color:var(--muted-2)] space-y-2">
        <p className="font-medium text-[color:var(--ink)]">Checklist rápido (Amazon)</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Links de compra devem ter <code className="text-[color:var(--brand-accent)]">rel="sponsored"</code> (o Bubble Menu ajuda).</li>
          <li>Evite promessas absolutas. Prefira clareza: prós, contras e para quem é.</li>
          <li>Insira 1–3 cards de produto por artigo, bem posicionados (antes e depois dos comparativos).</li>
        </ul>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1 text-xs text-[color:var(--muted-2)]">{label}</p>
      {children}
    </div>
  );
}





