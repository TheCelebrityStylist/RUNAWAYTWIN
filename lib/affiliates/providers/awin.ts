// FILE: lib/affiliates/providers/awin.ts
import type { Provider, ProviderResult, Product, Currency } from "@/lib/affiliates/types";

/**
 * AWIN Product Search provider (STRICT + CORRECT)
 *
 * Required environment (Vercel):
 * - AWIN_ACCESS_TOKEN
 *     Your AWIN ProductServe / Product API access token.
 *
 * - AWIN_ADVERTISER_IDS
 *     Comma-separated numeric advertiser IDs that meet BOTH:
 *       1) You are JOINED/APPROVED for the program.
 *       2) They have an active product feed in AWIN.
 *     Example:
 *       AWIN_ADVERTISER_IDS=12345,67890,13579
 *
 * Notes:
 * - This file does NOT guess COS/Zara/etc.
 * - If a brand is not in your joined-programs CSV with a feed, do NOT include it.
 * - If misconfigured (no token or no IDs), this provider returns [] so callers can fall back.
 */

const AWIN_TOKEN = (process.env.AWIN_ACCESS_TOKEN || "").trim();
const API_BASE =
  process.env.AWIN_PRODUCT_API_BASE?.trim() || "https://product-api.awin.com/v2/products";

function advertiserIdsFromEnv(): number[] {
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

  const idRaw = str(raw.productId) ?? (raw.productId != null ? String(raw.productId) : "");
  const id = idRaw || (title && url ? `${title}::${url}` : "");
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
  if (!AWIN_TOKEN) return { ok: false, data: [] };
  if (!opts.advertiserIds.length) return { ok: false, data: [] };
  if (!query.trim()) return { ok: false, data: [] };

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

  if (!resp || !resp.ok) return { ok: false, data: [] };

  const data = (await resp.json().catch(() => [])) as unknown;
  const array = Array.isArray(data) ? (data as AwinApiProduct[]) : [];
  return { ok: true, data: array };
}

export const awinProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: Currency }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 6, 1), 50);
    const advertiserIds = advertiserIdsFromEnv();

    // If not configured correctly, return empty so upstream can fall back.
    if (!AWIN_TOKEN || advertiserIds.length === 0) {
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
