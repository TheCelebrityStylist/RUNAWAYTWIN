// FILE: lib/affiliates/providers/web.ts
// "web" provider: scrapes real product/article links via DuckDuckGo HTML,
// then enriches each result with OG image + best-effort brand inference.
//
// This is intentionally "no-keys" and deploy-safe on Vercel Edge.
// Note: some retailers block bots; we enrich via direct fetch + lightweight parsing.

import type { Product, Provider, ProviderSearchOptions, ProviderSearchResult, Category } from "@/lib/affiliates/types";

const DDG_ENDPOINT = "https://duckduckgo.com/html/";

const DEFAULT_CURRENCY_BY_COUNTRY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  UK: "GBP",
  CA: "CAD",
  AU: "AUD",
  NL: "EUR",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
};

function currencyForCountry(country?: string): string | null {
  const c = (country || "").trim().toUpperCase();
  if (!c) return null;
  return DEFAULT_CURRENCY_BY_COUNTRY[c] ?? null;
}

function safeCategoryFromQuery(q: string): Category | undefined {
  const s = q.toLowerCase();
  if (s.includes("shoe") || s.includes("sneaker") || s.includes("boot") || s.includes("heel")) return "Shoes";
  if (s.includes("bag") || s.includes("tote") || s.includes("clutch") || s.includes("backpack")) return "Bag";
  if (s.includes("coat") || s.includes("trench") || s.includes("jacket") || s.includes("blazer")) return "Outerwear";
  if (s.includes("dress") || s.includes("gown")) return "Dress";
  if (s.includes("trouser") || s.includes("pants") || s.includes("jeans") || s.includes("skirt")) return "Bottom";
  if (s.includes("shirt") || s.includes("tee") || s.includes("top") || s.includes("blouse") || s.includes("knit"))
    return "Top";
  if (s.includes("scarf") || s.includes("belt") || s.includes("hat") || s.includes("sunglass") || s.includes("jewelry"))
    return "Accessory";
  return undefined;
}

function normalizeUrl(u: string): string | null {
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // Drop tracking parameters aggressively
    url.hash = "";
    const keep = new URL(url.toString());
    const params = new URLSearchParams(keep.search);
    const DROP_PREFIXES = ["utm_", "ref", "ref_", "fbclid", "gclid", "yclid", "mc_cid", "mc_eid"];
    for (const key of Array.from(params.keys())) {
      const low = key.toLowerCase();
      if (DROP_PREFIXES.some((p) => low === p || low.startsWith(p))) params.delete(key);
    }
    keep.search = params.toString();
    return keep.toString();
  } catch {
    return null;
  }
}

function inferBrandFromHost(hostname: string): string | null {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  const parts = host.split(".");
  const root = parts.length >= 2 ? parts[parts.length - 2] : host;
  if (!root) return null;

  const special: Record<string, string> = {
    "massimodutti": "Massimo Dutti",
    "net-a-porter": "NET-A-PORTER",
    "farfetch": "FARFETCH",
    "mytheresa": "Mytheresa",
    "victoriassecret": "Victoria's Secret",
    "h": "H&M",
  };

  if (special[root]) return special[root];

  // Title-case fallback
  return root
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function decodeHtmlEntities(input: string): string {
  // Minimal entity decoding for DDG titles/snippets
  return input
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function stripTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function buildId(url: string): string {
  // Stable-ish id from hostname+path
  try {
    const u = new URL(url);
    const base = `${u.hostname.replace(/^www\./, "")}${u.pathname}`.toLowerCase();
    // Simple hash
    let h = 2166136261;
    for (let i = 0; i < base.length; i++) {
      h ^= base.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return `web_${(h >>> 0).toString(16)}`;
  } catch {
    return `web_${crypto.randomUUID()}`;
  }
}

type DdgHit = { title: string; url: string };

function extractDdgResults(html: string, limit: number): DdgHit[] {
  // DuckDuckGo HTML SERP has anchors like:
  // <a rel="nofollow" class="result__a" href="...">Title</a>
  const out: DdgHit[] = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    const hrefRaw = m[1] || "";
    const titleRaw = m[2] || "";
    const title = stripTags(titleRaw);

    // DDG often uses /l/?kh=-1&uddg=<encoded>
    let href = hrefRaw;
    try {
      const u = new URL(hrefRaw, "https://duckduckgo.com");
      if (u.pathname === "/l/" && u.searchParams.has("uddg")) {
        href = decodeURIComponent(u.searchParams.get("uddg") || "");
      }
    } catch {
      // keep raw
    }

    const url = normalizeUrl(href);
    if (!title || !url) continue;
    out.push({ title, url });
  }
  return out;
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; RunwayTwinBot/1.0; +https://example.com/bot)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractMetaContent(html: string, propNames: string[]): string | null {
  // Look for: <meta property="og:image" content="...">
  // or: <meta name="twitter:image" content="...">
  for (const name of propNames) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
    const m = html.match(re);
    if (m && typeof m[1] === "string") return m[1].trim();
  }
  return null;
}

async function enrichHits(hits: DdgHit[], country?: string, query?: string): Promise<Product[]> {
  const currency = currencyForCountry(country);

  // Limit enrichment to avoid timeouts on Edge
  const maxEnrich = Math.min(hits.length, 6);
  const enriched: Product[] = [];

  for (let i = 0; i < hits.length; i++) {
    const h = hits[i];
    let image: string | null = null;
    let brand: string | null = null;

    try {
      const u = new URL(h.url);
      brand = inferBrandFromHost(u.hostname);
    } catch {
      brand = null;
    }

    if (i < maxEnrich) {
      const html = await fetchText(h.url, 3500);
      if (html) {
        const ogImg = extractMetaContent(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
        const ogSite = extractMetaContent(html, ["og:site_name", "twitter:site"]);
        if (ogImg) image = normalizeUrl(ogImg) ?? ogImg;
        if (ogSite && (!brand || brand.length < 2)) brand = stripTags(ogSite);
      }
    }

    enriched.push({
      id: buildId(h.url),
      title: h.title,
      url: h.url,
      image,
      price: null,
      currency,
      brand,
      fit: {
        category: query ? safeCategoryFromQuery(query) : undefined,
        reason: "Found via web search (DDG HTML).",
        tags: ["web", "search"],
      },
      source: "web",
    });
  }

  // Deduplicate by hostname+pathname
  const seen = new Set<string>();
  const unique: Product[] = [];
  for (const p of enriched) {
    try {
      const u = new URL(p.url);
      const key = `${u.hostname.replace(/^www\./, "")}${u.pathname}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(p);
    } catch {
      // keep
      unique.push(p);
    }
  }

  return unique;
}

async function ddgSearch(query: string, limit: number): Promise<DdgHit[]> {
  const body = new URLSearchParams({ q: query, kl: "wt-wt" }); // "wt-wt" = worldwide-ish
  const res = await fetch(DDG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (compatible; RunwayTwinBot/1.0; +https://example.com/bot)",
      "Accept": "text/html",
    },
    body,
  }).catch(() => null);

  if (!res || !res.ok) return [];
  const html = await res.text().catch(() => "");
  if (!html) return [];
  return extractDdgResults(html, limit);
}

export const webProvider: Provider = {
  key: "web",
  async search(query: string, opts: ProviderSearchOptions): Promise<ProviderSearchResult> {
    const limit = Math.min(Math.max(opts.limit, 1), 24);
    const hits = await ddgSearch(query, limit);
    const products = await enrichHits(hits, opts.country, query);
    return { items: products.slice(0, limit) };
  },
};
