// FILE: app/api/chat/systemPrompt.ts
export const STYLIST_SYSTEM_PROMPT = `
You are RunwayTwin — a celebrity-grade AI fashion stylist. You deliver precise, shoppable outfits with retailer links and prices, tailored to the user's saved preferences and country stock.

Rules:
- Always return a head-to-toe look (top+bottom or dress), seasonal outerwear, shoes, bag, and 1–2 accessories.
- For EACH item include: Brand + Exact Item, Price + Currency, Retailer, Link (canonical PDP), and an Image URL if available. Never invent links.
- Body-type logic must be explicit and technical (rise, drape, neckline, hem, silhouette, fabrication, proportion, heel height, vamp, shaft).
- Respect budget; show a running total. If the primary picks exceed budget, include “Save” alternates with links.
- Provide at least one alternate each for shoes and outerwear (with links).
- Include a short "Capsule & Tips" section: 2–3 remix ideas and 2 succinct tips.
- Prefer EU/US stock based on the user's country.
- If exact stock for an item isn't found: say so briefly, then offer the closest in-stock alternative with links.
- Never pad with generic style advice before you’ve listed the actual items. Be concise, editorial, and confident.
- Do not reveal internal tool mechanics.

Output shape (human-readable):
Outfit:
- <Category>: <Brand> — <Exact Item Name> | <Price> <Currency> | <Retailer> | <URL> | <ImageURL?>

Alternates:
- Shoes: <...>
- Outerwear: <...>

Why it Flatters:
- <1–3 bullets referencing body-type & cut details>

Budget:
- Total: <amount currency> (Budget: <userBudget currency>) [If over, add “Save” picks below]

Save Picks:
- <Category>: <...>

Capsule & Tips:
- Remix: <idea>
- Remix: <idea>
- Remix: <idea>
- Tip: <tip>
- Tip: <tip>
`.trim();


// FILE: app/api/chat/tools/types.ts
export type CountryCode =
  | "US" | "GB" | "IE" | "DE" | "FR" | "ES" | "IT" | "NL" | "BE" | "SE" | "NO" | "DK" | "FI" | "AT" | "CH" | "PT" | "PL" | "CZ" | "AU" | "CA";

export type Product = {
  id: string;
  brand: string;
  title: string;
  price: number | null;
  currency: string | null;
  retailer: string | null;
  url: string;
  imageUrl?: string | null;
  availability?: string | null; // InStock / OutOfStock ...
  countryHint?: CountryCode | null;
};

export type SearchParams = {
  query: string;
  country?: CountryCode;
  currency?: string;
  size?: string | null;
  color?: string | null;
  limit?: number;
  preferEU?: boolean;
};

export interface ProductAdapter {
  name: string;
  searchProducts(params: SearchParams): Promise<Product[]>;
  checkStock?(productIdOrUrl: string, country?: CountryCode): Promise<{ availability: string | null }>;
  affiliateLink?(url: string, retailer?: string | null): Promise<string>;
};


// FILE: app/api/chat/tools/demoAdapter.ts
import { ProductAdapter, SearchParams, Product } from "./types";

const DEMO: Product[] = [
  {
    id: "toteme-scarf-wool",
    brand: "Toteme",
    title: "Signature Wool Scarf",
    price: 220,
    currency: "EUR",
    retailer: "Mytheresa",
    url: "https://www.mytheresa.com/en-de/toteme-signature-wool-scarf.html",
    imageUrl: "https://img.mytheresa.com/toteme-scarf.jpg",
    countryHint: "NL",
    availability: "InStock",
  },
  {
    id: "agnona-coat-cashmere",
    brand: "Agnona",
    title: "Double-Face Cashmere Coat",
    price: 3200,
    currency: "EUR",
    retailer: "SSENSE",
    url: "https://www.ssense.com/en-eu/women/product/agnona/double-face-cashmere-coat/1234567",
    imageUrl: "https://images.ssense.com/agnona-coat.jpg",
    countryHint: "NL",
    availability: "InStock",
  },
  {
    id: "alexander-wang-pumps",
    brand: "Alexander Wang",
    title: "Ava Slingback Pumps 75",
    price: 495,
    currency: "EUR",
    retailer: "Farfetch",
    url: "https://www.farfetch.com/shopping/women/alexander-wang-ava-slingback-75-item-123.aspx",
    imageUrl: "https://cdn-images.farfetch-contents.com/ava-75.jpg",
    countryHint: "NL",
    availability: "InStock",
  },
  {
    id: "the-row-tee-merino",
    brand: "The Row",
    title: "Wesler Merino T-Shirt",
    price: 590,
    currency: "EUR",
    retailer: "Matches",
    url: "https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt",
    imageUrl: "https://assets.matchesfashion.com/wesler.jpg",
    countryHint: "NL",
    availability: "InStock",
  },
  {
    id: "levi-501",
    brand: "Levi's",
    title: "501 Original Straight Jeans (Medium Indigo)",
    price: 110,
    currency: "EUR",
    retailer: "Levi.com EU",
    url: "https://www.levi.com/NL/en_NL/clothing/women/jeans/501-original",
    imageUrl: "https://images.levi.com/501.jpg",
    countryHint: "NL",
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
    imageUrl: "https://st.mngbcn.com/trench.jpg",
    countryHint: "NL",
    availability: "InStock",
  },
  {
    id: "zara-loafer",
    brand: "ZARA",
    title: "Leather Penny Loafers",
    price: 69.95,
    currency: "EUR",
    retailer: "ZARA",
    url: "https://www.zara.com/nl/en/leather-penny-loafers-p0.html",
    imageUrl: "https://static.zara.net/loafer.jpg",
    countryHint: "NL",
    availability: "InStock",
  },
  {
    id: "arkk-bag",
    brand: "A.P.C.",
    title: "Grace Small Leather Bag",
    price: 520,
    currency: "EUR",
    retailer: "A.P.C.",
    url: "https://www.apcstore.com/en_eu/grace-small",
    imageUrl: "https://apc-cdn.com/grace.jpg",
    countryHint: "NL",
    availability: "InStock",
  },
];

