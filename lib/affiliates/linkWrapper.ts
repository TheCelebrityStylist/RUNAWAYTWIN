// FILE: lib/affiliates/linkWrapper.ts
import type { Product, ProviderKey } from "@/lib/affiliates/types";

function withClickref(url: string, clickrefExtra?: string): string {
  if (!clickrefExtra) return url;
  try {
    const u = new URL(url);
    // Awin commonly supports clickref or clickref2; keep it generic and non-breaking.
    if (!u.searchParams.get("clickref")) u.searchParams.set("clickref", clickrefExtra);
    return u.toString();
  } catch {
    return url;
  }
}

export function wrapProducts(
  provider: ProviderKey,
  items: Product[],
  clickrefExtra?: string
): Product[] {
  // Only Awin-style links typically need wrapping. Others pass through unchanged.
  if (provider !== "awin") return items;

  return items.map((p) => {
    if (!p.url) return p;
    return { ...p, url: withClickref(p.url, clickrefExtra) };
  });
}

