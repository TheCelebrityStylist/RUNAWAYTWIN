// FILE: lib/scrape/index.ts
import type { Product } from "@/lib/affiliates/types";
import { clamp } from "@/lib/scrape/http";
import { scrapeHmProducts } from "@/lib/scrape/sources/hm";
import { scrapeBingShop } from "@/lib/scrape/sources/bingShop";

export type ScrapeOpts = {
  query: string;
  country?: string;
  limit?: number;
};

const ENABLE_SCRAPE = (process.env.ENABLE_SCRAPE || "true").toLowerCase() !== "false";

function normalizeQuery(q: string): string {
  return q.replace(/\s+/g, " ").trim();
}

export async function scrapeProducts(opts: ScrapeOpts): Promise<Product[]> {
  if (!ENABLE_SCRAPE) return [];

  const query = normalizeQuery(opts.query);
  const country = opts.country;
  const limit = clamp(opts.limit ?? 24, 1, 60);

  // Strategy:
  // 1) H&M (stable LD+JSON) gives real PDP URLs + often price/image
  // 2) Bing Shop via Jina as a broad fallback to guarantee outbound URLs
  const [hm, bing] = await Promise.all([
    scrapeHmProducts({ query, country, limit }),
    scrapeBingShop({ query, country, limit }),
  ]);

  const merged: Product[] = [];
  const seen = new Set<string>();

  function add(list: Product[]) {
    for (const p of list) {
      if (!p.url) continue;
      const key = safeKey(p.url);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(p);
      if (merged.length >= limit) return;
    }
  }

  add(hm);
  add(bing);

  return merged.slice(0, limit);
}

function safeKey(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    return `${host}${u.pathname}`;
  } catch {
    return null;
  }
}
