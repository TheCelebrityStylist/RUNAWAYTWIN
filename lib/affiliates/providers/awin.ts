// FILE: lib/affiliates/providers/awin.ts
import type { Provider, ProviderResult, Product, Currency } from "@/lib/affiliates/types";

/**
 * AWIN Product Search provider
 * - Uses AWIN Product API (v2)
 * - Requires: AWIN_ACCESS_TOKEN
 * - Optional: AWIN_ADVERTISER_IDS (comma-separated), AWIN_PRODUCT_API_BASE
 *
 * Notes:
 * - We pass a conservative set of fields and normalize to our Product shape.
 * - We keep merchant URL as `url`; link wrapping to affiliate happens in linkWrapper.
 * - We tag retailer as `awin:<advertiserId>` so wrapProducts can build the deeplink.
 */

const AWIN_TOKEN = process.env.AWIN_ACCESS_TOKEN || "";
const API_BASE =
  process.env.AWIN_PRODUCT_API_BASE?.trim() || "https://product-api.awin.com/v2/products";

// If you didn’t set AWIN_ADVERTISER_IDS in Vercel, this fallback keeps you unblocked.
// Replace / augment with your own joined advertisers at any time.
const FALLBACK_ADVERTISERS: number[] = [
  112428, 111224, 93261, 50879, 96701, 95435, 54839, 114734, 90759, 114046,
];

function advertiserIds(): number[] {
  const env = (process.env.AWIN_ADVERTISER_IDS || "").trim();
  if (!env) return FALLBACK_ADVERTISERS;
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
  deepLink?: string; // some responses include this
  awinUrl?: string; // sometimes returned
  productUrl?: string; // raw merchant URL
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
  const idRaw = str(raw.productId) ?? String(raw.productId ?? "");
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

async function callAwin(query: string, opts?: { limit?: number; ids?: number[] }) {
  if (!AWIN_TOKEN) {
    return { ok: false as const, data: [] as AwinApiProduct[], error: "Missing AWIN_ACCESS_TOKEN" };
  }

  const pageSize = Math.min(Math.max(opts?.limit ?? 6, 1), 50);
  const ids = (opts?.ids ?? advertiserIds()).join(",");

  const url = new URL(API_BASE);
  // AWIN v2 accepts `query`, `page`, `pageSize`, `advertiserIds`
  url.searchParams.set("query", query);
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", String(pageSize));
  if (ids) url.searchParams.set("advertiserIds", ids);

  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${AWIN_TOKEN}`,
      Accept: "application/json",
    },
    // Edge-runtime friendly
    cache: "no-store",
  }).catch(() => null);

  if (!resp || !resp.ok) {
    return {
      ok: false as const,
      data: [] as AwinApiProduct[],
      error: `AWIN ${resp ? resp.status : "network"} error`,
    };
  }

  const data = (await resp.json().catch(() => [])) as unknown;
  const array = Array.isArray(data) ? (data as AwinApiProduct[]) : [];
  return { ok: true as const, data: array, error: null as null };
}

export const awinProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: Currency }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 6, 1), 50);
    const ids = advertiserIds();

    const { ok, data } = await callAwin(q, { limit, ids });

    const items: Product[] = (ok ? data : [])
      .map(mapOne)
      .filter((p): p is Product => !!p)
      .slice(0, limit);

    return { provider: "awin", items };
  },
};


