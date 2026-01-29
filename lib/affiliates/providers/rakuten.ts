// FILE: lib/affiliates/providers/rakuten.ts
// Mock-safe Rakuten provider (plug real API later).

import type { Provider, ProviderResult, Currency } from "@/lib/affiliates/types";

export const rakutenProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: Currency }): Promise<ProviderResult> {
    void q;
    void opts;
    return { provider: "rakuten", items: [] };
  },
};
