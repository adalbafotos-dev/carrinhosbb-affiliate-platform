import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";
import { isAdminAuthDisabled } from "@/lib/admin/settings";

export async function isAdminSession() {
  if (isAdminAuthDisabled()) return true;
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === "1";
}

export async function requireAdminSession() {
  if (isAdminAuthDisabled()) return;
  if (!(await isAdminSession())) {
    throw new Error("Unauthorized");
  }
}
