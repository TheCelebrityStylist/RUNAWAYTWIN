// FILE: app/api/chat/tools.ts
/**
 * RunwayTwin Tools (single-file, Edge-safe)
 * Exports used by /app/api/chat/route.ts:
 *   - searchProducts(params)
 *   - affiliateLink(url, retailer?)
 *   - fxConvert(amount, from, to)
 *
 * Internally provides:
 *   - demoAdapter (deterministic)
 *   - webAdapter (JSON-LD + OG fallback via lib/extract/jsonld)
 *   - adapter chaining with EU/US preference
 */

import { extractJsonLd, normalizeProductFromJsonLd, scrapeMinimalFromHtml } from "../../../lib/extract/jsonld";

/* =========================
 * Types
 * ========================= */
export type Product = {
  id: string;
  brand: string;
  title: string;
  price: number | null;
  currency: string | null;
  retailer: string | null;
  url: string;
  imageUrl?: string | null;
  availability?: string | null;
};

export type SearchProductsArgs = {
  query: string;
  country?: string;
  currency?: string;
  size?: string | null;
  color?: string | null;
  limit?: number;
  preferEU?: boolean;
};

export interface ProductAdapter {
  name: string;
  searchProducts(params: SearchProductsArgs): Promise<Product[]>;
  checkStock?(productIdOrUrl: string, country?: string): Promise<{ availability: string | null }>;
  affiliateLink?(url: string, retailer?: string | null): Promise<string>;
}

/* =========================
 * Helpers
 * ========================= */
const EU_HOST_HINTS = [
  ".eu", ".nl", ".de", ".fr", ".it", ".es", ".ie", ".be", ".se", ".dk", ".fi", ".pl", ".at",
  "matchesfashion.com", "ssense.com", "mytheresa.com", "farfetch.com", "endclothing.com",
  "mrporter.com", "net-a-porter.com", "arket.com", "cos.com", "hm.com", "mango.com", "zara.com", "levi.com",
];

function scoreByRegion(u: string, preferEU?: boolean): number {
  try {
    const host = new URL(u).hostname.toLowerCase();
    const isEUish = EU_HOST_HINTS.some((h) => host.includes(h));
    return preferEU ? (isEUish ? 2 : 0) : (isEUish ? 0 : 2);
  } catch {
    return 0;
  }
}
function uniqBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>(); const out: T[] = [];
  for (const x of arr) { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}
function clampLimit(n?: number, def = 6) {
  const v = Number.isFinite(n as any) ? Number(n) : def;
  return Math.max(1, Math.min(v, 12));
}

/* =========================
 * demoAdapter (deterministic)
 * ========================= */
const DEMO_DATA: Product[] = [
  {
    id: "the-row-tee",
    brand: "The Row",
    title: "Wesler Merino T-Shirt",
    price: 590, currency: "EUR", retailer: "Matches",
    url: "https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt",
    imageUrl: "https://assets.runwaytwin-demo.com/the-row-wesler.jpg",
    availability: "InStock",
  },
  {
    id: "levi-501",
    brand: "Levi's",
    title: "501 Original Straight Jeans (Indigo)",
    price: 110, currency: "EUR", retailer: "Levi.com EU",
    url: "https://www.levi.com/NL/en_NL/search?q=501",
    imageUrl: "https://assets.runwaytwin-demo.com/levis-501.jpg",
    availability: "InStock",
  },
  {
    id: "mango-trench",
    brand: "Mango",
    title: "Classic Cotton Trench Coat",
    price: 119.99, currency: "EUR", retailer: "Mango",
    url: "https://shop.mango.com/nl/dames/jassen/trench-classic",
    imageUrl: "https://assets.runwaytwin-demo.com/mango-trench.jpg",
    availability: "InStock",
  },
];

