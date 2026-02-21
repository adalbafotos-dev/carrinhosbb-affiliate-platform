"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SITE_NAME } from "@/lib/site";

export type SiteHeaderLink = {
  href: string;
  label: string;
  submenu?: Array<{
    label: string;
    items: Array<{ href: string; label: string }>;
  }>;
};

const FALLBACK_MAIN_LINKS: SiteHeaderLink[] = [
  { href: "/", label: "Home" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

const HEADER_LOGO_SRC = "/logomarca-bebe-na-rota.webp";
const DESKTOP_COMPACT_ENTER_Y = 56;
const DESKTOP_COMPACT_EXIT_Y = 20;
const RIGHT_ALIGNED_LINK_HREFS = new Set(["/sobre", "/contato"]);

function SearchBar({ className = "" }: { className?: string }) {
  return (
    <form
      action="/"
      method="get"
      className={`brand-card flex items-center gap-2 rounded-2xl px-3 py-2 ${className}`}
    >
      <Search size={16} className="shrink-0 text-(--brand-accent)" />
      <input
        name="q"
        type="search"
        placeholder="Buscar por carrinho, passeio, viagem..."
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

function MobileMenu({ links, onNavigate }: { links: SiteHeaderLink[]; onNavigate: () => void }) {
  return (
    <div className="menu-panel-pop brand-card mt-3 space-y-3 rounded-2xl p-3 backdrop-blur">
      <SearchBar />
      <nav className="grid grid-cols-1 gap-2" aria-label="Navegacao principal">
        {links.map((link) => (
          <div key={link.href} className="space-y-2 rounded-xl border border-(--border) bg-white/70 px-2 py-2">
            <Link
              href={link.href}
              onClick={onNavigate}
              className="brand-card block rounded-xl px-3 py-2 text-sm font-medium text-(--muted-2) hover:brightness-95 hover:text-(--brand-hot)"
            >
              {link.label}
            </Link>

            {Array.isArray(link.submenu) && link.submenu.length > 0 ? (
              <div className="space-y-2 px-2 pb-1">
                {link.submenu.map((group) => (
                  <div key={`${link.href}-${group.label}`} className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-(--muted-2)">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <Link
                          key={`${link.href}-${item.href}`}
                          href={item.href}
                          onClick={onNavigate}
                          className="block rounded-md px-2 py-1 text-xs text-(--muted) hover:bg-white hover:text-(--brand-hot)"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
    </div>
  );
}

function DesktopNavItem({ link }: { link: SiteHeaderLink }) {
  const hasSubmenu = Array.isArray(link.submenu) && link.submenu.length > 0;
  return (
    <div className={`relative ${hasSubmenu ? "group" : ""}`}>
      <Link
        href={link.href}
        className="brand-card rounded-xl px-3 py-2 text-sm font-medium text-(--muted-2) hover:brightness-95 hover:text-(--brand-hot)"
      >
        {link.label}
      </Link>

      {hasSubmenu ? (
        <div className="pointer-events-none invisible absolute left-0 top-full z-40 w-[360px] translate-y-1 pt-2 opacity-0 transition-all duration-100 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="brand-card rounded-2xl p-3 shadow-[0_14px_40px_rgba(30,40,60,0.18)]">
            <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
              {link.submenu!.map((group) => (
                <section key={`${link.href}-${group.label}`} className="space-y-1.5">
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-(--muted-2)">
                    {group.label}
                  </p>
                  <div className="grid gap-1">
                    {group.items.map((item) => (
                      <Link
                        key={`${link.href}-${item.href}`}
                        href={item.href}
                        className="rounded-lg px-2 py-1.5 text-xs text-(--muted) hover:bg-white hover:text-(--brand-hot)"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuToggleButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
      aria-expanded={isOpen}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-(--border) bg-[color:rgba(255,255,255,0.95)] text-(--muted-2) shadow-[0_8px_22px_rgba(43,44,48,0.14)]"
    >
      {isOpen ? <X size={18} /> : <Menu size={18} />}
    </button>
  );
}

export function SiteHeader({ links: linksProp }: { links?: SiteHeaderLink[] }) {
  const links = Array.isArray(linksProp) && linksProp.length > 0 ? linksProp : FALLBACK_MAIN_LINKS;
  const primaryLinks = links.filter((link) => !RIGHT_ALIGNED_LINK_HREFS.has(link.href));
  const secondaryLinks = links.filter((link) => RIGHT_ALIGNED_LINK_HREFS.has(link.href));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);
  const [isDesktopCompact, setIsDesktopCompact] = useState(false);
  const desktopCompactRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = Math.max(window.scrollY || 0, document.documentElement.scrollTop || 0, document.body.scrollTop || 0);
      const nextCompact = desktopCompactRef.current ? scrollY > DESKTOP_COMPACT_EXIT_Y : scrollY > DESKTOP_COMPACT_ENTER_Y;
      if (nextCompact === desktopCompactRef.current) return;
      desktopCompactRef.current = nextCompact;
      setIsDesktopCompact(nextCompact);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isDesktopCompact) {
      setIsDesktopMenuOpen(false);
    }
    desktopCompactRef.current = isDesktopCompact;
  }, [isDesktopCompact]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-(--border) bg-[rgba(255,255,255,0.88)] backdrop-blur md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label={`${SITE_NAME} - Home`} className="inline-flex items-center">
              <Image
                src={HEADER_LOGO_SRC}
                alt={SITE_NAME}
                width={184}
                height={56}
                sizes="184px"
                priority
                className="h-10 w-auto object-contain"
              />
            </Link>
            <MenuToggleButton
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((value) => !value)}
            />
          </div>

          {isMobileMenuOpen ? <MobileMenu links={links} onNavigate={() => setIsMobileMenuOpen(false)} /> : null}
        </div>
      </header>

      <header
        className={`sticky top-0 z-50 hidden transition-[background-color,border-color,backdrop-filter] duration-200 ease-out md:block ${
          isDesktopCompact
            ? "border-b border-transparent bg-transparent backdrop-blur-none"
            : "border-b border-(--border) bg-[rgba(255,255,255,0.88)] backdrop-blur"
        }`}
      >
        <div
          className={`mx-auto w-full max-w-6xl px-4 transition-[padding] duration-200 ease-out ${
            isDesktopCompact ? "py-2" : "py-3"
          }`}
        >
          <div
            className={`transition-[max-height,opacity,transform] duration-200 ease-out ${
              isDesktopCompact
                ? "pointer-events-none max-h-0 -translate-y-2 overflow-hidden opacity-0"
                : "max-h-[240px] translate-y-0 overflow-visible opacity-100"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/" aria-label={`${SITE_NAME} - Home`} className="inline-flex items-center">
                <Image
                  src={HEADER_LOGO_SRC}
                  alt={SITE_NAME}
                  width={220}
                  height={66}
                  sizes="220px"
                  priority
                  className="h-12 w-auto object-contain"
                />
              </Link>
              <SearchBar className="w-full md:w-[460px]" />
            </div>

            <nav
              aria-label="Navegacao principal"
              className="brand-card mt-3 flex items-center rounded-2xl p-2"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {primaryLinks.map((link) => (
                  <DesktopNavItem key={link.href} link={link} />
                ))}
              </div>

              {secondaryLinks.length > 0 ? (
                <div className="ml-2 flex shrink-0 items-center gap-2">
                  {secondaryLinks.map((link) => (
                    <DesktopNavItem key={link.href} link={link} />
                  ))}
                </div>
              ) : null}
            </nav>
          </div>

          <div
            className={`overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out ${
              isDesktopCompact
                ? "max-h-[72px] translate-y-0 opacity-100"
                : "pointer-events-none max-h-0 -translate-y-2 opacity-0"
            }`}
          >
            <div className="flex items-center justify-end">
              <MenuToggleButton
                isOpen={isDesktopMenuOpen}
                onClick={() => setIsDesktopMenuOpen((value) => !value)}
              />
            </div>
          </div>

          {isDesktopCompact && isDesktopMenuOpen ? (
            <MobileMenu links={links} onNavigate={() => setIsDesktopMenuOpen(false)} />
          ) : null}
        </div>
      </header>
    </>
  );
}
