// app/api/chat/serverTools.ts

// ---- Types ---------------------------------------------------------------
type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
  score?: number;
};

type Product = {
  title: string;
  url: string;
  priceText?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
  seller?: string | null;
  source?: string;
};

// ---- Small cache (per lambda instance) -----------------------------------
const cache = new Map<string, { value: any; expires: number }>();
const TTL_WEB = 10 * 60 * 1000;     // 10 min
const TTL_META = 10 * 60 * 1000;    // 10 min
const TTL_CATALOG = 5 * 60 * 1000;  // 5 min

function getCache<T>(key: string) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  return null;
}
function setCache(key: string, value: any, ttlMs: number) {
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

// ---- Utils ---------------------------------------------------------------
const UA =
  "RunwayTwinBot/1.0 (+https://runwaytwin.app; contact@runwaytwin.app)";

function normalizeUrl(u: string) {
  try {
    const url = new URL(u);
    url.hash = "";
    return url.origin + url.pathname;
  } catch {
    return u;
  }
}
function dedupe<T extends { url: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter((x) => {
    const k = normalizeUrl(x.url);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parsePrice(text: string) {
  if (!text) return { amount: null as number | null, currency: null as string | null };
  // Normalize & detect currency/amount (€, $, £, EUR/USD/GBP)
  const clean = text.replace(/\s+/g, "");
  const m =
    clean.match(/(€|EUR|\$|USD|£|GBP)\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i) ||
    clean.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s?(€|EUR|\$|USD|£|GBP)/i);

  if (!m) return { amount: null, currency: null };

  const cur = (m[1] || m[2]).toUpperCase();
  let num = (m[2] || m[1]).replace(/\s/g, "");

  // Convert thousands/decimal intelligently
  // e.g., "1.299,00" -> "1299.00", "1,299.00" -> "1299.00"
  if (num.includes(",") && num.includes(".")) {
    if (num.indexOf(".") < num.indexOf(",")) {
      num = num.replace(/\./g, "").replace(",", ".");
    } else {
      num = num.replace(/,/g, "");
    }
  } else if (num.includes(",")) {
    // Assume comma decimal in EU formats
    num = num.replace(/\./g, "").replace(",", ".");
  } else {
    // Already dot decimal or integer
    num = num.replace(/,/g, "");
  }

  const amount = Number(num);
  const currency =
    cur === "EUR" ? "€" : cur === "USD" ? "$" : cur === "GBP" ? "£" : cur;

  return { amount: Number.isFinite(amount) ? amount : null, currency };
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ---- Web Search (SerpAPI -> Brave -> Bing) -------------------------------
export async function web_search(
  query: string,
  num: number = 5
): Promise<SearchResult[]> {
  const key = `web_search:${query}:${num}`;
  const cached = getCache<SearchResult[]>(key);
  if (cached) return cached;

  const out: SearchResult[] = [];

  // 1) SerpAPI Google
  if (process.env.SERPAPI_KEY) {
    try {
      const j = await fetchJson(
        `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
          query
        )}&num=${Math.min(num * 2, 10)}&api_key=${process.env.SERPAPI_KEY}`
      );
      (j.organic_results || []).forEach((r: any) => {
        if (r?.link && r?.title)
          out.push({
            title: r.title,
            url: r.link,
            snippet: r.snippet,
            source: "serpapi",
          });
      });
    } catch {}
  }

  // 2) Brave Search
  if (!out.length && process.env.BRAVE_API_KEY) {
    try {
      const r = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
          query
        )}&count=${Math.min(num * 2, 20)}`,
        { headers: { "X-Subscription-Token": process.env.BRAVE_API_KEY!, "User-Agent": UA } }
      );
      const j: any = await r.json();
      (j?.web?.results || []).forEach((it: any) => {
        if (it?.url && it?.title)
          out.push({
            title: it.title,
            url: it.url,
            snippet: it.description,
            source: "brave",
          });
      });
    } catch {}
  }

  // 3) Bing Web
  if (!out.length && process.env.BING_SEARCH_KEY) {
    try {
      const j = await fetchJson(
        `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(
          query
        )}&count=${Math.min(num * 2, 10)}`,
        { headers: { "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_KEY! } }
      );
      (j.webPages?.value || []).forEach((it: any) => {
        if (it?.url && it?.name)
          out.push({
            title: it.name,
            url: it.url,
            snippet: it.snippet,
            source: "bing",
          });
      });
    } catch {}
  }

  // Rank + dedupe
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const ranked = dedupe(out)
    .map((r) => {
      const t = r.title?.toLowerCase() || "";
      let score = 0;
      for (const tok of tokens) if (t.includes(tok)) score += 1;
      try {
        const u = new URL(r.url);
        if (u.protocol === "https:") score += 0.3;
        if (u.pathname.length < 36) score += 0.2;
      } catch {}
      return { ...r, score };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, num);

  setCache(key, ranked, TTL_WEB);
  return ranked;
}

// ---- URL Metadata / Price Extraction (Edge-safe) --------------------------
export async function open_url_extract(url: string) {
  const key = `open_url_extract:${normalizeUrl(url)}`;
  const cached = getCache<any>(key);
  if (cached) return cached;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await res.text();

    const meta = (name: string) => {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
        "i"
      );
      const m = html.match(re);
      return m ? m[1] : null;
    };

    const titleTag = (() => {
      const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return m ? m[1].trim() : null;
    })();

    const title = meta("og:title") || meta("twitter:title") || titleTag || "Untitled";

    // Price heuristics
    const priceMeta = meta("product:price:amount") || meta("og:price:amount") || null;
    const priceCurMeta =
      meta("product:price:currency") || meta("og:price:currency") || null;

    let priceText: string | null = null;
    if (priceMeta) {
      priceText = priceCurMeta ? `${priceCurMeta} ${priceMeta}` : priceMeta;
    } else {
      const m = html.match(
        /(?:price|Price|PRICE)[^<>\n]{0,24}(€|EUR|\$|USD|£|GBP)\s?[0-9][0-9., ]{0,12}/
      );
      priceText = m ? m[0] : null;
    }

    const { amount: priceAmount, currency } = parsePrice(priceText || "");
    const merchant = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return null;
      }
    })();

    const out = { url, title, priceText, priceAmount, currency, merchant };
    setCache(key, out, TTL_META);
    return out;
  } catch {
    return {
      url,
      title: "Unavailable",
      priceText: null,
      priceAmount: null,
      currency: null,
      merchant: null,
    };
  }
}

// ---- Catalog Search (Google Shopping via SerpAPI) -------------------------
export async function catalog_search(query: string, budget: string): Promise<Product[]> {
  const key = `catalog_search:${query}:${budget}`;
  const cached = getCache<Product[]>(key);
  if (cached) return cached;

  const out: Product[] = [];

  // Preferred: SerpAPI Google Shopping
  if (process.env.SERPAPI_KEY) {
    try {
      const j = await fetchJson(
        `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
          query
        )}&api_key=${process.env.SERPAPI_KEY}`
      );
      (j.shopping_results || []).forEach((it: any) => {
        out.push({
          title: it.title,
          url: it.link || it.product_link || "",
          priceText: it.price,
          ...parsePrice(it.price || ""),
          seller: it.source || it.store || null,
          source: "serpapi_shopping",
        });
      });
    } catch {}
  }

  // Fallback: web_search + metadata extraction
  if (!out.length) {
    const web = await web_search(`${query} ${budget}`, 6);
    for (const r of web) {
      const meta = await open_url_extract(r.url);
      out.push({
        title: r.title,
        url: r.url,
        priceText: meta.priceText,
        priceAmount: meta.priceAmount,
        currency: meta.currency,
        seller: meta.merchant,
        source: r.source,
      });
    }
  }

  const deduped = dedupe(out).slice(0, 12);
  setCache(key, deduped, TTL_CATALOG);
  return deduped;
}
