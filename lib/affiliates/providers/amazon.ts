// FILE: lib/affiliates/providers/amazon.ts
import type { Provider, ProviderResult, Product } from "../types";

const MOCK = (process.env.MOCK_AFFILIATES || "true").toLowerCase() !== "false";

function mock(q: string, limit = 6): ProviderResult {
  const base: Product[] = Array.from({ length: limit }).map((_, i) => ({
    id: `amz-${i}`,
    title: `${q} — Amazon pick #${i + 1}`,
    brand: ["Levi's", "Mango", "Nike", "COS", "Arket"][i % 5],
    retailer: "amazon",
    url: `https://www.amazon.nl/s?k=${encodeURIComponent(q)}&i=fashion&idx=${i}`,
    image: `https://images.unsplash.com/photo-1520975657287-04f0b1436f4b?ixid=${i}`,
    price: 49 + i * 5,
    currency: "EUR",
    availability: "in_stock",
    fit: {
      category: ["top", "bottom", "dress", "outerwear", "shoes"][i % 5],
      gender: "female",
    },
  }));
  return { provider: "amazon", items: base };
}

export const amazonProvider: Provider = {
  async search(q: string, opts?: { limit?: number }) {
    // TODO: real PA-API integration (Node runtime required). For now, mock.
    const limit = opts?.limit ?? 6;
    if (MOCK) return mock(q, limit);
    return mock(q, limit); // fallback until real integration
  },
};