export const demoAdapter: ProductAdapter = {
  name: "demoAdapter",
  async searchProducts(params: SearchParams): Promise<Product[]> {
    const key = (params.query || "").toLowerCase();
    const items = DEMO.filter(p => {
      const hay = `${p.brand} ${p.title} ${p.retailer}`.toLowerCase();
      return hay.includes(key) || key.split(" ").some(k => hay.includes(k));
    });
    return (params.limit && params.limit > 0) ? items.slice(0, params.limit) : items;
  },
  async checkStock(productIdOrUrl: string) {
    const hit = DEMO.find(p => p.id === productIdOrUrl || p.url === productIdOrUrl);
    return { availability: hit?.availability ?? null };
  },
  async affiliateLink(url: string) {
    return url; // no network yet
  }
};


// FILE: lib/extract/jsonld.ts
import { Product } from "@/app/api/chat/tools/types";

type JsonLd = any;

function safeParse(json: string): any | null {
  try { return JSON.parse(json); } catch { return null; }
}

export function extractJsonLd(html: string): JsonLd[] {
  const scripts = Array.from(html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  const blocks: JsonLd[] = [];
  for (const m of scripts) {
    const text = m[1]?.trim();
    if (!text) continue;
    const parsed = safeParse(text);
    if (parsed == null) continue;
    if (Array.isArray(parsed)) blocks.push(...parsed);
    else blocks.push(parsed);
  }
  return blocks;
}

function first<T>(arr: T[] | T | undefined): T | undefined {
  if (!arr) return undefined;
  return Array.isArray(arr) ? arr[0] : arr;
}

function pickOffer(offers: any): any | null {
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  const inStock = list.find((o) => (o.availability || "").toLowerCase().includes("instock"));
  return inStock || list[0] || null;
}

export function normalizeProductFromJsonLd(url: string, doc: JsonLd): Product | null {
  const types = (doc["@type"] ? (Array.isArray(doc["@type"]) ? doc["@type"] : [doc["@type"]]) : []).map((t: any) => String(t).toLowerCase());
  const isProduct = types.includes("product");
  const isOffer = types.includes("offer");

  if (!isProduct && !isOffer) {
    if (doc["@graph"]) {
      for (const node of doc["@graph"]) {
        const p = normalizeProductFromJsonLd(url, node);
        if (p) return p;
      }
      return null;
    }
    return null;
  }

  const productNode = isProduct ? doc : (doc.itemOffered || doc);
  const brandNode = productNode.brand;
  const brandName = typeof brandNode === "string" ? brandNode : (brandNode?.name ?? null);

  const offer = pickOffer(productNode.offers || doc.offers);
  const price = offer ? Number(offer.price || offer.priceSpecification?.price || NaN) : NaN;
  const currency = offer?.priceCurrency || offer?.priceSpecification?.priceCurrency || null;
  const retailer = offer?.seller?.name || offer?.seller || null;

  const image = first(productNode.image) || productNode.image || offer?.image || null;
  const title = productNode.name || offer?.itemOffered?.name || null;

  if (!title) return null;

  const id = productNode.sku || productNode.productID || productNode["@id"] || url;

  return {
    id: String(id),
    brand: brandName ? String(brandName) : "",
    title: String(title),
    price: isFinite(price) ? price : null,
    currency: currency ? String(currency) : null,
    retailer: retailer ? String(retailer) : new URL(url).hostname,
    url,
    imageUrl: image ? String(image) : null,
    availability: offer?.availability || null,
  };
}

export function scrapeMinimalFromHtml(url: string, html: string): Partial<Product> {
  const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const brandGuess = html.match(/"brand"\s*:\s*"([^"]+)"/i);
  return {
    url,
    title: titleMatch ? titleMatch[1] : undefined,
    imageUrl: imgMatch ? imgMatch[1] : undefined,
    brand: brandGuess ? brandGuess[1] : undefined,
  };
}


// FILE: app/api/chat/tools/webAdapter.ts
import { ProductAdapter, Product, SearchParams } from "./types";
import { extractJsonLd, normalizeProductFromJsonLd, scrapeMinimalFromHtml } from "@/lib/extract/jsonld";

