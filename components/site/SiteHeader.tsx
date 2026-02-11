"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import logoLindisse from "@/public/logomarca-lindisse.webp";

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
];

const COMPACT_SCROLL_THRESHOLD = 12;

function SearchBar({ className = "" }: { className?: string }) {
  return (
    <form
      action="/"
      method="get"
      className={`flex items-center gap-2 rounded-2xl border border-(--border) bg-(--paper) px-3 py-2 shadow-[0_8px_22px_rgba(43,44,48,0.06)] ${className}`}
    >
      <Search size={16} className="shrink-0 text-(--brand-accent)" />
      <input
        name="q"
        type="search"
        placeholder="Buscar por cabine, gel, técnica..."
        className="min-w-0 flex-1 bg-transparent text-sm text-(--ink) outline-none placeholder:text-(--muted-2)"
      />
      <button
        type="submit"
        className="rounded-xl bg-(--brand-hot) px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-95"
      >
        Buscar
      </button>
    </form>
  );
}

function MenuPanel({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border border-(--border) bg-[color:rgba(255,255,255,0.95)] p-3 shadow-[0_14px_26px_rgba(43,44,48,0.12)] backdrop-blur ${className}`}
    >
      <div className="space-y-3">
        <SearchBar />
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            onClick={onNavigate}
            className="rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm font-semibold text-(--ink)"
          >
            Início
          </Link>
          {ACTIVE_SILO_MENU.map((silo) => (
            <Link
              key={silo.slug}
              href={silo.slug}
              title={silo.categoryH1}
              onClick={onNavigate}
              className="rounded-xl border border-(--border) bg-white px-3 py-2 text-sm font-medium text-(--muted-2) hover:border-(--brand-hot) hover:text-(--brand-hot)"
            >
              {silo.name}
            </Link>
          ))}
          <Link
            href="/contato"
            onClick={onNavigate}
            className="rounded-xl border border-(--brand-hot) bg-(--brand-hot) px-3 py-2 text-sm font-semibold text-white hover:brightness-95"
          >
            Contato
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const siloScrollerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const readScrollTop = () =>
      Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0, document.body.scrollTop || 0);

    let rafId = 0;
    const syncCompactState = () => {
      rafId = 0;
      const compact = readScrollTop() > COMPACT_SCROLL_THRESHOLD;
      setIsCompact(compact);
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(syncCompactState);
    };

    syncCompactState();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
  }, []);

  const scrollSiloMenu = (direction: "left" | "right") => {
    const next = direction === "left" ? -220 : 220;
    siloScrollerRef.current?.scrollBy({ left: next, behavior: "smooth" });
  };

  const handleNavigate = () => setIsMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          <div className={`flex items-center gap-3 ${isCompact ? "justify-end" : "justify-between"}`}>
            <Link
              href="/"
              className={`inline-flex items-center transition-all duration-300 ${isCompact
                ? "pointer-events-none max-w-0 -translate-y-1 overflow-hidden opacity-0"
                : "max-w-[180px] translate-y-0 opacity-100"
                }`}
            >
              <Image
                src={logoLindisse}
                alt="Lindisse"
                priority
                className="h-12 w-auto"
              />
            </Link>

            <button
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
              aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={isMenuOpen}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-(--border) bg-[color:rgba(255,255,255,0.95)] text-(--muted-2) shadow-[0_8px_22px_rgba(43,44,48,0.14)] backdrop-blur hover:text-(--ink)"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {isMenuOpen ? <MenuPanel className="mt-2" onNavigate={handleNavigate} /> : null}
        </div>
      </header>

      {isCompact ? (
        <header className="sticky top-0 z-50 hidden pointer-events-none md:block">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-4 py-3">
            <div className="pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsMenuOpen((value) => !value)}
                aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={isMenuOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-(--border) bg-[color:rgba(255,255,255,0.95)] text-(--muted-2) shadow-[0_8px_22px_rgba(43,44,48,0.14)] backdrop-blur hover:text-(--ink)"
              >
                {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              {isMenuOpen ? (
                <MenuPanel className="mt-2 w-[min(92vw,420px)]" onNavigate={handleNavigate} />
              ) : null}
            </div>
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-40 hidden md:block">
          <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center">
                <Image
                  src={logoLindisse}
                  alt="Lindisse"
                  priority
                  className="h-12 w-auto md:h-14"
                />
              </Link>
              <SearchBar className="w-full md:w-[460px]" />
            </div>

            <nav
              aria-label="Silos principais"
              className="mt-4 flex items-center gap-2 rounded-2xl border border-(--border) bg-(--paper) p-2 shadow-[0_8px_22px_rgba(43,44,48,0.06)]"
            >
              <Link
                href="/"
                className="shrink-0 rounded-xl border border-(--border) bg-(--surface-muted) px-3 py-2 text-sm font-semibold text-(--ink) hover:border-(--brand-hot)"
              >
                Início
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
      )}
    </>
  );
}
