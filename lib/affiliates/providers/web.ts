// FILE: lib/affiliates/providers/web.ts
export const runtime = "edge";

import type { Provider, ProviderResult, Product } from "../types";
import { webProductSearch } from "@/lib/scrape/webProductSearch";

export const webProvider: Provider = {
  async search(q: string, opts?: { limit?: number }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 6, 1), 24);

    const items: Product[] = await webProductSearch({
      query: q,
      limit,
      preferEU: true,
    });

    return { provider: "web", items };
  },
};
