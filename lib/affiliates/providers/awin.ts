// FILE: lib/affiliates/providers/awin.ts
// AWIN provider with mock-safe fallback. If AWIN_API_TOKEN not set, returns curated mocks.

import type { Provider, ProviderResult, Product, Currency } from "@/lib/affiliates/types";

const AWIN_API_TOKEN = process.env.AWIN_API_TOKEN || "";

/** Try to infer brand from URL host if API doesn't provide it. */
function inferBrand(u?: string | null): string | undefined {
  if (!u) return undefined;
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    if (h.includes("cos.com")) return "COS";
    if (h.includes("arket.com")) return "ARKET";
    if (h.includes("zara.com")) return "Zara";
    if (h.includes("hm.com")) return "H&M";
    if (h.includes("massimodutti.com")) return "Massimo Dutti";
    if (h.includes("levi.com")) return "Levi's";
    return undefined;
  } catch {
    return undefined;
  }
}

const MOCK: Product[] = [
  {
    id: "cos-knit",
    title: "Lightweight Knit Sweater",
    brand: "COS",
    retailer: "awin:cos",
    url: "https://www.cos.com/",
    image: "",
    price: 59,
    currency: "EUR",
    fit: { category: "Top", gender: "female", color: "black" },
  },
  {
    id: "arket-bag",
    title: "Structured Crossbody Bag",
    brand: "ARKET",
    retailer: "awin:arket",
    url: "https://www.arket.com/",
    image: "",
    price: 70,
    currency: "EUR",
    fit: { category: "Bag", gender: "female", color: "tan" },
  },
  {
    id: "zara-boots",
    title: "Leather Chelsea Boots",
    brand: "Zara",
    retailer: "awin:zara",
    url: "https://www.zara.com/",
    image: "",
    price: 99,
    currency: "EUR",
    fit: { category: "Shoes", gender: "female", color: "black" },
  },
  {
    id: "md-trench",
    title: "Tailored Trench Coat",
    brand: "Massimo Dutti",
    retailer: "awin:md",
    url: "https://www.massimodutti.com/",
    image: "",
    price: 189,
    currency: "EUR",
    fit: { category: "Outerwear", gender: "female", color: "beige" },
  },
];

async function awinApiSearch(q: string, limit: number): Promise<Product[]> {
  if (!AWIN_API_TOKEN) return [];

  // Adjust endpoint/params according to your AWIN Product API contract.
  const url = new URL("https://api.awin.com/products");
  url.searchParams.set("q", q);
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", String(Math.min(Math.max(limit, 1), 50)));

  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${AWIN_API_TOKEN}`,
      Accept: "application/json",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!resp || !resp.ok) return [];

  type AwinRow = {
    productId?: string;
    productName?: string;
    awDeepLink?: string;
    merchantUrl?: string;
    merchantName?: string;
    imageUrl?: string;
    price?: number | string;
    currency?: string;
    category?: string;
    gender?: string;
  };

  const data = (await resp.json().catch(() => ({}))) as { products?: AwinRow[] };
  const rows: AwinRow[] = Array.isArray(data.products) ? data.products : [];

  return rows.map((r, i) => {
    const rawUrl = (r.awDeepLink || r.merchantUrl || "").trim();
    const priceNum =
      typeof r.price === "number"
        ? r.price
        : typeof r.price === "string"
        ? Number(r.price.replace(/[^\d.]/g, ""))
        : undefined;

    const brand =
      (r.merchantName && r.merchantName.trim()) ||
      inferBrand(rawUrl) ||
      undefined;

    return {
      id: (r.productId || `awin-${i}`) as string,
      title: (r.productName || "Product").trim(),
      brand,
      retailer: "awin",
      url: rawUrl,
      image: (r.imageUrl || "").trim() || undefined,
      price: Number.isFinite(priceNum!) ? (priceNum as number) : undefined,
      currency: ((r.currency as Currency) || "EUR") as Currency,
      fit: {
        gender:
          r.gender === "female" || r.gender === "male"
            ? (r.gender as "female" | "male")
            : "unisex",
        category: r.category || undefined,
      },
      attrs: {},
    } as Product;
  });
}

export const awinProvider: Provider = {
  async search(q: string, opts?: { limit?: number; currency?: Currency }): Promise<ProviderResult> {
    const limit = Math.min(Math.max(opts?.limit ?? 12, 1), 50);
    const currency = (opts?.currency || "EUR") as Currency;

    let items = await awinApiSearch(q, limit);

    if (!items.length) {
      items = MOCK.slice(0, limit).map((p, idx) => ({
        ...p,
        id: `${p.id}-${idx}`,
        currency,
      }));
    }

    return { provider: "awin", items };
  },
};

