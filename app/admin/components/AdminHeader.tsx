"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminHeader() {
    const pathname = usePathname();

    // Logic to determine title and actions based on current path
    const isSiloEditor = pathname.startsWith("/admin/silos/") && pathname.split("/").length > 3; // /admin/silos/[slug]
    const isSiloList = pathname === "/admin/silos";
    const isNewPost = pathname === "/admin/editor/new";
    const isPostEditor = pathname.startsWith("/admin/editor/") && !isNewPost;

    let title = "Cockpit CMS";
    let description = "";

    if (isSiloEditor) {
        title = "Editar Silo";
        // We could pass description dynamically if needed, but for now hardcode generic or skip
    } else if (isSiloList) {
        title = "Silos";
    } else if (isNewPost) {
        title = "Novo Post";
    } else if (isPostEditor) {
        title = "Editar Post";
    }

    return (
        <header className="flex h-12 items-center justify-between border-b border-(--border) bg-(--surface) px-4">
            <div className="flex items-center gap-4">
                <div className="text-sm font-semibold tracking-tight">{title}</div>
                {/* Optional: Breadcrumbs or description could go here */}
            </div>

            <nav className="flex items-center gap-2 text-[11px] font-semibold uppercase text-(--muted)">
                <Link
                    className={`rounded-md px-3 py-1.5 hover:bg-(--accent-soft) ${pathname === "/admin" ? "bg-(--surface-muted) text-(--text)" : "text-(--muted)"
                        }`}
                    href="/admin"
                >
                    Conteúdo
                </Link>
                <Link
                    className={`rounded-md px-3 py-1.5 hover:bg-(--accent-soft) ${isSiloList ? "bg-(--surface-muted) text-(--text)" : "text-(--muted)"
                        }`}
                    href="/admin/silos"
                >
                    Silos
                </Link>
                <Link
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-500"
                    href="/admin/editor/new"
                >
                    Novo post
                </Link>
            </nav>
        </header>
    );
}
