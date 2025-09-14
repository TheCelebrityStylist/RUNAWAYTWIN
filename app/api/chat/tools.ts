import * as cheerio from "cheerio";

export type NormalizedProduct = {
  title: string;
  retailer: string;
  price: string;
  currency: string;
  url: string;
  image?: string;
  tags?: string[];
  score?: number; // stylistic fit score
};

export const toolSchemas = [
  {
    name: "web_search",
    description:
      "Search the web for recent fashion coverage or product roundups. Prefer official retailer/editorial sources. Returns {items:[{title,url,snippet}]}",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        num: { type: "integer", minimum: 1, maximum: 10, default: 5 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "open_url_extract",
    description:
      "Open a URL and extract helpful fields for styling or shopping: title, description, price, currency when present.",
    parameters: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
      additionalProperties: false,
    },
  },
  {
    name: "catalog_search",
    description:
      "Search retailer catalogs (affiliate-ready). Returns normalized {items: NormalizedProduct[]}. Use when user requests shopping links.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        budget: { type: "string", description: "high-street | mid | luxury" },
        region: { type: "string", description: "EU | US" },
        limit: { type: "integer", minimum: 1, maximum: 12, default: 8 },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
] as const;

// --- helpers -----------------------------------------------------------------
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function priceBand(budget?: string) {
  // rough normalization for future filtering/scoring
  switch ((budget || "").toLowerCase()) {
    case "high-street":
      return { min: 0, max: 120 };
    case "mid":
      return { min: 80, max: 350 };
    case "luxury":
      return { min: 250, max: 2000 };
    default:
      return { min: 0, max: 99999 };
  }
}

function parsePrice(raw: string) {
  const m = raw.match(/([\d.,]+)/);
  return m ? Number(m[1].replace(/[.,](?=.*\d{3}\b)/g, "").replace(",", ".")) : NaN;
}

// Score by rough budget fit + title relevance
function scoreProduct(p: NormalizedProduct, q: string, budget?: string) {
  const { min, max } = priceBand(budget);
  const num = parsePrice(p.price);
  let s = 0;
  if (!isNaN(num)) {
    if (num >= min && num <= max) s += 0.6;
    else s -= 0.2;
  }
  const t = `${p.title} ${p.retailer}`.toLowerCase();
  const qi = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = qi.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
  s += clamp(hit / (qi.length || 1), 0, 0.4);
  return Number(s.toFixed(3));
}

// --- tool implementations ----------------------------------------------------
export async function runTool(name: string, args: any): Promise<unknown> {
  try {
    if (name === "web_search") {
      const { query, num = 5 } = args ?? {};
      const SERP_API_KEY = process.env.SERP_API_KEY;
      if (!SERP_API_KEY) {
        return {
          warning:
            "SERP_API_KEY not set; add it in Vercel to enable real search. Returning empty items.",
          items: [],
        };
      }
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", String(query));
      url.searchParams.set("num", String(clamp(Number(num) || 5, 1, 10)));
      url.searchParams.set("api_key", SERP_API_KEY);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const data = await res.json();
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

      return { url, title, description, price: metaPrice, currency };
    }

    if (name === "catalog_search") {
      const { query, budget, region, limit = 8 } = args ?? {};
      const hasKey =
        process.env.AWIN_API_KEY ||
        process.env.RAKUTEN_API_KEY ||
        process.env.CJ_API_KEY ||
        process.env.LTK_API_KEY;

      // Placeholder inventory until affiliate APIs are wired.
      let items: NormalizedProduct[] = Array.from({ length: clamp(limit, 1, 12) }).map(
        (_, i) => ({
          title: `${query ?? "item"} — ${budget ?? "mixed"} #${i + 1}`,
          retailer: region === "US" ? "Nordstrom" : "Zara",
          price: region === "US" ? "$120" : "€110",
          currency: region === "US" ? "USD" : "EUR",
          url: "",
          image: "",
          tags: [budget || "", region || ""].filter(Boolean),
        })
      );

      // Once affiliates exist, replace with live calls and keep this return shape.
      // Example: score + sort
      items = items
        .map((p) => ({ ...p, score: scoreProduct(p, String(query || ""), budget) }))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      return {
        items,
        note: hasKey
          ? "Affiliate keys detected — wire provider adapters to return live inventory."
          : "No affiliate keys yet — returning placeholders with stylistic scores.",
      };
    }

    return { error: `Unknown tool: ${name}` };
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
}
