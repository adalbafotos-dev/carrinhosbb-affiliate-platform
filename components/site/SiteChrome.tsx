"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { SiteHeader, type SiteHeaderLink } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export function SiteChrome({ children, headerLinks }: { children: ReactNode; headerLinks?: SiteHeaderLink[] }) {
  const segments = useSelectedLayoutSegments();
  const isAdminPreview = segments[0] === "admin" && segments[1] === "preview";
  const isAdmin = segments[0] === "admin" && !isAdminPreview;
  const isHome = !isAdmin && segments.length === 0;

  useEffect(() => {
    if (!isHome) return;

    const main = document.querySelector("main");
    if (!main) return;

    const sections = Array.from(main.querySelectorAll<HTMLElement>("div.page-in > section[data-home-scroll]"));
    if (!sections.length) return;

    main.classList.add("home-scroll-ready");

    for (const section of sections) {
      section.classList.add("home-scroll-section", "is-visible");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = entry.target as HTMLElement;
          if (entry.isIntersecting || entry.intersectionRatio > 0.16) {
            section.classList.add("is-visible");
          } else {
            section.classList.remove("is-visible");
          }
        }
      },
      {
        threshold: [0.06, 0.16, 0.34],
        rootMargin: "-4% 0px -12% 0px",
      },
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => {
      observer.disconnect();
      main.classList.remove("home-scroll-ready");
      for (const section of sections) {
        section.classList.remove("home-scroll-section", "is-visible");
      }
    };
  }, [isHome]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={isHome ? "home-hero-shell" : undefined}>
        <SiteHeader links={headerLinks} />
        <main className={`mx-auto w-full max-w-6xl px-4 pb-10 ${isHome ? "pt-0" : "pt-10"}`}>{children}</main>
      </div>
      <SiteFooter />
    </>
  );
}
