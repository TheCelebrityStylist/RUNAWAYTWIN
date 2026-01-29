// FILE: lib/scrape/sources/duckduckgoShopping.ts

import * as cheerio from "cheerio";
import { fetchHtml } from "../http";

export type ScrapedProduct = {
  title: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
  source: "duckduckgo";
};

function normalizePrice(text: string): { value?: number; currency?: string } {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return {};

  // Common patterns: "€ 129", "EUR 129", "$129.99"
  const cur =
    t.includes("€") ? "EUR" : t.includes("$") ? "USD" : t.toUpperCase().includes("GBP") ? "GBP" : t.toUpperCase().includes("EUR") ? "EUR" : undefined;

  const num = t
    .replace(/[^\d,.\-]/g, "")
    .replace(/(\d),(\d{2})$/g, "$1.$2") // 129,99 -> 129.99
    .replace(/,/g, ""); // 1,299 -> 1299

  const v = Number(num);
  if (!Number.isFinite(v) || v <= 0) return { currency: cur };
  return { value: v, currency: cur };
}

function absUrl(href: string): string | null {
  try {
    // DDG often uses redirect links; keep as-is if absolute.
    const u = new URL(href, "https://duckduckgo.com/");
    return u.toString();
  } catch {
    return null;
  }
}

export async function searchDuckDuckGoShopping(query: string, limit = 12): Promise<ScrapedProduct[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `https://duckduckgo.com/?q=${encodeURIComponent(q)}&ia=shopping`;
  const html = await fetchHtml(url, { timeoutMs: 9000 });
  if (!html) return [];

  const $ = cheerio.load(html);

  const out: ScrapedProduct[] = [];
  const seen = new Set<string>();

  // Try multiple selectors to be resilient to markup changes.
  const candidates = [
    // Shopping tiles (varies)
    "a[data-testid='result-title-a']",
    "a.tile__title",
    "a.result__a",
    "a[href*='duckduckgo.com/y.js']",
    "a[href^='https://']",
  ];

  for (const sel of candidates) {
    $(sel).each((_, el) => {
      if (out.length >= limit) return;

      const a = $(el);
      const href = a.attr("href") || "";
      const title = a.text().replace(/\s+/g, " ").trim();
      const u = absUrl(href);

      if (!title || !u) return;

      // Dedup by hostname+path
      try {
        const uu = new URL(u);
        const key = `${uu.hostname.replace(/^www\./, "")}${uu.pathname}`;
        if (seen.has(key)) return;
        seen.add(key);
      } catch {
        return;
      }

      // Attempt to find image + price near the link
      const root = a.closest("article, .tile, .result, li, div");
      const img =
        root.find("img").first().attr("src") ||
        root.find("img").first().attr("data-src") ||
        undefined;

      const priceText =
        root.find("[class*='price']").first().text() ||
        root.find("span:contains('€')").first().text() ||
        root.find("span:contains('$')").first().text() ||
        "";

      const np = normalizePrice(priceText);

      out.push({
        title,
        url: u,
        image: img,
        price: np.value,
        currency: np.currency,
        source: "duckduckgo",
      });
    });

    if (out.length >= limit) break;
  }

  // Filter obvious non-product navigational links
  return out.filter((p) => p.title.length >= 6).slice(0, limit);
}
