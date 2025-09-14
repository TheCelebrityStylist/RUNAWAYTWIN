import type { Tool } from "openai/resources/beta/responses";
import * as cheerio from "cheerio";

const AFFILIATE_MODE = process.env.AFFILIATE_MODE === "true";
const AFFILIATE_PARTNER = process.env.AFFILIATE_PARTNER || ""; // e.g., "awin" | "rakuten" | "cj"
const AFFILIATE_API_KEY = process.env.AFFILIATE_API_KEY || "";
const SERPAPI_KEY = process.env.SERPAPI_KEY || ""; // optional; else use a simple Bing endpoint if you have one

/** Build affiliate url if enabled; else pass-through. */
export function buildAffiliateUrl(rawUrl: string): string {
  if (!AFFILIATE_MODE || !AFFILIATE_PARTNER) return rawUrl;
  // VERY SIMPLE EXAMPLE. Replace per-partner.
  const u = new URL(rawUrl);
  u.searchParams.set("utm_source", "runwaytwin");
  u.searchParams.set("utm_medium", "affiliate");
  u.searchParams.set("utm_campaign", AFFILIATE_PARTNER);
  return u.toString();
}

/** Server-side web search (SerpAPI recommended; stub falls back to Bing web). */
export async function web_search_impl(query: string, num = 5) {
  if (!SERPAPI_KEY) {
    // Minimal fallback: you can swap this to your own server-side search proxy.
    return [
      { title: "Search disabled (no SERPAPI_KEY)", url: "https://example.com" }
    ];
  }
  const res = await fetch(
    `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=${num}&api_key=${SERPAPI_KEY}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  const items = (json.organic_results || [])
    .slice(0, num)
    .map((r: any) => ({ title: r.title, url: r.link }));
  return items;
}

/** Scrape a URL and extract title/price (best-effort). */
export async function open_url_extract_impl(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const html = await res.text();
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").first().text().trim() ||
    "";

  // crude price guessers (retailers differ a lot)
  const text = $("body").text();
  const priceMatch = text.match(/€\s?\d+[\.,]?\d*/i) || text.match(/\$\s?\d+[\.,]?\d*/);
  const price = priceMatch ? priceMatch[0].replace(/\s/g, "") : "";

  return { title, price };
}

/** Catalog search: live only if you add an affiliate API. Stub returns tasteful stand-ins. */
export async function catalog_search_impl(opts: {
  query: string;
  budgetTier: "HIGH_STREET" | "MID" | "LUXURY";
  region: "EU" | "US";
  role?: string;
  limit?: number;
}) {
  const limit = opts.limit ?? 6;

  if (AFFILIATE_MODE && AFFILIATE_API_KEY) {
    // TODO: implement your partner’s API call here and normalize:
    // return items.map(({title, brand, retailer, url, priceValue, currency}) => ({ ... }))
  }

  // tasteful placeholders (you can replace with your static curation)
  const samples = [
    {
      role: "TOP",
      title: "crisp poplin shirt — minimalist everyday",
      brand: opts.budgetTier === "LUXURY" ? "The Row" : opts.budgetTier === "MID" ? "COS" : "Mango",
      retailer: opts.region === "EU" ? "Net-A-Porter" : "Nordstrom",
      url: buildAffiliateUrl("https://www.net-a-porter.com/"),
      price: { value: opts.budgetTier === "LUXURY" ? 520 : opts.budgetTier === "MID" ? 95 : 39, currency: opts.region === "EU" ? "EUR" : "USD" },
      notes: "clean shoulder, sharp collar; sets the line"
    },
    {
      role: "BOTTOM",
      title: "high-waisted wide-leg trouser — long-line ease",
      brand: opts.budgetTier === "LUXURY" ? "Victoria Beckham" : opts.budgetTier === "MID" ? "COS" : "Zara",
      retailer: opts.region === "EU" ? "Net-A-Porter" : "Nordstrom",
      url: buildAffiliateUrl("https://www.net-a-porter.com/"),
      price: { value: opts.budgetTier === "LUXURY" ? 690 : opts.budgetTier === "MID" ? 120 : 49, currency: opts.region === "EU" ? "EUR" : "USD" },
      notes: "elongates the leg; works across body types"
    },
    {
      role: "OUTERWEAR",
      title: "cropped leather jacket — quiet edge",
      brand: opts.budgetTier === "LUXURY" ? "Saint Laurent" : opts.budgetTier === "MID" ? "Arket" : "Pull&Bear",
      retailer: opts.region === "EU" ? "Net-A-Porter" : "Nordstrom",
      url: buildAffiliateUrl("https://www.net-a-porter.com/"),
      price: { value: opts.budgetTier === "LUXURY" ? 2400 : opts.budgetTier === "MID" ? 220 : 79, currency: opts.region === "EU" ? "EUR" : "USD" },
      notes: "adds structure at shoulder; balances volume"
    }
  ];

  return samples.slice(0, limit);
}

/** OpenAI tool schemas */
export const toolSchemas: Tool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Find recent pages about a product, celeb outfit, retailer availability.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          num: { type: "number" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_url_extract",
      description: "Open a product/article URL and extract title and price (best-effort).",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string" }
        },
        required: ["url"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "catalog_search",
      description: "Search product catalog by query/budget/region/role. Returns normalized items.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          budgetTier: { type: "string", enum: ["HIGH_STREET", "MID", "LUXURY"] },
          region: { type: "string", enum: ["EU", "US"] },
          role: { type: "string" },
          limit: { type: "number" }
        },
        required: ["query", "budgetTier", "region"]
      }
    }
  }
];

/** Router for tool calls */
export async function callTool(name: string, args: any) {
  switch (name) {
    case "web_search":
      return await web_search_impl(args.query, args.num);
    case "open_url_extract":
      return await open_url_extract_impl(args.url);
    case "catalog_search":
      return await catalog_search_impl(args);
    default:
      return { error: `Unknown tool ${name}` };
  }
}
