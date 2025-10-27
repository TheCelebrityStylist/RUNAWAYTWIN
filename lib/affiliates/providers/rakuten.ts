// FILE: lib/affiliates/providers/rakuten.ts
import type { Provider, ProviderResult, Product } from "../types";

const MOCK = (process.env.MOCK_AFFILIATES || "true").toLowerCase() !== "false";

function mock(q: string, limit = 6): ProviderResult {
  const base: Product[] = Array.from({ length: limit }).map((_, i) => ({
    id: `rak-${i}`,
    title: `${q} — Rakuten pick #${i + 1}`,
    brand: ["Zara", "H&M", "Massimo Dutti", "Uniqlo", "Weekday"][i % 5],
    retailer: "rakuten",
    url: `https://www.google.com/search?q=${encodeURIComponent(q)}&rakuten=${i}`,
    image: `https://images.unsplash.com/photo-1512436991641-6745cdb1723f?ixid=${i}`,
    price: 39 + i * 7,
    currency: "EUR",
    availability: "in_stock",
    fit: {
      category: ["top", "bottom", "dress", "outerwear", "shoes"][i % 5],
      gender: "female",
    },
  }));
  return { provider: "rakuten", items: base };
}

export const rakutenProvider: Provider = {
  async search(q: string, opts?: { limit?: number }) {
    const limit = opts?.limit ?? 6;
    if (MOCK) return mock(q, limit);
    return mock(q, limit); // real integration pending
  },
};
