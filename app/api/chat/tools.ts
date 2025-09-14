// /app/api/chat/tools.ts
// Tool schemas (for OpenAI) + server-side implementations the model can call.

import * as cheerio from "cheerio";

/**
 * OpenAI "tools" schema (function calling).
 * IMPORTANT: Each tool must be wrapped as { type: "function", function: {...} } when passed to the API.
 * We export only the function part here; route.ts will wrap it properly.
 */
export const toolSchemas = [
  {
    name: "web_search",
    description:
      "Search the web for recent fashion coverage or product roundups. Prefer official retailer/editorial sources. Returns an array of {title, url, snippet}.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query." },
        num: {
          type: "integer",
          description: "How many results (1–10).",
          minimum: 1,
          maximum: 10,
          default: 5,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "open_url_extract",
    description:
      "Open a URL and extract helpful fields for styling or shopping: title, description, price, currency when present (OpenGraph or HTML).",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to open." },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "catalog_search",
    description:
      "Search retailer catalogs (affiliate-ready). Returns normalized products. Use when user asks for working product links. If provider keys are missing, return an explanation.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to find (e.g., 'satin column skirt')." },
        budget: {
          type: "string",
          description: "Budget band (high-street | mid | luxury).",
        },
        region: {
          type: "string",
          description: "User region (EU | US).",
        },
        limit: {
          type: "integer",
          description: "Max items to return (1–12).",
          minimum: 1,
          maximum: 12,
          default: 6,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
] as const;

/**
 * Execute a tool on the server.
 * You can safely expand these later (e.g., connect SerpAPI, Amazon PA-API, LTK, Awin, CJ, etc).
 */
export async function runTool(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
): Promise<unknown> {
  try {
    if (name === "web_search") {
      const { query, num = 5 } = args ?? {};
      const SERP_API_KEY = process.env.SERP_API_KEY;

      if (!SERP_API_KEY) {
        // Graceful fallback when no key yet
        return {
          warning:
            "SERP_API_KEY missing — returning a placeholder format. Add SERP_API_KEY in Vercel to enable real results.",
          items: [],
        };
      }

      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", String(query));
      url.searchParams.set("num", String(Math.min(Math.max(Number(num) || 5, 1), 10)));
      url.searchParams.set("api_key", SERP_API_KEY);

      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error(`SERP request failed: ${res.status}`);
      const data = (await res.json()) as any;

      const items =
        data?.organic_results?.slice(0, num).map((r: any) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          source: "google-serpapi",
        })) ?? [];

      return { items };
    }

    if (name === "open_url_extract") {
      const { url } = args ?? {};
      if (!url) return { error: "Missing url" };

      const res = await fetch(url, { cache: "no-store" });
      const html = await res.text();
      const $ = cheerio.load(html);

      // Basic extraction
      const og = (prop: string) =>
        $(`meta[property="${prop}"]`).attr("content") ||
        $(`meta[name="${prop}"]`).attr("content") ||
        "";

      const title =
        og("og:title") ||
        $("title").first().text().trim() ||
        $("h1").first().text().trim();

      const description =
        og("og:description") ||
        $('meta[name="description"]').attr("content") ||
        "";

      // Common price hints
      const metaPrice =
        $('meta[property="product:price:amount"]').attr("content") ||
        $('[itemprop="price"]').attr("content") ||
        $('[data-test*="price"]').first().text().trim() ||
        $('[class*=price]').first().text().trim() ||
        "";

      const currency =
        $('meta[property="product:price:currency"]').attr("content") ||
        $('[itemprop="priceCurrency"]').attr("content") ||
        "";

      return {
        url,
        title,
        description,
        price: metaPrice,
        currency,
      };
    }

    if (name === "catalog_search") {
      // Placeholder until you plug real affiliate catalogs.
      // Keep the contract stable so you can swap providers later.
      const { query, budget, region, limit = 6 } = args ?? {};
      const HAS_KEY =
        process.env.AWIN_API_KEY ||
        process.env.RAKUTEN_API_KEY ||
        process.env.CJ_API_KEY ||
        process.env.LTK_API_KEY;

      if (!HAS_KEY) {
        return {
          warning:
            "No affiliate/catalog API keys configured yet — returning structured placeholders.",
          items: Array.from({ length: Math.min(limit, 6) }).map((_, i) => ({
            title: `${query ?? "item"} · placeholder ${i + 1}`,
            retailer: "TBD",
            price: "",
            currency: region === "US" ? "USD" : "EUR",
            url: "",
            image: "",
            tags: [budget, region].filter(Boolean),
          })),
        };
      }

      // TODO: plug your real provider(s) here.
      return { items: [] };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
}
