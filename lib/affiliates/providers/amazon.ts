// FILE: lib/affiliates/providers/amazon.ts
import type { Provider, ProviderResult } from "../types";

const MOCK = (process.env.MOCK_AFFILIATES || "true").toLowerCase() !== "false";

function mock(): ProviderResult {
  return { provider: "amazon", items: [] };
}

export const amazonProvider: Provider = {
  async search(q: string, opts?: { limit?: number }) {
    // TODO: real PA-API integration (Node runtime required). For now, mock.
    if (MOCK) return mock();
    return mock(); // fallback until real integration
  },
};
