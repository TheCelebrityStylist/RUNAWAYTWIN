// FILE: lib/scrape/index.ts
import type { Product } from "@/lib/affiliates/types";
import { clamp, cleanText, fetchText } from "@/lib/scrape/http";
import { scrapeHmProducts } from "@/lib/scrape/sources/hm";

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

  // Primary: H&M (stable LD+JSON, real PDP links)
  const hm = await scrapeHmProducts({ query, country, limit });

  // If H&M gave enough, return early.
  if (hm.length >= Math.min(limit, 8)) return hm.slice(0, limit);

  // Fallback: Bing Shop via Jina proxy (keyless).
  // NOTE: This is intentionally inlined to avoid build failures due to missing modules.
  const bing = await scrapeBingShopInline({ query, limit });

  const merged: Product[] = [];
  const seen = new Set<string>();

  const add = (list: Product[]) => {
    for (const p of list) {
      if (!p.url) continue;
      const key = safeKey(p.url);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(p);
      if (merged.length >= limit) return;
    }
  };

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

async function scrapeBingShopInline(params: { query: string; limit: number }): Promise<Product[]> {
  const { query, limit } = params;

  const url = new URL("https://www.bing.com/shop");
  url.searchParams.set("q", query);

  const txt = await fetchText(url.toString(), {
    viaJina: true,
    timeoutMs: 12_000,
    noStore: true,
  });
  if (!txt) return [];

  const re = /\[([^\]]{3,160})\]\((https?:\/\/[^)\s]+)\)/g;
  const seen = new Set<string>();
  const out: Product[] = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(txt)) !== null) {
    const title = cleanText(m[1] ?? "");
    const href = m[2] ?? "";
    if (!title || !href) continue;

    try {
      const u = new URL(href);
      const host = u.hostname.replace(/^www\./, "");

      // Skip Bing/Microsoft internal links
      if (host.endsWith("bing.com") || host.endsWith("microsoft.com")) continue;

      // Avoid overly generic links
      if (u.pathname === "/" && u.search.length < 3) continue;

      const key = `${host}${u.pathname}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        id: `bing:${host}:${u.pathname}:${seen.size}`,
        title,
        retailer: host,
        url: href,
        currency: "EUR",
        availability: "unknown",
        fit: { category: guessCategory(title) },
      });

      if (out.length >= limit) break;
    } catch {
      continue;
    }
  }

  return out;
}

function guessCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\bboot|\bshoe|\bsneaker|\bheel/.test(t)) return "shoes";
  if (/\bcoat|\btrench|\bjacket|\bblazer|\bouterwear/.test(t)) return "outerwear";
  if (/\bdress/.test(t)) return "dress";
  if (/\btrouser|\bpant|\bjean|\bskirt|\bdenim/.test(t)) return "bottom";
  if (/\bshirt|\btee|\btop|\bblouse|\bknit|\bsweater/.test(t)) return "top";
  if (/\bbag|\btote|\bshoulder bag|\bcrossbody/.test(t)) return "bag";
  return "accessory";
}
