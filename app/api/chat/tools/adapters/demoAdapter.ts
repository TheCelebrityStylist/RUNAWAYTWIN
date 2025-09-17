// FILE: app/api/chat/tools/demoAdapter.ts
import type { ProductAdapter, SearchProductsArgs, Product } from "./types";

/**
 * A curated, deterministic catalog that guarantees instant results
 * so the optimistic draft feels real even if web scraping is blocked.
 */
const DEMO: Product[] = [
  {
    id: "the-row-tee",
    brand: "The Row",
    title: "Wesler Merino T-Shirt",
    price: 590,
    currency: "EUR",
    retailer: "Matches",
    url: "https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt",
    imageUrl: "https://assets.runwaytwin-demo.com/the-row-wesler.jpg",
    availability: "InStock",
  },
  {
    id: "levi-501",
    brand: "Levi's",
    title: "501 Original Straight Jeans (Indigo)",
    price: 110,
    currency: "EUR",
    retailer: "Levi.com EU",
    url: "https://www.levi.com/NL/en_NL/search?q=501",
    imageUrl: "https://assets.runwaytwin-demo.com/levis-501.jpg",
    availability: "InStock",
  },
  {
    id: "mango-trench",
    brand: "Mango",
    title: "Classic Cotton Trench Coat",
    price: 119.99,
    currency: "EUR",
    retailer: "Mango",
    url: "https://shop.mango.com/nl/dames/jassen/trench-classic",
    imageUrl: "https://assets.runwaytwin-demo.com/mango-trench.jpg",
    availability: "InStock",
  },
];

export const demoAdapter: ProductAdapter = {
  name: "demoAdapter",
  async searchProducts(params: SearchProductsArgs): Promise<Product[]> {
    const q = (params.query || "").toLowerCase();
    const limit = Math.max(1, Math.min(params.limit ?? 6, 12));
    if (!q) return DEMO.slice(0, limit);

    const hits = DEMO.filter((p) => {
      const hay = `${p.brand} ${p.title} ${p.retailer}`.toLowerCase();
      const tokens = q.split(/\s+/).filter(Boolean);
      return tokens.every((t) => hay.includes(t));
    });

    return (hits.length ? hits : DEMO).slice(0, limit);
  },

  async checkStock(productIdOrUrl: string) {
    const hit = DEMO.find((p) => p.id === productIdOrUrl || p.url === productIdOrUrl);
    return { availability: hit?.availability ?? null };
  },

  async affiliateLink(url: string) {
    // No affiliate rewrite in demo; return canonical.
    return url;
  },
};
