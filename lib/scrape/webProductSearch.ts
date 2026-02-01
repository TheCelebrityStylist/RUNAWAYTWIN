// FILE: lib/scrape/webProductSearch.ts
export const runtime = "edge";

import type { Product, Category } from "@/lib/affiliates/types";

type WebSearchOptions = {
  query: string;
  limit?: number;
  preferEU?: boolean;
};

const UA = "Mozilla/5.0 (compatible; RunwayTwinBot/1.0; +https://runwaytwin.local)";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 24;

function enabled(): boolean {
  const v = (process.env.WEB_SCRAPE_ENABLED || "true").trim().toLowerCase();
  return v !== "false" && v !== "0";
}

function allowlist(): string[] {
  const raw = (process.env.WEB_SCRAPE_DOMAINS_ALLOWLIST || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
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

function normalizeCategory(value: unknown): Category | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.toLowerCase();
  if (raw.includes("shoe") || raw.includes("sneaker") || raw.includes("boot") || raw.includes("heel"))
    return "Shoes";
  if (raw.includes("dress")) return "Dress";
  if (raw.includes("trouser") || raw.includes("pants") || raw.includes("jean") || raw.includes("skirt"))
    return "Bottom";
  if (raw.includes("coat") || raw.includes("jacket") || raw.includes("trench") || raw.includes("blazer"))
    return "Outerwear";
  if (raw.includes("bag") || raw.includes("handbag")) return "Bag";
  if (raw.includes("shirt") || raw.includes("tee") || raw.includes("top") || raw.includes("blouse") || raw.includes("knit"))
    return "Top";
  if (raw.includes("accessory")) return "Accessory";
  return undefined;
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

function regionScore(url: string, preferEU?: boolean): number {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const isEU = EU_HOST_HINTS.some((h) => host.includes(h));
    return preferEU ? (isEU ? 2 : 0) : isEU ? 0 : 2;
  } catch {
    return 0;
  }
}

function allowedByAllowlist(url: string, list: string[]): boolean {
  if (list.length === 0) return true;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return list.some((d) => host === d || host.endsWith(`.${d}`) || host.includes(d));
  } catch {
    return false;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 300) return null;
    return html;
  } catch {
    return null;
  }
}

async function ddgLinks(query: string): Promise<string[]> {
  const q = encodeURIComponent(query);
  const html = await fetchHtml(`https://duckduckgo.com/html/?q=${q}`);
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

async function bingLinks(query: string): Promise<string[]> {
  const q = encodeURIComponent(query);
  const html = await fetchHtml(`https://www.bing.com/search?q=${q}`);
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

async function searchLinks(query: string): Promise<string[]> {
  const a = await ddgLinks(query);
  if (a.length) return a;
  return bingLinks(query);
}

/* ---------------- JSON-LD product parsing ---------------- */

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonLd(html: string): unknown[] {
  const matches = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );
  const blocks: unknown[] = [];
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

function first<T>(x: T[] | T | undefined | null): T | undefined {
  if (!x) return undefined;
  return Array.isArray(x) ? x[0] : x;
}

function str(x: unknown): string | undefined {
  return typeof x === "string" && x.trim() ? x.trim() : undefined;
}

function num(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function availability(raw: unknown): Product["availability"] | undefined {
  const s = String(raw || "").toLowerCase();
  if (!s) return undefined;
  if (s.includes("instock")) return "in_stock";
  if (s.includes("outofstock")) return "out_of_stock";
  if (s.includes("preorder")) return "preorder";
  return "unknown";
}

function retailerDomain(url: string): string | undefined {
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
      const a = String((o as Record<string, unknown>)["availability"] || "").toLowerCase();
      if (a.includes("instock")) return o as Record<string, unknown>;
    }
  }
  const firstOffer = list[0];
  return typeof firstOffer === "object" && firstOffer !== null
    ? (firstOffer as Record<string, unknown>)
    : null;
}

function fromJsonLd(url: string, node: unknown): Product | null {
  if (typeof node !== "object" || node === null) return null;
  const obj = node as Record<string, unknown>;

  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"] as unknown[]) {
      const p = fromJsonLd(url, child);
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

  const title = str(productNode["name"]);
  if (!title) return null;

  const brandNode = productNode["brand"];
  const brand =
    typeof brandNode === "string"
      ? brandNode
      : typeof brandNode === "object" && brandNode !== null
        ? str((brandNode as Record<string, unknown>)["name"])
        : undefined;

  const offer = pickOffer(productNode["offers"] ?? obj["offers"]);

  const price = offer
    ? num(
        offer["price"] ??
          (typeof offer["priceSpecification"] === "object" && offer["priceSpecification"] !== null
            ? (offer["priceSpecification"] as Record<string, unknown>)["price"]
            : undefined)
      )
    : undefined;

  const currency = offer
    ? str(
        offer["priceCurrency"] ??
          (typeof offer["priceSpecification"] === "object" && offer["priceSpecification"] !== null
            ? (offer["priceSpecification"] as Record<string, unknown>)["priceCurrency"]
            : undefined)
      )
    : undefined;

  const imageRaw = first(productNode["image"] as unknown) ?? productNode["image"];
  const image = str(imageRaw);

  const id = str(productNode["sku"]) || str(productNode["productID"]) || str(productNode["@id"]) || url;

  return {
    id,
    title,
    brand,
    retailer: retailerDomain(url),
    url,
    image,
    price,
    currency,
    availability: offer ? availability(offer["availability"]) : undefined,
    fit: { category: normalizeCategory(productNode["category"]) },
  };
}

function ogFallback(url: string, html: string): Product | null {
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
    retailer: retailerDomain(url),
    url,
    image: imgMatch?.[1]?.trim() || undefined,
  };
}

async function extractProduct(url: string): Promise<Product | null> {
  const html = await fetchHtml(url);
  if (!html) return null;

  const blocks = extractJsonLd(html);
  for (const b of blocks) {
    const p = fromJsonLd(url, b);
    if (p && (p.price != null || p.image)) return p;
  }

  const og = ogFallback(url, html);
  if (og && og.image) return og;

  return null;
}

export async function webProductSearch(opts: WebSearchOptions): Promise<Product[]> {
  if (!enabled()) return [];

  const q = opts.query.trim();
  if (!q) return [];

  const limit = clampLimit(opts.limit);
  const list = allowlist();

  // discourage editorials
  const query = `${q} (price OR € OR $)`;

  const linksRaw = await searchLinks(query);
  const links = linksRaw
    .filter((u) => allowedByAllowlist(u, list))
    .map((u) => ({ u, s: regionScore(u, opts.preferEU) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.u)
    .slice(0, 20);

  const out: Product[] = [];
  for (const href of links) {
    const p = await extractProduct(href);
    if (!p) continue;
    out.push(p);
    if (out.length >= limit) break;
  }

  return uniqBy(out, (p) => p.url).slice(0, limit);
}
