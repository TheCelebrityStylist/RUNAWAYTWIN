// FILE: lib/scrape/webProductSearch.ts
export const runtime = "edge";

import type { Product } from "@/lib/affiliates/types";

type WebSearchOptions = {
  query: string;
  limit?: number;
  preferEU?: boolean;
};

const UA = "Mozilla/5.0 (compatible; RunwayTwinBot/1.0; +https://runwaytwin.local)";
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

function isEnabled(): boolean {
  const v = (process.env.WEB_SCRAPE_ENABLED || "true").trim().toLowerCase();
  return v !== "false" && v !== "0";
}

// Optional allowlist: comma-separated domains, e.g. "zalando.nl,cos.com,arket.com"
function getAllowlist(): string[] {
  const raw = (process.env.WEB_SCRAPE_DOMAINS_ALLOWLIST || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function clampLimit(n?: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : DEFAULT_LIMIT;
  return Math.max(1, Math.min(v, MAX_LIMIT));
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

const EU_HOST_HINTS = [
  ".eu",
  ".nl",
  ".de",
  ".fr",
  ".it",
  ".es",
  ".ie",
  ".be",
  ".se",
  ".dk",
  ".fi",
  ".pl",
  ".at",
  "zalando.",
  "zara.com",
  "mango.com",
  "hm.com",
  "cos.com",
  "arket.com",
  "ssense.com",
  "mytheresa.com",
  "farfetch.com",
  "mrporter.com",
  "net-a-porter.com",
];

function scoreByRegion(url: string, preferEU?: boolean): number {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const isEUish = EU_HOST_HINTS.some((h) => host.includes(h));
    return preferEU ? (isEUish ? 2 : 0) : isEUish ? 0 : 2;
  } catch {
    return 0;
  }
}

function allowedByAllowlist(url: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return allowlist.some((d) => host === d || host.endsWith(`.${d}`) || host.includes(d));
  } catch {
    return false;
  }
}

async function tryFetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 200) return null;
    return html;
  } catch {
    return null;
  }
}

/**
 * Search result harvesting
 * - DuckDuckGo HTML first
 * - Bing HTML fallback
 */
async function searchResultLinksDDG(query: string): Promise<string[]> {
  const q = encodeURIComponent(query);
  const url = `https://duckduckgo.com/html/?q=${q}`;
  const html = await tryFetchHtml(url);
  if (!html) return [];
  const out: string[] = [];

  const rx = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) {
    const href = m[1];
    if (!href) continue;
    try {
      const u = new URL(href);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      out.push(u.toString());
      if (out.length >= 24) break;
    } catch {
      // ignore
    }
  }
  return out;
}

async function searchResultLinksBing(query: string): Promise<string[]> {
  const q = encodeURIComponent(query);
  const url = `https://www.bing.com/search?q=${q}`;
  const html = await tryFetchHtml(url);
  if (!html) return [];
  const out: string[] = [];

  const rx = /<li class="b_algo"[\s\S]*?<a[^>]+href="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) {
    const href = m[1];
    if (!href) continue;
    try {
      const u = new URL(href);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      out.push(u.toString());
      if (out.length >= 24) break;
    } catch {
      // ignore
    }
  }
  return out;
}

async function searchResultLinks(query: string): Promise<string[]> {
  const ddg = await searchResultLinksDDG(query);
  if (ddg.length) return ddg;
  return searchResultLinksBing(query);
}

/* =========================
 * JSON-LD extraction
 * ========================= */

type JsonLd = unknown;

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonLdBlocks(html: string): JsonLd[] {
  const matches = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );
  const blocks: JsonLd[] = [];
  for (const m of matches) {
    const raw = (m[1] || "").trim();
    if (!raw) continue;
    const parsed = safeJsonParse(raw);
    if (parsed == null) continue;
    if (Array.isArray(parsed)) blocks.push(...parsed);
    else blocks.push(parsed);
  }
  return blocks;
}

function firstOf<T>(x: T[] | T | undefined | null): T | undefined {
  if (!x) return undefined;
  return Array.isArray(x) ? x[0] : x;
}

