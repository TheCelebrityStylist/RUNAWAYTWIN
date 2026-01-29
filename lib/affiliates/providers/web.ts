// FILE: lib/affiliates/providers/web.ts

import type { Provider, ProviderResult, Product } from "../types";
import { searchWebProducts } from "@/lib/scrape";

const MOCK = (process.env.MOCK_AFFILIATES || "true").toLowerCase() !== "false";

function inferCategory(title: string): Product["fit"]["category"] {
  const t = title.toLowerCase();
  if (/(boot|sneaker|loafer|heel|shoe|sandal)/.test(t)) return "shoes";
  if (/(coat|trench|jacket|blazer|parka|outerwear)/.test(t)) return "outerwear";
  if (/(dress|gown)/.test(t)) return "dress";
  if (/(trouser|pant|jean|denim|skirt|short)/.test(t)) return "bottom";
  if (/(shirt|tee|t-shirt|top|blouse|knit|sweater|hoodie)/.test(t)) return "top";
  if (/(bag|handbag|tote|crossbody|shoulder)/.test(t)) return "bag";
  return "accessory";
}

function stableId(provider: string, url: string, title: string): string {
  // Stable enough across builds; avoid crypto dependency in provider.
  const base = `${provider}|${url}|${title}`.slice(0, 500);
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `${provider}-${hash.toString(16)}`;
}

export const webProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: string }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 6, 1), 12);
    const query = q.trim();
    if (!query) return { provider: "web", items: [] };

    // If MOCK_AFFILIATES=true, we still want real products for "web".
    // We keep this flag for other providers; web always attempts live scraping.
    void MOCK;

    const scraped = await searchWebProducts(query, { limit });

    const items: Product[] = scraped.map((p) => {
      const cat = inferCategory(p.title);
      const currency = p.currency ?? opts?.currency ?? (p.price ? "EUR" : undefined);

      return {
        id: stableId("web", p.url, p.title),
        title: p.title,
        brand: undefined,
        retailer: `web:${p.source}`,
        url: p.url,
        image: p.image,
        price: typeof p.price === "number" && Number.isFinite(p.price) ? p.price : undefined,
        currency,
        availability: "unknown",
        fit: { category: cat, gender: "unisex" },
        attrs: { source: p.source },
      };
    });

    return { provider: "web", items };
  },
};
