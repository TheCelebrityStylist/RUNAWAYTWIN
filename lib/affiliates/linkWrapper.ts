// FILE: lib/affiliates/linkWrapper.ts
/**
 * linkWrapper: central place to attach affiliate parameters without exposing secrets.
 * In mock mode it simply returns the original URL.
 */
import type { Product } from "./types";

const MOCK = (process.env.MOCK_AFFILIATES || "true").toLowerCase() !== "false";

type WrapOptions = {
  provider: "amazon" | "rakuten" | "awin";
  country?: string;
};

export function linkWrapper(url: string, { provider, country }: WrapOptions): string {
  if (MOCK) return url;

  try {
    const u = new URL(url);

    if (provider === "amazon") {
      const tag = process.env.AMAZON_PA_PARTNER_TAG || "";
      if (tag) u.searchParams.set("tag", tag);
      return u.toString();
    }

    if (provider === "rakuten") {
      const key = process.env.RAKUTEN_API_KEY || "";
      if (key) u.searchParams.set("aff", "rakuten");
      return u.toString();
    }

    if (provider === "awin") {
      const ids = process.env.AWIN_ADVERTISER_IDS || "";
      if (ids) u.searchParams.set("awc", "awin");
      return u.toString();
    }

    return url;
  } catch {
    // if url is malformed, return original to avoid breaking UI
    return url;
  }
}

export function wrapProducts(
  provider: "amazon" | "rakuten" | "awin",
  products: Product[],
  country?: string
): Product[] {
  return products.map((p) => ({
    ...p,
    url: linkWrapper(p.url, { provider, country }),
  }));
}
