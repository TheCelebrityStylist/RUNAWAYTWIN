// FILE: lib/scrape/index.ts
// Edge-safe discovery: SERP -> candidate URLs -> optional OG/JSON-LD enrichment.

import { bingSearchCandidates, type ScrapeCandidate } from "@/lib/scrape/bing";

export type ScrapedProduct = {
  id: string;
  title: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
  brand?: string;
  retailer?: string;
};

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

function pickMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = re.exec(html);
  return m?.[1] ? m[1].trim() : null;
}

function pickJsonLdProduct(html: string): { image?: string; price?: number; currency?: string; brand?: string } {
  const out: { image?: string; price?: number; currency?: string; brand?: string } = {};
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[1] || "").trim();
    if (!raw) continue;
    try {
      const json = JSON.parse(raw) as unknown;
      const stack = Array.isArray(json) ? json : [json];

      for (const node of stack) {
        if (!node || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        const type = o["@type"];
        if (type !== "Product" && type !== "product") continue;

        const img = o["image"];
        if (typeof img === "string") out.image ??= img;
        if (Array.isArray(img) && typeof img[0] === "string") out.image ??= img[0];

        const brand = o["brand"];
        if (typeof brand === "string") out.brand ??= brand;
        if (brand && typeof brand === "object") {
          const b = brand as Record<string, unknown>;
          if (typeof b.name === "string") out.brand ??= b.name;
        }

        const offers = o["offers"];
        const offerArr = Array.isArray(offers) ? offers : offers ? [offers] : [];
        for (const offer of offerArr) {
          if (!offer || typeof offer !== "object") continue;
          const off = offer as Record<string, unknown>;
          const price = off["price"];
          const currency = off["priceCurrency"];

          const priceNum = typeof price === "number" ? price : typeof price === "string" ? Number(price) : NaN;
          if (!Number.isNaN(priceNum) && Number.isFinite(priceNum)) out.price ??= priceNum;
          if (typeof currency === "string") out.currency ??= currency;
          break;
        }
      }
    } catch {
      // ignore
    }

    if (out.image || out.price || out.brand) break;
  }

  return out;
}

async function enrichCandidate(c: ScrapeCandidate, signal?: AbortSignal): Promise<Partial<ScrapedProduct>> {
  const resp = await withTimeout(
    fetch(c.url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RunwayTwinBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal,
    }).catch(() => null),
    3500,
    null
  );

  if (!resp || !resp.ok) return {};
  const html = await resp.text().catch(() => "");
  if (!html) return {};

  const ogTitle = pickMeta(html, "og:title");
  const ogImage = pickMeta(html, "og:image") ?? pickMeta(html, "twitter:image");
  const jsonld = pickJsonLdProduct(html);

  return {
    title: ogTitle ?? undefined,
    image: ogImage || jsonld.image,
    price: jsonld.price,
    currency: jsonld.currency,
    brand: jsonld.brand,
  };
}

export async function searchWebProducts(
  query: string,
  opts?: { limit?: number; signal?: AbortSignal }
): Promise<ScrapedProduct[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 12, 1), 24);
  const cands = await bingSearchCandidates(query, { limit, signal: opts?.signal });
  if (!cands.length) return [];

  const enrichCount = Math.min(cands.length, 8);
  const enrichedParts = await Promise.all(cands.slice(0, enrichCount).map((c) => enrichCandidate(c, opts?.signal)));

  return cands.slice(0, limit).map((c, idx) => {
    const extra = idx < enrichCount ? enrichedParts[idx] : {};
    return {
      id: `web-${idx}-${crypto.randomUUID()}`,
      title: extra.title ?? c.title,
      url: c.url,
      image: extra.image,
      price: extra.price,
      currency: extra.currency,
      brand: extra.brand,
      retailer: "web",
    };
  });
}
