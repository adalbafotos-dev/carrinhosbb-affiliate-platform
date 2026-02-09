"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRef } from "react";

type MenuSilo = {
  name: string;
  slug: string;
  categoryH1: string;
};

const ACTIVE_SILO_MENU: MenuSilo[] = [
  {
    name: "Equipamentos",
    slug: "/equipamentos",
    categoryH1: "Melhores Equipamentos e Cabines para Manicure",
  },
  // {
  //   name: "Kits",
  //   slug: "/kits",
  //   categoryH1: "Kits Completos para Unhas de Gel e Fibra",
  // },
  // {
  //   name: "Fibra",
  //   slug: "/fibra",
  //   categoryH1: "Tudo para Unhas de Fibra de Vidro",
  // },
  // {
  //   name: "Geis",
  //   slug: "/geis",
  //   categoryH1: "Os Melhores Geis, Top Coats e Preparadores",
  // },
  // {
  //   name: "Posticas",
  //   slug: "/posticas",
  //   categoryH1: "Unhas Posticas Realistas e Naturais",
  // },
  // {
  //   name: "Decoracao",
  //   slug: "/decoracao",
  //   categoryH1: "Materiais para Decoracao e Nail Art",
  // },
  // {
  //   name: "Profissao",
  //   slug: "/profissao",
  //   categoryH1: "Gestao e Carreira para Manicures de Sucesso",
  // },
];

export function SiteHeader() {
  const siloScrollerRef = useRef<HTMLDivElement>(null);

  const scrollSiloMenu = (direction: "left" | "right") => {
    const next = direction === "left" ? -220 : 220;
    siloScrollerRef.current?.scrollBy({ left: next, behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-(--border) bg-[color:rgba(255,255,255,0.9)] backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="display text-xl font-semibold tracking-tight text-(--ink) md:text-2xl">
            Lindisse
          </Link>

          <form
            action="/"
            method="get"
            className="flex w-full items-center gap-2 rounded-2xl border border-(--border) bg-(--paper) px-3 py-2 shadow-[0_8px_22px_rgba(43,44,48,0.06)] md:w-[460px]"
          >
            <Search size={16} className="shrink-0 text-(--brand-accent)" />
            <input
              name="q"
              type="search"
              placeholder="Buscar por cabine, gel, tecnica..."
              className="min-w-0 flex-1 bg-transparent text-sm text-(--ink) outline-none placeholder:text-(--muted-2)"
            />
            <button
              type="submit"
              className="rounded-xl bg-(--brand-hot) px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95"
            >
              Buscar
            </button>
          </form>
        </div>

        <nav
          aria-label="Silos principais"
          className="mt-4 flex items-center gap-2 rounded-2xl border border-(--border) bg-(--paper) p-2"
        >
          <Link
            href="/"
            className="shrink-0 rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm font-semibold text-(--ink) hover:border-(--brand-hot)"
          >
            Inicio
          </Link>

          <button
            type="button"
            onClick={() => scrollSiloMenu("left")}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-(--border) text-(--muted-2) hover:text-(--ink) md:inline-flex"
            aria-label="Deslizar silos para a esquerda"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={siloScrollerRef}
            className="flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex w-max items-center gap-2 px-1">
              {ACTIVE_SILO_MENU.map((silo) => (
                <Link
                  key={silo.slug}
                  href={silo.slug}
                  title={silo.categoryH1}
                  className="shrink-0 rounded-xl border border-(--border) bg-white px-3 py-2 text-sm font-medium text-(--muted-2) hover:border-(--brand-hot) hover:text-(--brand-hot)"
                >
                  {silo.name}
                </Link>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollSiloMenu("right")}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-(--border) text-(--muted-2) hover:text-(--ink) md:inline-flex"
            aria-label="Deslizar silos para a direita"
          >
            <ChevronRight size={16} />
          </button>

          <Link
            href="/contato"
            className="shrink-0 rounded-xl border border-(--brand-hot) bg-(--brand-hot) px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Contato
          </Link>
        </nav>
      </div>
    </header>
  );
}
