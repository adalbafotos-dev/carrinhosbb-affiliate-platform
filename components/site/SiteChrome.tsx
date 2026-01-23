"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import type { Silo } from "@/lib/types";

export function SiteChrome({ children, silos = [] }: { children: ReactNode; silos?: Silo[] }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader silos={silos} />
      <main className="mx-auto w-full max-w-6xl px-4 py-10">{children}</main>
      <SiteFooter />
    </>
  );
}
