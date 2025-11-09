// FILE: lib/affiliates/providers/awin.ts
import type { Provider, ProviderResult, Product, Currency } from "@/lib/affiliates/types";

/**
 * AWIN Product Search provider
 *
 * - Uses AWIN Product API.
 * - Requires ONE of:
 *     AWIN_ACCESS_TOKEN  (preferred)
 *     AWIN_API_TOKEN     (fallback name some accounts use)
 * - Optional:
 *     AWIN_ADVERTISER_IDS      comma-separated advertiserIds you joined
 *     AWIN_PRODUCT_API_BASE    override base URL if needed
 *
 * This module:
 * - Normalizes AWIN products to our internal Product shape.
 * - Leaves `url` as the merchant / AWIN deeplink; affiliate wrapping is done
 *   later by wrapProducts using AWIN_ADVERTISER_MAP_JSON + AWIN_PUBLISHER_ID.
 */

const AWIN_TOKEN =
  (process.env.AWIN_ACCESS_TOKEN || process.env.AWIN_API_TOKEN || "").trim();

const API_BASE =
  process.env.AWIN_PRODUCT_API_BASE?.trim() ||
  // Default documented endpoint; update here if your account uses a variant.
  "https://product-api.awin.com/v2/products";

/**
 * AWIN_ADVERTISER_IDS:
 * Comma-separated advertiserIds from your AWIN "Joined" list.
 * Example:
 *  45949,95435,114734,...
 */
function advertiserIds(): number[] {
  const raw = (process.env.AWIN_ADVERTISER_IDS || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

type AwinApiProduct = {
  productId?: string | number;
  advertiser?: { id?: number; name?: string };
  merchantId?: number;
  merchantName?: string;
  name?: string;
  brandName?: string;
  currency?: string;
  displayPrice?: number | string;
  price?: number | string;
  rrpPrice?: number | string;
  deepLink?: string;
  awinUrl?: string;
  productUrl?: string;
  largeImage?: string;
  imageUrl?: string;
  categoryName?: string;
  primaryCategory?: string;
  gender?: string;
  sizes?: Array<string | number>;
  stockStatus?: string;
};

function num(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(x: unknown): string | undefined {
  return typeof x === "string" && x.trim().length ? x.trim() : undefined;
}

function pickUrl(p: AwinApiProduct): string | undefined {
  return str(p.productUrl) || str(p.deepLink) || str(p.awinUrl);
}

function pickImage(p: AwinApiProduct): string | undefined {
  return str(p.largeImage) || str(p.imageUrl);
}

function pickCategory(p: AwinApiProduct): string | undefined {
  return str(p.categoryName) || str(p.primaryCategory);
}

function mapOne(raw: AwinApiProduct): Product | null {
  const title = str(raw.name);
  const url = pickUrl(raw);
  const idSource = str(raw.productId) || (title && url ? `${title}::${url}` : undefined);
  if (!title || !idSource) return null;

  const brand = str(raw.brandName);
  const image = pickImage(raw);
  const price = num(raw.displayPrice) ?? num(raw.price) ?? num(raw.rrpPrice);
  const currency = (str(raw.currency) as Currency | undefined) || undefined;

  const advId = raw.advertiser?.id ?? raw.merchantId ?? undefined;
  const retailerName = str(raw.advertiser?.name) || str(raw.merchantName) || undefined;

  const genderStr = (str(raw.gender) || "").toLowerCase();
  let fitGender: "female" | "male" | "unisex" | undefined;
  if (genderStr.includes("female") || genderStr === "f") fitGender = "female";
  else if (genderStr.includes("male") || genderStr === "m") fitGender = "male";
  else if (genderStr) fitGender = "unisex";

  const sizes =
    Array.isArray(raw.sizes) && raw.sizes.length
      ? raw.sizes.map((s) => String(s))
      : undefined;

  let availability: Product["availability"];
  const stock = (str(raw.stockStatus) || "").toLowerCase();
  if (stock.includes("in")) availability = "in_stock";
  else if (stock.includes("out")) availability = "out_of_stock";
  else if (stock.includes("pre")) availability = "preorder";
  else availability = "unknown";

  return {
    id: idSource,
    title,
    brand,
    retailer: advId ? `awin:${advId}` : "awin",
    url: url || "",
    image,
    price,
    currency,
    availability,
    fit: {
      gender: fitGender,
      category: pickCategory(raw),
      sizes,
    },
    attrs: {
      advertiserId: advId ?? null,
      advertiserName: retailerName ?? null,
      source: "awin",
    },
  };
}

/**
 * Low-level AWIN call with defensive parsing and minimal logging.
 */
async function callAwin(
  query: string,
  opts?: { limit?: number; ids?: number[] }
): Promise<{ ok: boolean; data: AwinApiProduct[] }> {
  if (!AWIN_TOKEN) {
    console.error("[awinProvider] Missing AWIN_ACCESS_TOKEN / AWIN_API_TOKEN");
    return { ok: false, data: [] };
  }

  const pageSize = Math.min(Math.max(opts?.limit ?? 6, 1), 50);
  const ids = (opts?.ids ?? advertiserIds()).join(",");

  const url = new URL(API_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", String(pageSize));
  if (ids) url.searchParams.set("advertiserIds", ids);

  let resp: Response | null = null;
  try {
    resp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AWIN_TOKEN}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (e) {
    console.error("[awinProvider] Network error", e);
    return { ok: false, data: [] };
  }

  if (!resp || !resp.ok) {
    console.error("[awinProvider] HTTP error", resp?.status, resp?.statusText);
    return { ok: false, data: [] };
  }

  const json = (await resp.json().catch(() => null)) as unknown;

  // AWIN may return either:
  //  - an array of products
  //  - an object with `data` or `products` array
  let arr: unknown = json;
  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.data)) arr = obj.data;
    else if (Array.isArray(obj.products)) arr = obj.products;
  }

  if (!Array.isArray(arr)) {
    console.error("[awinProvider] Unexpected response shape");
    return { ok: false, data: [] };
  }

  return { ok: true, data: arr as AwinApiProduct[] };
}

/**
 * Provider implementation consumed by /api/products/search.
 */
export const awinProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: Currency }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 6, 1), 50);
    const ids = advertiserIds();

    const { ok, data } = await callAwin(q, { limit, ids });

    const items: Product[] = (ok ? data : [])
      .map(mapOne)
      .filter((p): p is Product => !!p && !!p.url)
      .slice(0, limit);

    if (!items.length) {
      console.warn("[awinProvider] No products mapped for query:", q);
    }

    return { provider: "awin", items };
  },
};
