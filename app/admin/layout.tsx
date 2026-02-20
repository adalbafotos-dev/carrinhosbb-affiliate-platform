"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { AdminHeader } from "@/app/admin/components/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const isPreviewRoute = segments[0] === "preview";

  if (isPreviewRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-(--bg) text-(--text)">
      <AdminHeader />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="h-full w-full overflow-auto">{children}</div>
      </div>
    </div>
  );
}
