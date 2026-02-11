"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isHome = pathname === "/";

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <div className={isHome ? "home-hero-shell" : undefined}>
        <SiteHeader />
        <main className={`mx-auto w-full max-w-6xl px-4 pb-10 ${isHome ? "pt-0" : "pt-10"}`}>{children}</main>
      </div>
      <SiteFooter />
    </>
  );
}
