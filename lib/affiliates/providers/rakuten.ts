// FILE: lib/affiliates/providers/rakuten.ts
// Mock-safe Rakuten provider (plug real API later).

import type { Provider, ProviderResult, Product, Currency } from "@/lib/affiliates/types";

const MOCK: Product[] = [
  {
    id: "rkt-knit",
    title: "Merino Crew Knit",
    brand: "UNIQLO",
    retailer: "rakuten",
    url: "https://www.uniqlo.com/",
    image: "",
    price: 39,
    currency: "EUR",
    fit: { category: "Top", gender: "unisex" },
  },
  {
    id: "rkt-trouser",
    title: "Wide Wool Trousers",
    brand: "ARKET",
    retailer: "rakuten",
    url: "https://www.arket.com/",
    image: "",
    price: 129,
    currency: "EUR",
    fit: { category: "Bottom", gender: "unisex" },
  },
];

export const rakutenProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: Currency }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 6, 1), 20);
    const currency = (opts?.currency || "EUR") as Currency;
    const out = MOCK.slice(0, limit).map((p, idx) => ({ ...p, id: `${p.id}-${idx}`, currency }));
    return { provider: "rakuten", items: out };
  },
};

