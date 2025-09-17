// FILE: app/api/chat/tools.ts
/**
 * RunwayTwin Tools (single-file version)
 * --------------------------------------
 * Exports the exact API used by /app/api/chat/route.ts:
 *   - searchProducts(params)
 *   - affiliateLink(url, retailer?)
 *   - fxConvert(amount, from, to)
 *
 * Internally provides:
 *   - Demo adapter (deterministic)
 *   - Web adapter (JSON-LD + OG meta fallback), Edge-safe
 *   - Adapter chaining with EU/US preference
 */

import { extractJsonLd, normalizeProductFromJsonLd, scrapeMinimalFromHtml } from "../../../lib/extract/jsonld";

/* ======================================================================
 * Types
 * ====================================================================== */

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
  country?: string;        // e.g., "US", "NL", "DE"
  currency?: string;       // "USD", "EUR", ...
  size?: string | null;
  color?: string | null;
  limit?: number;          // default 6
  preferEU?: boolean;      // hint to favor EU retailers when equal
};

export interface ProductAdapter {
  name: string;
  searchProducts(params: SearchProductsArgs): Promise<Product[]>;
  checkStock?(productIdOrUrl: string, country?: string): Promise<{ availability: string | null }>;
  affiliateLink?(url: string, retailer?: string | null): Promise<string>;
}

/* ======================================================================
 * Helpers
 * ====================================================================== */

