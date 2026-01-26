import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

const ALLOWED_HOSTS = ["amzn.to", "amazon.", "www.amazon."];

function isAllowedHost(hostname: string) {
  const lower = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((host) => (host.endsWith(".") ? lower.includes(host) : lower === host));
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function matchMeta(html: string, key: string) {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=[\"']${key}[\"'][^>]+content=[\"']([^\"']+)[\"'][^>]*>`,
    "i"
  );
  const match = regex.exec(html);
  return match ? decodeHtml(match[1]).trim() : "";
}

function matchText(html: string, regex: RegExp) {
  const match = regex.exec(html);
  return match ? decodeHtml(match[1]).trim() : "";
}

function extractPreview(html: string) {
  const title =
    matchMeta(html, "og:title") ||
    matchText(html, /id="productTitle"[^>]*>\s*([^<]+)/i) ||
    matchText(html, /<title>([^<]+)<\/title>/i);

  // Expanded selectors
  const imageMeta =
    matchMeta(html, "og:image") ||
    matchText(html, /id="landingImage"[^>]*data-old-hires="([^"]+)"/i) ||
    matchText(html, /id="landingImage"[^>]*src="([^"]+)"/i) ||
    matchText(html, /id="imgBlkFront"[^>]*src="([^"]+)"/i) ||
    matchText(html, /id="ebooksImgBlkFront"[^>]*src="([^"]+)"/i);

  let image = imageMeta;
  if (!image) {
    const dynamic = matchText(html, /data-a-dynamic-image=['"]({[^'"]+})['"]/i);
    if (dynamic) {
      try {
        const parsed = JSON.parse(dynamic);
        // keys are urls, take the first one or largest
        const first = Object.keys(parsed)[0];
        if (first) image = first;
      } catch {
        // ignore
      }
    }
  }

  const amount =
    matchMeta(html, "product:price:amount") ||
    matchMeta(html, "og:price:amount") ||
    matchText(html, /id="priceblock_ourprice"[^>]*>\s*([^<]+)/i) ||
    matchText(html, /id="priceblock_dealprice"[^>]*>\s*([^<]+)/i) ||
    matchText(html, /class="a-price-whole"[^>]*>([^<]+)/i) ||
    matchText(html, /class="a-color-price"[^>]*>([^<]+)/i);

  const currency = matchMeta(html, "product:price:currency") || matchMeta(html, "og:price:currency") || "R$";
  let price = amount ? amount.trim() : "";

  if (price) {
    if (/^\d/.test(price) && !price.includes(currency)) {
      // Check for fraction
      const fraction = matchText(html, /class="a-price-fraction"[^>]*>([^<]+)/i);
      if (price.indexOf(",") === -1 && price.indexOf(".") === -1 && fraction) {
        price = `${price},${fraction}`;
      }
      price = `${currency} ${price}`;
    }
  }

  const ratingText =
    matchText(html, /id="acrPopover"[^>]*title="([^"]+)"/i) ||
    matchText(html, /data-hook="rating-out-of-text"[^>]*>\s*([^<]+)/i) ||
    matchText(html, /class="a-icon-alt"[^>]*>([^<]+)/i);

  const ratingMatch = ratingText.match(/([0-9]+[.,]?[0-9]*)/);
  const rating = ratingMatch ? Number(ratingMatch[1].replace(",", ".")) : undefined;

  return {
    title: title || undefined,
    image: image || undefined,
    price: price || undefined,
    rating: Number.isFinite(rating) ? rating : undefined,
  };
}

export async function POST(req: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => ({}));
  const url = typeof payload?.url === "string" ? payload.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  function normalizeHref(value: string) {
    if (!value) return "";
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed.replace(/^\/+/, "")}`;
  }

  let parsed: URL;
  let normalizedUrl = url;
  try {
    parsed = new URL(normalizeHref(url));
    normalizedUrl = parsed.toString();
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  try {
    const agents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    ];
    const userAgent = agents[Math.floor(Math.random() * agents.length)];

    const headers = {
      "User-Agent": userAgent,
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    };

    // Use default fetch without specialized scraper headers first, sometimes it is better
    const res = await fetch(normalizedUrl, {
      headers,
      redirect: 'follow',
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      // Fallback minimal
      const fallback = await fetch(normalizedUrl, { redirect: 'follow', next: { revalidate: 0 } });
      if (fallback.ok) {
        const html = await fallback.text();
        return NextResponse.json(extractPreview(html));
      }
      return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
    }

    const html = await res.text();
    if (html.includes("captcha") || html.includes("api-services-support@amazon.com")) {
      return NextResponse.json({ error: "Captcha detected" }, { status: 429 });
    }

    return NextResponse.json(extractPreview(html));
  } catch (err: any) {
    console.error("Scraping error:", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
