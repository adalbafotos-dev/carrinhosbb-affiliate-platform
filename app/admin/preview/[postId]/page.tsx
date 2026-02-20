import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminSession } from "@/lib/admin/auth";
import { adminGetPostById } from "@/lib/db";
import { renderEditorDocToHtml } from "@/lib/editor/docRenderer";
import { PostToc } from "@/components/site/PostToc";
import { ANA_LINDA_PROFILE, findCollaboratorByName } from "@/lib/site/collaborators";
import { isStandardAffiliateDisclosure } from "@/lib/site";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveContentHtml(post: NonNullable<Awaited<ReturnType<typeof adminGetPostById>>>) {
  const contentHtmlFromJson = post.content_json ? renderEditorDocToHtml(post.content_json) : "";
  const storedHtml = post.content_html || "";

  const jsonHasImg = /<img\b/i.test(contentHtmlFromJson);
  const storedHasImg = /<img\b/i.test(storedHtml);
  const jsonHasCtaColor = /data-bg-color="[^"]+"/i.test(contentHtmlFromJson);
  const storedHasCtaColor = /data-bg-color="[^"]+"/i.test(storedHtml);
  const shouldFallbackToStored = (!jsonHasImg && storedHasImg) || (!jsonHasCtaColor && storedHasCtaColor);

  return shouldFallbackToStored ? storedHtml : contentHtmlFromJson || storedHtml;
}

function statusLabel(post: NonNullable<Awaited<ReturnType<typeof adminGetPostById>>>) {
  const status = post.status ?? (post.published ? "published" : "draft");
  if (status === "published") return "Publicado";
  if (status === "review") return "Revisao";
  if (status === "scheduled") return "Agendado";
  return "Rascunho";
}

function normalizeName(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default async function AdminPreviewPage({ params }: { params: Promise<{ postId: string }> }) {
  await requireAdminSession();
  const { postId } = await params;

  if (!isUuid(postId)) return notFound();

  const post = await adminGetPostById(postId);
  if (!post) return notFound();

  const contentHtml = resolveContentHtml(post);
  const rawAuthorName = post.expert_name || post.author_name || "";
  const authorProfile = findCollaboratorByName(rawAuthorName) ?? ANA_LINDA_PROFILE;
  const displayAuthorName = authorProfile?.name || rawAuthorName || ANA_LINDA_PROFILE.name;
  const showReviewer =
    Boolean(post.reviewed_by?.trim()) && normalizeName(post.reviewed_by) !== normalizeName(displayAuthorName);
  const shouldShowTopDisclaimer =
    Boolean(post.disclaimer?.trim()) && !isStandardAffiliateDisclosure(post.disclaimer);
  const showProfessionalName =
    Boolean(authorProfile.professionalName) &&
    normalizeName(authorProfile.professionalName) !== normalizeName(authorProfile.name);
  const publicPath = post.silo?.slug ? `/${post.silo.slug}/${post.slug}` : null;

  return (
    <div className="post-page relative min-h-screen bg-transparent pb-12">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[600px] bg-linear-to-b from-white via-white/200 to-transparent" />

      <section className="relative z-10 bg-transparent">
        <article className="page-in relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-5 md:px-6">
          <div className="mb-5 rounded-xl border border-(--border) bg-(--surface) p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-(--muted-2)">Preview interno (admin)</p>
                <p className="text-sm text-(--muted)">
                  Status: <strong className="text-(--ink)">{statusLabel(post)}</strong>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/editor/${post.id}`}
                  className="rounded-md border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-sm"
                >
                  Voltar ao editor
                </Link>
                {publicPath ? (
                  <a
                    href={publicPath}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-(--border) bg-(--surface-muted) px-3 py-1.5 text-sm"
                  >
                    Abrir URL publica
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <header className="space-y-3">
            <nav className="text-[11px] text-(--muted-2)">
              <a href="/">Home</a> / <a href={`/${post.silo?.slug ?? ""}`}>{post.silo?.name ?? "Sem silo"}</a> / {post.title}
            </nav>

            <h1 className="text-3xl font-semibold leading-tight md:text-4xl">{post.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-(--muted)">
              <div className="flex items-center gap-1">
                <span className="text-(--muted-2)">Por</span>
                <span className="font-semibold text-(--ink)">{displayAuthorName || ANA_LINDA_PROFILE.name}</span>
              </div>

              {showReviewer ? (
                <div className="flex items-center gap-1 border-l border-(--border) pl-4">
                  <span className="text-(--muted-2)">Revisao tecnica</span>
                  <span className="font-semibold text-(--ink)">{post.reviewed_by}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-1 border-l border-(--border) pl-4">
                <span className="text-(--muted-2)">Atualizado</span>
                <time>
                  {new Date(post.updated_at || post.published_at || new Date()).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>
            </div>
          </header>

          {post.hero_image_url ? (
            <div className="mt-6 overflow-hidden rounded-xl">
              <img
                src={post.hero_image_url}
                alt={post.hero_image_alt || post.title}
                className="h-auto w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : null}
        </article>
      </section>

      <article className="page-in mx-auto max-w-6xl px-4 pt-8 sm:px-5 md:px-6">
        <div className="grid gap-8 md:grid-cols-[232px_minmax(0,1fr)]">
          <PostToc contentSelector=".content" title="Indice" />

          <div className="space-y-8">
            {shouldShowTopDisclaimer ? <div className="text-xs italic text-(--muted)">{post.disclaimer}</div> : null}

            <div className="content">
              {contentHtml ? (
                <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
              ) : (
                <p className="text-sm text-(--muted)">
                  Este artigo ainda nao tem conteudo. Abra no <a href={`/admin/editor/${post.id}`} className="underline">editor</a>.
                </p>
              )}
            </div>

            {Array.isArray(post.sources) && post.sources.length ? (
              <div className="rounded-2xl border border-(--border) bg-transparent p-6 text-xs text-(--muted)">
                <p className="text-[11px] font-semibold uppercase text-(--muted-2)">Fontes</p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {post.sources.map((source: any, index: number) => (
                    <li key={`${source.url}-${index}`}>
                      <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                        {source.label || source.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {authorProfile ? (
              <section className="rounded-2xl border border-(--border) bg-(--surface-muted) p-5 md:p-6">
                <div className="grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                  <img
                    src={authorProfile.image.src}
                    alt={authorProfile.image.alt}
                    width={authorProfile.image.width}
                    height={authorProfile.image.height}
                    className="h-24 w-24 rounded-xl border border-(--border) object-cover"
                    loading="lazy"
                  />
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-(--muted-2)">Autor / Especialista</p>
                    <h2 className="text-lg font-semibold text-(--ink)">{authorProfile.name}</h2>
                    {showProfessionalName ? (
                      <p className="text-xs font-medium text-(--muted-2)">{authorProfile.professionalName}</p>
                    ) : null}
                    <p className="text-sm leading-relaxed text-(--muted)">{authorProfile.expertBoxShort}</p>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <a href="/sobre" className="underline">
                        Ver metodologia editorial
                      </a>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
