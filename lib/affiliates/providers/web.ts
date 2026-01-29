// FILE: lib/affiliates/providers/web.ts
// "web" provider: returns real product results using SerpAPI (preferred) or Tavily (fallback).
// Works in mock-safe mode: if no keys are set, it returns an empty list.

import type { Provider, ProviderResult, Product } from "@/lib/affiliates/types";
import { searchProductsSerpApi } from "@/lib/products/search";

type SearchOpts = { limit: number };

function safeCategoryFromQuery(q: string): Product["category"] {
  const s = q.toLowerCase();
  if (s.includes("shoe") || s.includes("sneaker") || s.includes("boot") || s.includes("heel"))
    return "Shoes";
  if (s.includes("bag") || s.includes("handbag") || s.includes("tote") || s.includes("clutch"))
    return "Bag";
  if (s.includes("coat") || s.includes("trench") || s.includes("jacket") || s.includes("blazer"))
    return "Outerwear";
  if (s.includes("dress")) return "Dress";
  if (s.includes("trouser") || s.includes("pants") || s.includes("jean") || s.includes("skirt"))
    return "Bottom";
  return "Top";
}

async function tavilyFallback(query: string, limit: number): Promise<Product[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      max_results: Math.min(Math.max(limit, 1), 12),
      include_answer: false,
      include_raw_content: false,
    }),
  }).catch(() => null);

  if (!resp || !resp.ok) return [];

  const data = (await resp.json().catch(() => ({}))) as {
    results?: Array<{ title?: unknown; url?: unknown }>;
  };

  const raw = Array.isArray(data.results) ? data.results : [];
  const category = safeCategoryFromQuery(query);

  return raw
    .map((r) => {
      const title = typeof r?.title === "string" ? r.title : "";
      const url = typeof r?.url === "string" ? r.url : "";
      if (!title || !url) return null;

      // Tavily doesn't provide stable price/image. Keep nulls; UI should handle.
      const notedBrand =
        title.split(" ")[0] && title.split(" ")[0].length <= 18 ? title.split(" ")[0] : null;

      const p: Product = {
        id: crypto.randomUUID(),
        title,
        url,
        brand: notedBrand,
        category,
        price: null,
        currency: "EUR",
        image: null,
      };
      return p;
    })
    .filter((x): x is Product => x !== null)
    .slice(0, limit);
}

async function realProducts(query: string, limit: number): Promise<Product[]> {
  // Preferred path: SerpAPI (Google Shopping) for real product cards (often includes price/image).
  if (process.env.SERPAPI_KEY) {
    const ui = await searchProductsSerpApi(query, { limit });
    const fallbackCategory = safeCategoryFromQuery(query);

    return ui
      .map((x) => {
        const category = x.category ?? fallbackCategory;
        const p: Product = {
          id: x.id || crypto.randomUUID(),
          title: x.title,
          url: x.url,
          brand: x.brand ?? null,
          category,
          price: x.price ?? null,
          currency: x.currency || "EUR",
          image: x.image ?? null,
        };
        return p;
      })
      .filter((p) => Boolean(p.title))
      .slice(0, limit);
  }

  // Fallback: Tavily for real links (may lack image/price).
  return tavilyFallback(query, limit);
}

export const webProvider: Provider = {
  key: "web",
  async search(query: string, opts: SearchOpts): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts.limit, 1), 24);
    const items = await realProducts(query, limit);
    return { provider: "web", items };
  },
};