const EU_HOST_HINTS = [
  ".eu", ".nl", ".de", ".fr", ".it", ".es", ".ie", ".be", ".se", ".dk", ".fi", ".pl", ".at",
  "matchesfashion.com", "ssense.com", "mytheresa.com", "farfetch.com", "endclothing.com", "mrporter.com", "net-a-porter.com",
  "cos.com", "arket.com", "hm.com", "mango.com", "zara.com", "levi.com",
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
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function clampLimit(n?: number, def = 6) {
  const v = Number.isFinite(n as any) ? Number(n) : def;
  return Math.max(1, Math.min(v, 12));
}

/* ======================================================================
 * Demo Adapter (deterministic, instant)
 * ====================================================================== */

const DEMO_DATA: Product[] = [
  {
    id: "the-row-tee",
    brand: "The Row",
    title: "Wesler Merino T-Shirt",
    price: 590,
    currency: "EUR",
    retailer: "Matches",
    url: "https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt",
    imageUrl: "https://assets.runwaytwin-demo.com/the-row-wesler.jpg",
    availability: "InStock",
  },
  {
    id: "levi-501",
    brand: "Levi's",
    title: "501 Original Straight Jeans (Indigo)",
    price: 110,
    currency: "EUR",
    retailer: "Levi.com EU",
    url: "https://www.levi.com/NL/en_NL/search?q=501",
    imageUrl: "https://assets.runwaytwin-demo.com/levis-501.jpg",
    availability: "InStock",
  },
  {
    id: "mango-trench",
    brand: "Mango",
    title: "Classic Cotton Trench Coat",
    price: 119.99,
    currency: "EUR",
    retailer: "Mango",
    url: "https://shop.mango.com/nl/dames/jassen/trench-classic",
    imageUrl: "https://assets.runwaytwin-demo.com/mango-trench.jpg",
    availability: "InStock",
  },
];

const demoAdapter: ProductAdapter = {
  name: "demoAdapter",

  async searchProducts(params: SearchProductsArgs): Promise<Product[]> {
    const q = (params.query || "").toLowerCase();
    const limit = clampLimit(params.limit);
    if (!q) return DEMO_DATA.slice(0, limit);

    const tokens = q.split(/\s+/).filter(Boolean);
    const hits = DEMO_DATA.filter((p) => {
      const hay = `${p.brand} ${p.title} ${p.retailer}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });

    // region preference as soft score
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

  async affiliateLink(url: string) {
    // No rewrite in demo
    return url;
  },
};

/* ======================================================================
 * Web Adapter (Edge-safe JSON-LD + OG meta fallback)
 * ====================================================================== */

const USER_AGENT =
  "Mozilla/5.0 (compatible; RunwayTwinBot/1.0; +https://runwaytwin.example)";

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "user-agent": USER_AGENT, "accept": "text/html,application/xhtml+xml" },
      // Edge runtime default follow for redirects
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 200) return null;
    return html;
  } catch {
    return null;
  }
}

async function searchViaDuckDuckGo(query: string, preferEU?: boolean): Promise<string[]> {
  // No API keys; use simple web search endpoint returning HTML, then extract result links.
  // NOTE: super-light heuristic; production should move to a proper search API.
  const q = encodeURIComponent(`${query} site:(.com|.eu|.co|.de|.fr|.it|.es|.nl)`);
  const url = `https://duckduckgo.com/html/?q=${q}`;
  const html = await tryFetch(url);
  if (!html) return [];
  const results: string[] = [];
  const rx = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) {
    const href = m[1];
    if (!href) continue;
    // prefer clean https PDP-like links
    try {
      const u = new URL(href);
      if (!/^https?:$/.test(u.protocol)) continue;
      results.push(u.toString());
    } catch {
      continue;
    }
    if (results.length > 12) break;
  }
  // region soft sort
  return results
    .map((u) => ({ u, s: scoreByRegion(u, preferEU) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.u);
}

async function extractProductFromHtml(url: string, html: string): Promise<Product | null> {
  // 1) JSON-LD Product/Offer
  const blocks = extractJsonLd(html);
  for (const block of blocks) {
    const prod = normalizeProductFromJsonLd(url, block);
    if (prod && prod.title) return prod;
  }
  // 2) Minimal OG/meta fallback
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

  async searchProducts(params: SearchProductsArgs): Promise<Product[]> {
    const query = (params.query || "").trim();
    const limit = clampLimit(params.limit);
    if (!query) return [];

    // 1) Use a generic search engine to get likely PDP links
    const candidates = await searchViaDuckDuckGo(query, params.preferEU);
    if (!candidates.length) return [];

    // 2) Fetch first N pages and try to extract JSON-LD Product/Offer
    const out: Product[] = [];
    for (const href of candidates.slice(0, 12)) {
      const html = await tryFetch(href);
      if (!html) continue;
      const prod = await extractProductFromHtml(href, html);
      if (!prod) continue;

      // Heuristic: enrich retailer & brand if missing
      try {
        const u = new URL(prod.url);
        if (!prod.retailer) prod.retailer = u.hostname.replace(/^www\./, "");
      } catch {}
      if (!prod.brand && prod.title) {
        // naive brand guess: first token until dash
        const guess = prod.title.split("—")[0].split("-")[0].trim();
        if (guess && guess.length <= 24) prod.brand = guess;
      }

      out.push(prod);
      if (out.length >= limit) break;
    }

    // 3) Deduplicate by URL; region preference sorting
    const unique = uniqBy(out, (p) => p.url);
    const ranked = unique
      .map((p) => ({ p, s: scoreByRegion(p.url, params.preferEU) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);

    return ranked.slice(0, limit);
  },

  async affiliateLink(url: string) {
    // Hook for later: Awin/Rakuten/CJ/Impact wrappers
    return url;
  },
};

/* ======================================================================
 * Adapter Registry (order matters)
 * ====================================================================== */

/**
 * Adapter priority:
 * 1) demoAdapter — instant, deterministic (ensures optimistic draft always has content)
 * 2) webAdapter  — live lookup (best-effort; slower and can be blocked by some sites)
 */
const ADAPTERS: ProductAdapter[] = [demoAdapter, webAdapter];

/* ======================================================================
 * Public API (what route.ts imports)
 * ====================================================================== */

export async function searchProducts(params: SearchProductsArgs): Promise<Product[]> {
  const limit = clampLimit(params.limit);
  const safeParams: SearchProductsArgs = { ...params, limit };
  for (const adapter of ADAPTERS) {
    try {
      const res = await adapter.searchProducts(safeParams);
      if (Array.isArray(res) && res.length) return res.slice(0, limit);
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
      const res = await adapter.checkStock(productIdOrUrl, country);
      if (res && typeof res.availability === "string") return res;
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

/* ======================================================================
 * FX conversion (static table; Edge-safe)
 * ====================================================================== */
const FX: Record<string, number> = { EUR: 1, USD: 1.07, GBP: 0.84 };

export function fxConvert(amount: number, from: string, to: string) {
  const f = FX[from?.toUpperCase()] ?? 1;
  const t = FX[to?.toUpperCase()] ?? 1;
  return Math.round((amount / f) * t * 100) / 100;
}
