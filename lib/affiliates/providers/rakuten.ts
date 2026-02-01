// FILE: lib/affiliates/providers/rakuten.ts
// Mock-safe Rakuten provider (plug real API later).

import type { Provider, ProviderResult, Currency, Product, Category } from "@/lib/affiliates/types";
import { searchCatalog } from "@/lib/catalog/mock";

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

export const rakutenProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: Currency }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 6, 1), 20);
    const items = searchCatalog({
      q,
      gender: "unisex",
      budgetMax: 500,
      keywords: q.split(/\s+/).filter(Boolean).slice(0, 6),
    }).slice(0, limit);

    const mapped: Product[] = items.map((item) => ({
      id: `${item.id}-rkt`,
      title: item.title,
      brand: item.brand,
      retailer: item.retailer,
      url: item.url,
      affiliate_url: item.url,
      image: item.image,
      price: item.price,
      currency: item.currency,
      availability: item.availability,
      category: mapCategory(item.categories[0] || "accessory"),
      source: "rakuten",
    }));
    return { provider: "rakuten", items: mapped };
  },
};
