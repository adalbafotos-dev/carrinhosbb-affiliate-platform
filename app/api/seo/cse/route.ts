import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/auth";
import { GoogleCseError } from "@/lib/google/customSearch";
import { searchCSE } from "@/lib/googleCSE/search";
import { checkRateLimit } from "@/lib/seo/rateLimit";

const PayloadSchema = z.object({
  query: z.string().min(2).max(120),
  num: z.number().int().min(1).max(10).optional(),
  start: z.number().int().min(1).max(91).optional(),
  hl: z.string().min(2).max(10).optional(),
  gl: z.string().min(2).max(5).optional(),
});

const RATE_LIMIT = {
  limit: 30,
  windowMs: 10 * 60 * 1000,
};

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `cse:${ip}`;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();

    const body = await request.json().catch(() => null);
    const parsed = PayloadSchema.safeParse({
      query: body?.query,
      num: typeof body?.num === "number" ? body.num : body?.num ? Number(body.num) : undefined,
      start: typeof body?.start === "number" ? body.start : body?.start ? Number(body.start) : undefined,
      hl: typeof body?.hl === "string" ? body.hl.trim() : undefined,
      gl: typeof body?.gl === "string" ? body.gl.trim() : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request", message: "Query invalida." }, { status: 400 });
    }

    const rate = checkRateLimit(getClientKey(request), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Limite de requisicoes atingido. Aguarde alguns minutos.",
          retryAt: rate.resetAt,
        },
        { status: 429 }
      );
    }

    const { query, num, start, hl, gl } = parsed.data;
    const response = await searchCSE(query, { num, start, hl, gl, useCache: true });

    return NextResponse.json(response, {
      headers: {
        "x-rate-limit-remaining": String(rate.remaining),
      },
    });
  } catch (error: any) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized", message: "Nao autorizado." }, { status: 401 });
    }
    if (error?.message === "missing_credentials") {
      return NextResponse.json(
        {
          error: "missing_credentials",
          message: "Configure GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX (env ou integracao no Admin).",
        },
        { status: 400 }
      );
    }
    if (error instanceof GoogleCseError) {
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json({ error: "invalid_credentials", message: "Credenciais Google invalidas." }, { status: error.status });
      }
      if (error.status === 429) {
        return NextResponse.json({ error: "quota_exceeded", message: "Quota da API do Google excedida." }, { status: 429 });
      }
      if (error.status === 504) {
        return NextResponse.json({ error: "timeout", message: "Timeout ao consultar o Google." }, { status: 504 });
      }
      return NextResponse.json(
        { error: "google_error", message: "Erro ao consultar o Google.", details: error.code },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json({ error: "internal_error", message: "Erro interno." }, { status: 500 });
  }
}
