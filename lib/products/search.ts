// FILE: lib/products/search.ts
export const runtime = "edge";

import type { UiProduct } from "@/lib/types";

// --- Helpers ---
function parsePriceCurrency(raw: string | null | undefined): { price: number | null; currency: string } {
  if (!raw) return { price: null, currency: "EUR" };
  const curMatch = raw.match(/[€$£]|USD|EUR|GBP/i);
  const currency =
    raw.includes("€") || /EUR/i.test(raw) ? "EUR" :
    raw.includes("$") || /USD/i.test(raw) ? "USD" :
    raw.includes("£") || /GBP/i.test(raw) ? "GBP" : "EUR";

  const numMatch = raw.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const val = Number.parseFloat(numMatch);
  return { price: Number.isFinite(val) ? val : null, currency };
}

function normalizeCategory(source: string | undefined): UiProduct["category"] {
  const s = (source || "").toLowerCase();
  if (s.includes("dress")) return "Dress";
  if (s.includes("coat") || s.includes("jacket") || s.includes("trench") || s.includes("blazer")) return "Outerwear";
  if (s.includes("shoe") || s.includes("boot") || s.includes("heel") || s.includes("sneaker")) return "Shoes";
  if (s.includes("bag")) return "Bag";
  if (s.includes("pant") || s.includes("jean") || s.includes("skirt") || s.includes("trouser")) return "Bottom";
  if (s.includes("top") || s.includes("shirt") || s.includes("knit") || s.includes("sweater") || s.includes("blouse")) return "Top";
  return "Accessory";
}

export type SearchOpts = {
  query: string;
  country?: string;
  max?: number;
};

/** Search real products via SerpAPI (Google Shopping). Fallback = mock list. */
export async function searchProductsSerpApi(opts: SearchOpts): Promise<UiProduct[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return mockProducts(opts.query);

  const { query, country, max = 12 } = opts;
  const gl = (country || "NL").toLowerCase();
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("tbm", "shop");
  url.searchParams.set("q", query);
  url.searchParams.set("gl", gl);
  url.searchParams.set("hl", "en");
  url.searchParams.set("api_key", key);

  const resp = await fetch(url.toString(), { method: "GET", cache: "no-store" }).catch(() => null);
  if (!resp || !resp.ok) return mockProducts(query);

  type Shopping = {
    product_id?: string;
    title?: string;
    source?: string;
    link?: string;
    thumbnail?: string;
    price?: string;
  };

  const data = (await resp.json().catch(() => ({}))) as { shopping_results?: Shopping[] };
  const list = Array.isArray(data.shopping_results) ? data.shopping_results : [];

  const items: UiProduct[] = list.slice(0, max).map((it, idx) => {
    const { price, currency } = parsePriceCurrency(it.price);
    const brand = it.source?.trim() || null;
    return {
      id: it.product_id || `serpapi_${idx}`,
      title: it.title || "Product",
      url: it.link || null,
      brand,
      category: normalizeCategory(it.title),
      price,
      currency,
      image: it.thumbnail || null,
    };
  });

  return items.length ? items : mockProducts(query);
}

// --- Safe mock fallback when no API key or no results ---
function mockProducts(query: string): UiProduct[] {
  return [
    {
      id: "mock1",
      title: "Tailored Trench Coat",
      url: "https://www.massimodutti.com/",
      brand: "Massimo Dutti",
      category: "Outerwear",
      price: 149,
      currency: "EUR",
      image: null,
    },
    {
      id: "mock2",
      title: "Silk-Blend Blouse",
      url: "https://www.zara.com/",
      brand: "Zara",
      category: "Top",
      price: 49,
      currency: "EUR",
      image: null,
    },
    {
      id: "mock3",
      title: "High-Waist Trousers",
      url: "https://www.cos.com/",
      brand: "COS",
      category: "Bottom",
      price: 89,
      currency: "EUR",
      image: null,
    },
    {
      id: "mock4",
      title: "Leather Ankle Boots",
      url: "https://www.zalando.nl/",
      brand: "Zalando",
      category: "Shoes",
      price: 120,
      currency: "EUR",
      image: null,
    },
    {
      id: "mock5",
      title: "Structured Shoulder Bag",
      url: "https://www.mango.com/",
      brand: "Mango",
      category: "Bag",
      price: 59,
      currency: "EUR",
      image: null,
    },
  ];
}
