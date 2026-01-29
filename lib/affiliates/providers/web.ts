// FILE: lib/affiliates/providers/web.ts
import type { Product, ProviderResult } from "@/lib/affiliates/types";

type SearchOpts = { limit: number };

// Put category under fit.category (since Product has `fit?: { category?: ... }`)
type FitCategory = NonNullable<Product["fit"]>["category"];

function safeCategoryFromQuery(q: string): FitCategory {
  const s = q.toLowerCase();
  if (s.includes("shoe") || s.includes("sneaker") || s.includes("boot") || s.includes("heel"))
    return "Shoes";
  if (s.includes("dress")) return "Dress";
  if (s.includes("trouser") || s.includes("pants") || s.includes("jean") || s.includes("skirt"))
    return "Bottom";
  if (s.includes("coat") || s.includes("jacket") || s.includes("trench") || s.includes("blazer"))
    return "Outerwear";
  if (s.includes("bag") || s.includes("handbag")) return "Bag";
  if (s.includes("shirt") || s.includes("tee") || s.includes("top") || s.includes("blouse") || s.includes("knit"))
    return "Top";
  return "Accessory";
}

function numOrUndef(x: unknown): number | undefined {
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}

function strOrUndef(x: unknown): string | undefined {
  return typeof x === "string" && x.trim() ? x : undefined;
}

export const webProvider = {
  async search(query: string, opts: SearchOpts): Promise<ProviderResult> {
    // Mock-safe: if no external key, return empty (your /api/chat fills with MOCK_CATALOG anyway)
    if (!process.env.TAVILY_API_KEY) return { items: [] };

    const max = Math.min(Math.max(opts.limit ?? 12, 1), 24);
    const category = safeCategoryFromQuery(query);

    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: max,
        include_answer: false,
        include_raw_content: false,
      }),
    }).catch(() => null);

    if (!resp || !resp.ok) return { items: [] };

    const data = (await resp.json().catch(() => ({}))) as {
      results?: Array<{
        title?: unknown;
        url?: unknown;
        // some providers add these, keep optional
        image?: unknown;
        price?: unknown;
        currency?: unknown;
        brand?: unknown;
        retailer?: unknown;
      }>;
    };

    const results = Array.isArray(data.results) ? data.results : [];
    const items: Product[] = results
      .map((r, i) => {
        const title = strOrUndef(r.title) ?? "Item";
        const url = strOrUndef(r.url);
        if (!url) return null;

        const image = strOrUndef((r as any).image);
        const price = numOrUndef((r as any).price);
        const currency = strOrUndef((r as any).currency) ?? "EUR";
        const brand = strOrUndef((r as any).brand);
        const retailer = strOrUndef((r as any).retailer);

        const p: Product = {
          id: `web-${i}-${Buffer.from(url).toString("base64").slice(0, 12)}`,
          title,
          url,
          price,
          currency,
          image,
          brand,
          retailer,
          fit: { category },
        };

        return p;
      })
      .filter((x): x is Product => Boolean(x))
      .slice(0, max);

    return { items };
  },
};