const demoAdapter: ProductAdapter = {
  name: "demoAdapter",
  async searchProducts(params) {
    const q = (params.query || "").toLowerCase();
    const limit = clampLimit(params.limit);
    if (!q) return DEMO_DATA.slice(0, limit);
    const tokens = q.split(/\s+/).filter(Boolean);
    const hits = DEMO_DATA.filter((p) => {
      const hay = `${p.brand} ${p.title} ${p.retailer}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
    const ranked = hits
      .map((p) => ({ p, s: scoreByRegion(p.url, params.preferEU) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
    return (ranked.length ? ranked : DEMO_DATA).slice(0, limit);
  },
  async checkStock(productIdOrUrl: string) {
    const hit = DEMO_DATA.find((p) => p.id === productIdOrUrl || p.url === productIdOrUrl);
    return { availability: hit?.availability ?? null };
  },
  async affiliateLink(url: string) { return url; },
};

/* =========================
 * webAdapter (JSON-LD + OG fallback)
 * ========================= */
const UA = "Mozilla/5.0 (compatible; RunwayTwinBot/1.0)";
async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
    if (!res.ok) return null;
    const html = await res.text();
    return html && html.length > 200 ? html : null;
  } catch { return null; }
}
async function searchViaDuckDuckGo(query: string, preferEU?: boolean): Promise<string[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}+site:(.com|.eu|.co|.de|.fr|.it|.es|.nl)`;
  const html = await tryFetch(url);
  if (!html) return [];
  const out: string[] = [];
  const rx = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) {
    try {
      const u = new URL(m[1]);
      if (!/^https?:$/.test(u.protocol)) continue;
      out.push(u.toString());
      if (out.length >= 12) break;
    } catch {}
  }
  return out
    .map((u) => ({ u, s: scoreByRegion(u, preferEU) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.u);
}
async function extractProductFromHtml(url: string, html: string): Promise<Product | null> {
  const blocks = extractJsonLd(html);
  for (const b of blocks) {
    const prod = normalizeProductFromJsonLd(url, b);
    if (prod && prod.title) return prod;
  }
  const partial = scrapeMinimalFromHtml(url, html);
  if (partial.title) {
    return {
      id: partial.url || url,
      brand: partial.brand || "",
      title: partial.title,
      price: null,
      currency: null,
      retailer: partial.url ? new URL(partial.url).hostname : null,
      url,
      imageUrl: partial.imageUrl || null,
      availability: null,
    };
  }
  return null;
}
const webAdapter: ProductAdapter = {
  name: "webAdapter",
  async searchProducts(params) {
    const query = (params.query || "").trim();
    const limit = clampLimit(params.limit);
    if (!query) return [];
    const candidates = await searchViaDuckDuckGo(query, params.preferEU);
    if (!candidates.length) return [];
    const out: Product[] = [];
    for (const href of candidates.slice(0, 12)) {
      const html = await tryFetch(href);
      if (!html) continue;
      const prod = await extractProductFromHtml(href, html);
      if (!prod) continue;
      try { if (!prod.retailer) prod.retailer = new URL(prod.url).hostname.replace(/^www\./, ""); } catch {}
      if (!prod.brand && prod.title) {
        const guess = prod.title.split("—")[0].split("-")[0].trim();
        if (guess && guess.length <= 24) prod.brand = guess;
      }
      out.push(prod);
      if (out.length >= limit) break;
    }
    const unique = uniqBy(out, (p) => p.url);
    return unique
      .map((p) => ({ p, s: scoreByRegion(p.url, params.preferEU) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p)
      .slice(0, limit);
  },
  async affiliateLink(url: string) { return url; },
};

/* =========================
 * Adapter registry
 * ========================= */
const ADAPTERS: ProductAdapter[] = [demoAdapter, webAdapter];

/* =========================
 * Public API (route.ts imports these)
 * ========================= */
export async function searchProducts(params: SearchProductsArgs): Promise<Product[]> {
  const limit = clampLimit(params.limit);
  const safe: SearchProductsArgs = { ...params, limit };
  for (const adapter of ADAPTERS) {
    try {
      const res = await adapter.searchProducts(safe);
      if (res?.length) return res.slice(0, limit);
    } catch (e: any) {
      console.warn(`[tools] ${adapter.name}.searchProducts failed:`, e?.message);
    }
  }
  return [];
}

export async function checkStock(productIdOrUrl: string, country?: string) {
  for (const adapter of ADAPTERS) {
    if (!adapter.checkStock) continue;
    try {
      const r = await adapter.checkStock(productIdOrUrl, country);
      if (r && typeof r.availability === "string") return r;
    } catch (e: any) {
      console.warn(`[tools] ${adapter.name}.checkStock failed:`, e?.message);
    }
  }
  return { availability: null };
}

export async function affiliateLink(url: string, retailer?: string | null) {
  for (const adapter of ADAPTERS) {
    if (!adapter.affiliateLink) continue;
    try {
      const r = await adapter.affiliateLink(url, retailer ?? null);
      if (r) return r;
    } catch (e: any) {
      console.warn(`[tools] ${adapter.name}.affiliateLink failed:`, e?.message);
    }
  }
  return url;
}

/* =========================
 * FX conversion (static, Edge-safe)
 * ========================= */
const FX: Record<string, number> = { EUR: 1, USD: 1.07, GBP: 0.84 };
export function fxConvert(amount: number, from: string, to: string) {
  const f = FX[from?.toUpperCase()] ?? 1;
  const t = FX[to?.toUpperCase()] ?? 1;
  return Math.round((amount / f) * t * 100) / 100;
}

/* =========================
 * IMPORTANT:
 * Do NOT add any of these lines at the bottom (they break the build if files don’t exist):
 *   export { demoAdapter } from "./tools/adapters/demoAdapter";
 *   export { webAdapter }  from "./tools/adapters/webAdapter";
 *   export { awinAdapter } from "./tools/adapters/awinAdapter";
 * Keep this file self-contained.
 * ========================= */
