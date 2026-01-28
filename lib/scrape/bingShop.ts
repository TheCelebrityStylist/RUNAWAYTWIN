// FILE: lib/scrape/sources/bingShop.ts
import type { Product } from "@/lib/affiliates/types";
import { cleanText, fetchText } from "@/lib/scrape/http";

/**
 * Bing Shop fallback scraper via Jina proxy:
 * - Works without keys
 * - Often returns real outbound URLs (depends on Bing markup)
 *
 * IMPORTANT: File name/casing must remain exactly `bingShop.ts`
 * for Linux (Vercel) module resolution.
 */
export async function scrapeBingShop(params: {
  query: string;
  country?: string;
  limit: number;
}): Promise<Product[]> {
  const { query, limit } = params;

  const url = new URL("https://www.bing.com/shop");
  url.searchParams.set("q", query);

  const txt = await fetchText(url.toString(), {
    viaJina: true,
    timeoutMs: 12_000,
    noStore: true,
  });
  if (!txt) return [];

  // Extract markdown links: [title](https://...)
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
