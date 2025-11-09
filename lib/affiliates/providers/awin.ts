// FILE: lib/affiliates/providers/awin.ts
import type { Provider, ProviderResult, Product, Currency } from "@/lib/affiliates/types";

/**
 * AWIN Product Search provider
 *
 * Requirements (all set in Vercel env):
 * - AWIN_ACCESS_TOKEN: Personal access token for the Product API
 * - AWIN_ADVERTISER_IDS: Comma-separated advertiser IDs you are APPROVED for and that have feeds
 *
 * Behavior:
 * - If AWIN_ACCESS_TOKEN is missing → returns zero items.
 * - If AWIN_ADVERTISER_IDS is missing/empty → returns zero items.
 * - Only queries advertisers you actually configured.
 * - Normalizes into internal Product shape.
 *
 * IMPORTANT:
 * - Do NOT put COS/ZARA/ARKET/etc here unless:
 *   1) You see them in AWIN “Joined programmes”
 *   2) They show “Product feed: Yes”
 *   3) You add their numeric IDs to AWIN_ADVERTISER_IDS
 * - Until then, this provider will simply return [] and your app
 *   will fall back to the mock catalog in /api/chat.
 */

const AWIN_TOKEN = (process.env.AWIN_ACCESS_TOKEN || "").trim();
const API_BASE =
  process.env.AWIN_PRODUCT_API_BASE?.trim() || "https://product-api.awin.com/v2/products";

function advertiserIdsFromEnv(): number[] {
  const env = (process.env.AWIN_ADVERTISER_IDS || "").trim();
  if (!env) return [];
  return env
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
  return typeof x === "string" && x.trim().length ? x : undefined;
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
  const productIdStr = str(raw.productId) ?? (raw.productId != null ? String(raw.productId) : "");
  const id = productIdStr || (title && url ? `${title}::${url}` : "");
  if (!title || !id) return null;

  const brand = str(raw.brandName);
  const image = pickImage(raw);
  const price = num(raw.displayPrice) ?? num(raw.price) ?? num(raw.rrpPrice);
  const currency = (str(raw.currency) as Currency | undefined) ?? undefined;

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
    id,
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
    },
  };
}

async function callAwin(
  query: string,
  opts: { limit: number; advertiserIds: number[] }
): Promise<{ ok: boolean; data: AwinApiProduct[] }> {
  if (!AWIN_TOKEN) {
    return { ok: false, data: [] };
  }
  if (!opts.advertiserIds.length) {
    return { ok: false, data: [] };
  }

  const pageSize = Math.min(Math.max(opts.limit, 1), 50);
  const ids = opts.advertiserIds.join(",");

  const url = new URL(API_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", String(pageSize));
  url.searchParams.set("advertiserIds", ids);

  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${AWIN_TOKEN}`,
      Accept: "application/json",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!resp || !resp.ok) {
    return { ok: false, data: [] };
  }

  const data = (await resp.json().catch(() => [])) as unknown;
  const array = Array.isArray(data) ? (data as AwinApiProduct[]) : [];
  return { ok: true, data: array };
}

export const awinProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: Currency }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 6, 1), 50);
    const advertiserIds = advertiserIdsFromEnv();

    // Hard fail-safe: if not configured, return empty so callers can fall back.
    if (!AWIN_TOKEN || advertiserIds.length === 0 || !q.trim()) {
      return { provider: "awin", items: [] };
    }

    const { ok, data } = await callAwin(q, { limit, advertiserIds });

    const items: Product[] = ok
      ? data
          .map(mapOne)
          .filter((p): p is Product => !!p)
          .slice(0, limit)
      : [];

    return { provider: "awin", items };
  },
};

