import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin/constants";

export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/admin");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD env ausente" }, { status: 500 });
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: "Senha invalida" }, { status: 401 });
  }

  const safeNext = nextPath.startsWith("/") ? nextPath : "/admin";
  const redirectUrl = new URL(safeNext, req.url);
  const response = NextResponse.redirect(redirectUrl, { status: 303 });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}
