// FILE: lib/scrape/index.ts
import type { Product } from "@/lib/affiliates/types";
import { clamp, cleanText, fetchText } from "@/lib/scrape/http";
import { bingWebSearch } from "@/lib/scrape/bing";
import { parseProductPage } from "@/lib/scrape/productParse";

export type ScrapeOpts = {
  query: string;
  limit?: number;
};

const ENABLE_SCRAPE = (process.env.ENABLE_SCRAPE || "true").toLowerCase() !== "false";

/**
 * Keyless product scraping strategy:
 * 1) Bing Web via Jina proxy (fast + no keys)
 * 2) Filter to known fashion retailers
 * 3) Fetch product pages via Jina proxy
 * 4) Parse JSON-LD Product / meta tags
 */
const RETAILER_HOSTS: string[] = [
  "zara.com",
  "massimodutti.com",
  "cos.com",
  "arket.com",
  "hm.com",
  "mango.com",
  "uniqlo.com",
  "aboutyou.nl",
  "zalando.nl",
];

function guessCategory(title: string): Product["fit"] {
  const t = title.toLowerCase();
  if (/\bboot|\bshoe|\bsneaker|\bheel/.test(t)) return { category: "shoes" };
  if (/\bcoat|\btrench|\bjacket|\bblazer|\bouterwear/.test(t)) return { category: "outerwear" };
  if (/\bdress/.test(t)) return { category: "dress" };
  if (/\btrouser|\bpant|\bjean|\bskirt|\bdenim/.test(t)) return { category: "bottom" };
  if (/\bshirt|\btee|\btop|\bblouse|\bknit|\bsweater/.test(t)) return { category: "top" };
  if (/\bbag|\btote|\bshoulder bag|\bcrossbody/.test(t)) return { category: "bag" };
  return { category: "accessory" };
}

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    // remove tracking-ish params
    u.hash = "";
    // keep query (some sites require), but strip obvious trackers
    const drop = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    for (const k of drop) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return null;
  }
}

export async function scrapeProducts(opts: ScrapeOpts): Promise<Product[]> {
  if (!ENABLE_SCRAPE) return [];

  const q = cleanText(opts.query);
  if (!q) return [];

  const limit = clamp(opts.limit ?? 24, 1, 60);

  // Bing search restricted to known hosts
  const siteQuery = `${q} (${RETAILER_HOSTS.map((h) => `site:${h}`).join(" OR ")})`;
  const hits = await bingWebSearch({
    query: siteQuery,
    maxHits: Math.min(40, limit * 3),
    allowHosts: RETAILER_HOSTS,
  });

  // Candidate URLs
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const h of hits) {
    const norm = normalizeUrl(h.url);
    if (!norm) continue;
    let u: URL;
    try {
      u = new URL(norm);
    } catch {
      continue;
    }
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const key = `${host}${u.pathname}`;
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(norm);
    if (urls.length >= limit * 2) break;
  }

  // Fetch + parse product pages
  const out: Product[] = [];
  const outSeen = new Set<string>();

  // Concurrency limiter (small to avoid bans/timeouts)
  const concurrency = 4;
  let idx = 0;

  async function worker(): Promise<void> {
    while (idx < urls.length && out.length < limit) {
      const i = idx;
      idx += 1;

      const url = urls[i]!;
      const html = await fetchText(url, { viaJina: true, timeoutMs: 14_000, noStore: true });
      if (!html) continue;

      const parsed = parseProductPage(html, url);
      if (!parsed) continue;

      const key = safeKey(parsed.url);
      if (!key || outSeen.has(key)) continue;
      outSeen.add(key);

      const host = new URL(parsed.url).hostname.replace(/^www\./, "");
      out.push({
        id: `scr:${host}:${key}`,
        title: parsed.title,
        brand: parsed.brand,
        retailer: host,
        url: parsed.url,
        image: parsed.image,
        price: parsed.price,
        currency: parsed.currency ?? "EUR",
        availability: "unknown",
        fit: guessCategory(parsed.title),
      });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return out.slice(0, limit);
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