async function politeFetch(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: {
        "user-agent": "RunwayTwinBot/1.0 (+edge; polite)",
        ...(init?.headers || {}),
      }
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function toProduct(url: string, html: string): Product | null {
  const blocks = extractJsonLd(html);
  for (const block of blocks) {
    const normalized = normalizeProductFromJsonLd(url, block);
    if (normalized) return normalized;
  }
  const mini = scrapeMinimalFromHtml(url, html);
  if (mini.title) {
    return {
      id: url,
      brand: mini.brand ?? "",
      title: mini.title!,
      price: null,
      currency: null,
      retailer: new URL(url).hostname,
      url,
      imageUrl: mini.imageUrl ?? null,
      availability: null,
    };
  }
  return null;
}

async function tryRetailerSearch(base: string, q: string): Promise<string[]> {
  const candidates: string[] = [];
  try {
    const url = `${base}${encodeURIComponent(q)}`;
    const res = await politeFetch(url, { redirect: "follow" });
    if (!res.ok) return candidates;
    const html = await res.text();
    const anchors = Array.from(html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>(?:[\s\S]*?)<\/a>/gi));
    const host = new URL(res.url).origin;
    const seen = new Set<string>();
    for (const a of anchors) {
      const href = a[1];
      if (!href) continue;
      const abs = href.startsWith("http") ? href : host + (href.startsWith("/") ? href : `/${href}`);
      if (!seen.has(abs) && /product|p=|\/p\/|\/products\//i.test(abs)) {
        seen.add(abs);
        candidates.push(abs);
      }
      if (candidates.length >= 6) break;
    }
  } catch { /* ignore */ }
  return candidates;
}

export const webAdapter: ProductAdapter = {
  name: "webAdapter",
  async searchProducts(params: SearchParams): Promise<Product[]> {
    const out: Product[] = [];
    const q = params.query.trim();
    if (!q) return out;

    if (/^https?:\/\//i.test(q)) {
      try {
        const res = await politeFetch(q, { redirect: "follow" });
        if (res.ok) {
          const html = await res.text();
          const p = toProduct(res.url, html);
          if (p) out.push(p);
        }
      } catch {}
      return out.slice(0, params.limit || 6);
    }

    const searches: string[] = [
      `https://www.zara.com/nl/en/search?searchTerm=`,
      `https://www2.hm.com/en_gb/search-results.html?q=`,
      `https://www.mango.com/nl/search?q=`,
      `https://www.farfetch.com/shopping/women/items.aspx?query=`,
      `https://www.matchesfashion.com/intl/search/?q=`,
      `https://www.mytheresa.com/en-de/catalogsearch/result/?q=`,
      `https://www.ssense.com/en-eu/women/search?q=`,
      `https://www.net-a-porter.com/en-nl/shop/Search/Results?searchTerm=`,
      `https://www.levi.com/NL/en_NL/search?q=`,
    ];

    const allCandidates: string[] = [];
    await Promise.all(searches.map(async (base) => {
      const cand = await tryRetailerSearch(base, q);
      allCandidates.push(...cand);
    }));

    const unique = Array.from(new Set(allCandidates)).slice(0, params.limit || 8);
    for (const url of unique) {
      try {
        const res = await politeFetch(url, { redirect: "follow" });
        if (!res.ok) continue;
        const html = await res.text();
        const p = toProduct(res.url, html);
        if (p) out.push(p);
      } catch {}
    }
    return out.slice(0, params.limit || 6);
  },
  async checkStock(productIdOrUrl: string) {
    try {
      const res = await politeFetch(productIdOrUrl, { redirect: "follow" });
      if (!res.ok) return { availability: null };
      const html = await res.text();
      const p = toProduct(res.url, html);
      return { availability: p?.availability ?? null };
    } catch {
      return { availability: null };
    }
  },
  async affiliateLink(url: string) {
    return url;
  }
};


// FILE: app/api/chat/tools/index.ts
import { ProductAdapter, SearchParams, Product } from "./types";
import { demoAdapter } from "./demoAdapter";
import { webAdapter } from "./webAdapter";

export type ToolRegistry = { adapters: ProductAdapter[] };

export const registry: ToolRegistry = {
  adapters: [webAdapter, demoAdapter],
};

export async function searchProducts(params: SearchParams): Promise<Product[]> {
  for (const adapter of registry.adapters) {
    try {
      const results = await adapter.searchProducts(params);
      if (results && results.length) return results;
    } catch { /* next */ }
  }
  return [];
}

export async function checkStock(productIdOrUrl: string, country?: string) {
  for (const adapter of registry.adapters) {
    if (!adapter.checkStock) continue;
    try {
      const res = await adapter.checkStock(productIdOrUrl, country as any);
      if (res && res.availability) return res;
    } catch {}
  }
  return { availability: null };
}

export async function affiliateLink(url: string, retailer?: string | null) {
  for (const adapter of registry.adapters) {
    if (!adapter.affiliateLink) continue;
    try {
      const res = await adapter.affiliateLink(url, retailer ?? nul
