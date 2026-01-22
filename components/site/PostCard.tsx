import Link from "next/link";
import type { PostWithSilo } from "@/lib/types";

export function PostCard({ post }: { post: PostWithSilo }) {
  const href = post.silo ? `/${post.silo.slug}/${post.slug}` : `/${post.slug}`;

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[color:var(--border)] bg-[color:var(--paper)] p-5 transition hover:bg-[color:var(--surface-muted)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[color:var(--muted-2)]">{post.silo?.name ?? "Post"}</p>
          <h3 className="mt-1 text-base font-semibold leading-snug group-hover:text-[color:var(--brand-hot)]">
            {post.title}
          </h3>
          <p className="mt-2 text-sm text-[color:var(--muted-2)]">
            {post.meta_description ?? "Abrir artigo"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[color:var(--brand-accent)] bg-[color:var(--brand-primary)] px-3 py-1 text-xs text-[color:var(--ink)]">
          Ver
        </span>
      </div>
    </Link>
  );
}

