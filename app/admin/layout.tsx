import Link from "next/link";
import type { ReactNode } from "react";
import { AdminHeader } from "@/app/admin/components/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-(--bg) text-(--text)">
      <AdminHeader />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="h-full w-full overflow-auto">{children}</div>
      </div>
    </div>
  );
}
