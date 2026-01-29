// FILE: lib/affiliates/linkWrapper.ts
// Affiliate URL wrapper + helper to wrap whole provider result lists.
// Works even without keys (returns original URLs).

import type { Product, ProviderKey } from "@/lib/affiliates/types";

/**
 * ENV used (safe on server):
 *  - AWIN_PUBLISHER_ID
 *  - AWIN_ADVERTISER_MAP_JSON  // {"www.cos.com":"18719","www.arket.com":"17114",...}
 *  - AFFILIATE_CLICKREF_SOURCE // optional, short tag e.g. "rwt"
 */
const AWIN_PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || "";
const CLICKREF_SOURCE = process.env.AFFILIATE_CLICKREF_SOURCE || "rwt";

function hostname(u: string | undefined | null): string | null {
  if (!u) return null;
  try {
    return new URL(u).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function awinMidFor(host: string | null): string | null {
  if (!host) return null;
  try {
    const raw = process.env.AWIN_ADVERTISER_MAP_JSON || "{}";
    const map = JSON.parse(raw) as Record<string, unknown>;
    const mid = map[host];
    return typeof mid === "string" && mid.trim() ? mid : null;
  } catch {
    return null;
  }
}

function wrapAwin(url: string, product?: Product, clickrefExtra?: string) {
  const h = hostname(url);
  const mid = awinMidFor(h);
  if (!AWIN_PUBLISHER_ID || !mid) return url;

  const clickrefParts = [CLICKREF_SOURCE];
  if (clickrefExtra) clickrefParts.push(clickrefExtra);
  if (product?.id) clickrefParts.push(`id:${product.id}`);
  if (product?.brand) clickrefParts.push(`b:${product.brand}`);
  const clickref = encodeURIComponent(clickrefParts.join("|"));

  return `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(
    mid
  )}&awinaffid=${encodeURIComponent(AWIN_PUBLISHER_ID)}&clickref=${clickref}&ued=${encodeURIComponent(
    url
  )}`;
}

/**
 * Wrap products for a given provider.
 * For now, only AWIN wrapping is implemented (provider === "awin").
 * All other providers (including "web") return as-is.
 */
export function wrapProducts(provider: ProviderKey, items: Product[], clickrefExtra?: string): Product[] {
  if (provider !== "awin") return items;
  return items.map((p) => ({
    ...p,
    url: p.url ? wrapAwin(p.url, p, clickrefExtra) : p.url,
  }));
}
