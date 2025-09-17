// FILE: app/api/chat/tools/index.ts
import type { Product, ProductAdapter, SearchProductsArgs } from "./types";
import { demoAdapter } from "./demoAdapter";

// Add more adapters later: webAdapter, awinAdapter, etc.
const ADAPTERS: ProductAdapter[] = [demoAdapter];

/** Search across adapters; return the first non-empty result set. */
export async function searchProducts(params: SearchProductsArgs): Promise<Product[]> {
  for (const adapter of ADAPTERS) {
    try {
      const res = await adapter.searchProducts(params);
      if (Array.isArray(res) && res.length) return res;
    } catch (e: any) {
      console.warn(`[tools] ${adapter.name}.searchProducts failed:`, e?.message);
    }
  }
  return [];
}

/** Check stock if supported by an adapter. */
export async function checkStock(productIdOrUrl: string, country?: string) {
  for (const adapter of ADAPTERS) {
    if (!adapter.checkStock) continue;
    try {
      const res = await adapter.checkStock(productIdOrUrl, country);
      if (res && typeof res.availability === "string") return res;
    } catch (e: any) {
      console.warn(`[tools] ${adapter.name}.checkStock failed:`, e?.message);
    }
  }
  return { availability: null };
}

/** Produce an affiliate link if supported; otherwise return the canonical URL. */
export async function affiliateLink(url: string, retailer?: string | null) {
  for (const adapter of ADAPTERS) {
    if (!adapter.affiliateLink) continue;
    try {
      const res = await adapter.affiliateLink(url, retailer ?? null);
      if (res) return res;
    } catch (e: any) {
      console.warn(`[tools] ${adapter.name}.affiliateLink failed:`, e?.message);
    }
  }
  return url;
}

/** Simple static FX conversion (Edge-safe). */
const FX: Record<string, number> = { EUR: 1, USD: 1.07, GBP: 0.84 };
export function fxConvert(amount: number, from: string, to: string): number {
  const f = FX[from?.toUpperCase()] ?? 1;
  const t = FX[to?.toUpperCase()] ?? 1;
  return Math.round((amount / f) * t * 100) / 100;
}

// Re-export types
export type { Product, ProductAdapter, SearchProductsArgs };