function toNum(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toStr(x: unknown): string | undefined {
  return typeof x === "string" && x.trim().length ? x.trim() : undefined;
}

function normalizeAvailability(raw: unknown): Product["availability"] | undefined {
  const s = String(raw || "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("instock")) return "in_stock";
  if (s.includes("outofstock")) return "out_of_stock";
  if (s.includes("preorder")) return "preorder";
  return "unknown";
}

function hostnameRetailer(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function pickOffer(offers: unknown): Record<string, unknown> | null {
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  for (const o of list) {
    if (typeof o === "object" && o !== null) {
      const availability = String((o as Record<string, unknown>)["availability"] || "").toLowerCase();
      if (availability.includes("instock")) return o as Record<string, unknown>;
    }
  }
  const first = list[0];
  return typeof first === "object" && first !== null ? (first as Record<string, unknown>) : null;
}

function normalizeFromJsonLd(url: string, node: unknown): Product | null {
  if (typeof node !== "object" || node === null) return null;
  const obj = node as Record<string, unknown>;

  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"] as unknown[]) {
      const p = normalizeFromJsonLd(url, child);
      if (p) return p;
    }
    return null;
  }

  const typeVal = obj["@type"];
  const types: string[] = Array.isArray(typeVal)
    ? typeVal.map((t) => String(t).toLowerCase())
    : typeVal
      ? [String(typeVal).toLowerCase()]
      : [];

  const isProduct = types.includes("product");
  const isOffer = types.includes("offer");
  if (!isProduct && !isOffer) return null;

  const productNode: Record<string, unknown> = isProduct
    ? obj
    : typeof obj["itemOffered"] === "object" && obj["itemOffered"] !== null
      ? (obj["itemOffered"] as Record<string, unknown>)
      : obj;

  const title = toStr(productNode["name"]);
  if (!title) return null;

  const brandNode = productNode["brand"];
  const brand =
    typeof brandNode === "string"
      ? brandNode
      : typeof brandNode === "object" && brandNode !== null
        ? toStr((brandNode as Record<string, unknown>)["name"])
        : undefined;

  const offers = productNode["offers"] ?? obj["offers"];
  const offer = pickOffer(offers);

  const price =
    offer
      ? toNum(
          offer["price"] ??
            (typeof offer["priceSpecification"] === "object" &&
            offer["priceSpecification"] !== null
              ? (offer["priceSpecification"] as Record<string, unknown>)["price"]
              : undefined)
        )
      : undefined;

  const currency =
    offer
      ? toStr(
          offer["priceCurrency"] ??
            (typeof offer["priceSpecification"] === "object" &&
            offer["priceSpecification"] !== null
              ? (offer["priceSpecification"] as Record<string, unknown>)["priceCurrency"]
              : undefined)
        )
      : undefined;

  const availability = offer ? normalizeAvailability(offer["availability"]) : undefined;

  const imageRaw = firstOf(productNode["image"] as unknown) ?? productNode["image"];
  const image = toStr(imageRaw);

  const id =
    toStr(productNode["sku"]) ||
    toStr(productNode["productID"]) ||
    toStr(productNode["@id"]) ||
    url;

  return {
    id,
    title,
    brand,
    retailer: hostnameRetailer(url),
    url,
    image,
    price,
    currency,
    availability,
    fit: {
      category: toStr(productNode["category"]),
    },
  };
}

function scrapeFallbackOG(url: string, html: string): Product | null {
  const titleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
  );
  const imgMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );
  const title = titleMatch?.[1]?.trim();
  if (!title) return null;

  return {
    id: url,
    title,
    retailer: hostnameRetailer(url),
    url,
    image: imgMatch?.[1]?.trim() || undefined,
  };
}

async function extractProductFromUrl(url: string): Promise<Product | null> {
  const html = await tryFetchHtml(url);
  if (!html) return null;

  const blocks = extractJsonLdBlocks(html);
  for (const b of blocks) {
    const prod = normalizeFromJsonLd(url, b);
    if (prod) return prod;
  }

  return scrapeFallbackOG(url, html);
}

export async function webProductSearch(opts: WebSearchOptions): Promise<Product[]> {
  if (!isEnabled()) return [];

  const limit = clampLimit(opts.limit);
  const q = opts.query.trim();
  if (!q) return [];

  const allowlist = getAllowlist();

  // reduce blog/editorial results
  const query = `${q} (price OR € OR $)`;

  const linksRaw = await searchResultLinks(query);
  const links = linksRaw
    .filter((u) => allowedByAllowlist(u, allowlist))
    .map((u) => ({ u, s: scoreByRegion(u, opts.preferEU) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.u)
    .slice(0, 20);

  if (!links.length) return [];

  const out: Product[] = [];
  for (const href of links) {
    const prod = await extractProductFromUrl(href);
    if (!prod) continue;

    // avoid obvious non-product pages
    const hasSignal = Boolean(prod.price || prod.currency || prod.image);
    if (!hasSignal) continue;

    out.push(prod);
    if (out.length >= limit) break;
  }

  return uniqBy(out, (p) => p.url).slice(0, limit);
}
