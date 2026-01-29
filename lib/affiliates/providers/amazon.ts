// FILE: lib/affiliates/providers/amazon.ts
import type { Provider, ProviderResult, Product, Category } from "../types";
import { searchCatalog } from "@/lib/catalog/mock";

const MOCK = (process.env.MOCK_AFFILIATES || "true").toLowerCase() !== "false";

function mapCategory(cat: string): Category {
  switch (cat) {
    case "top":
      return "Top";
    case "bottom":
      return "Bottom";
    case "outerwear":
      return "Outerwear";
    case "dress":
      return "Dress";
    case "shoes":
      return "Shoes";
    case "bag":
      return "Bag";
    default:
      return "Accessory";
  }
}

function mock(q: string, limit = 6): ProviderResult {
  const items = searchCatalog({
    q,
    gender: "unisex",
    budgetMax: 500,
    keywords: q.split(/\s+/).filter(Boolean).slice(0, 6),
  }).slice(0, limit);

  const base: Product[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    brand: item.brand,
    retailer: item.retailer,
    url: item.url,
    image: item.image,
    price: item.price,
    currency: item.currency,
    availability: "in_stock",
    fit: {
      category: mapCategory(item.categories[0] || "accessory"),
      gender: item.gender,
    },
    source: "amazon",
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
