// FILE: lib/affiliates/search.ts
// Unified product search across providers (currently AWIN).
import { ProviderResult, Currency, Product } from "@/lib/affiliates/types";
import { awinProvider } from "@/lib/affiliates/providers/awin";

export type UnifiedSearchOptions = {
  limit?: number;
  currency?: Currency;
  providers?: Array<"awin">; // extend with "amazon" | "rakuten" later
};

export async function unifiedSearch(
  q: string,
  opts?: UnifiedSearchOptions
): Promise<ProviderResult[]> {
  const limit = opts?.limit ?? 12;
  const currency = (opts?.currency || "EUR") as Currency;

  const want = opts?.providers ?? ["awin"];
  const tasks: Promise<ProviderResult>[] = [];

  if (want.includes("awin")) tasks.push(awinProvider.search(q, { limit, currency }));

  const results = await Promise.all(tasks);
  return results;
}

/** Convenience: flatten all providers into a single array. */
export async function searchAllFlattened(
  q: string,
  opts?: UnifiedSearchOptions
): Promise<Product[]> {
  const results = await unifiedSearch(q, opts);
  return results.flatMap((r) => r.items);
}
