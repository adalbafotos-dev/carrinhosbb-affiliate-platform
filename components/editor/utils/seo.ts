export function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

export function countOccurrences(text: string, phrase: string) {
  const t = normalizeText(text);
  const p = normalizeText(phrase);
  if (!p) return 0;

  // Escapa regex
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "g");
  const matches = t.match(re);
  return matches ? matches.length : 0;
}

export function wordCount(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return 0;
  return cleaned.split(" ").length;
}

export function extractFirstParagraphText(html: string) {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const p = doc.querySelector("p");
    return p?.textContent?.trim() ?? "";
  } catch {
    return "";
  }
}
