// FILE: lib/affiliates/providers/web.ts
import type { Provider, ProviderResult } from "@/lib/affiliates/types";
import { searchWebProducts } from "@/lib/scrape";

export const webProvider: Provider = {
  async search(q, opts) {
    const limit = Math.min(Math.max(opts?.limit ?? 8, 1), 24);
    const scraped = await searchWebProducts(q, { limit });

    return {
      provider: "web",
      items: scraped.map((s) => ({
        id: s.id,
        title: s.title,
        brand: s.brand,
        retailer: s.retailer,
        url: s.url,
        image: s.image,
        price: typeof s.price === "number" ? s.price : undefined,
        currency: s.currency,
        // keep any extra fields your Product type supports
      })),
    } satisfies ProviderResult;
  },
};
