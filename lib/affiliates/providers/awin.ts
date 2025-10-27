// FILE: lib/affiliates/providers/awin.ts
import type { Provider, ProviderResult, Product } from "../types";

const MOCK = (process.env.MOCK_AFFILIATES || "true").toLowerCase() !== "false";

function mock(q: string, limit = 6): ProviderResult {
  const base: Product[] = Array.from({ length: limit }).map((_, i) => ({
    id: `awn-${i}`,
    title: `${q} — AWIN pick #${i + 1}`,
    brand: ["& Other Stories", "NA-KD", "Bershka", "Pull&Bear", "Zalando"][i % 5],
    retailer: "awin",
    url: `https://www.awin1.com/pclick?pid=0000&q=${encodeURIComponent(q)}&idx=${i}`,
    image: `https://images.unsplash.com/photo-1490111718993-d98654ce6cf7?ixid=${i}`,
    price: 59 + i * 9,
    currency: "EUR",
    availability: "in_stock",
    fit: {
      category: ["top", "bottom", "dress", "outerwear", "shoes"][i % 5],
      gender: "female",
    },
  }));
  return { provider: "awin", items: base };
}

export const awinProvider: Provider = {
  async search(q: string, opts?: { limit?: number }) {
    const limit = opts?.limit ?? 6;
    if (MOCK) return mock(q, limit);
    return mock(q, limit); // real integration pending
  },
};
