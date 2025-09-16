import { AdapterContext, Product, ProductAdapter, ProductSearchResult, SearchProductsArgs, StockResult } from "../types";
import { normalizeProductUrl } from "@/lib/extract/url";

const AWIN_TOKEN = process.env.AWIN_ACCESS_TOKEN;
const AWIN_PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID;
const AWIN_BASE = "https://api.awin.com/v3";

async function awinFetch(path: string, params: Record<string, string | number | undefined>) {
  if (!AWIN_TOKEN) throw new Error("AWIN token missing");
  const url = new URL(`${AWIN_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${AWIN_TOKEN}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`AWIN ${res.status}`);
  return res.json();
}

type AwinProduct = {
  productId: string;
  productName: string;
  brandName?: string;
  merchantName: string;
  description?: string;
  awDeepLink?: string;
  merchantProductId?: string;
  currency?: string;
  price?: number;
  imgLargeUrl?: string;
  imgMediumUrl?: string;
  imgSmallUrl?: string;
  categories?: Array<{ name?: string }>;
  stockStatus?: string;
};

function mapAwinProduct(product: AwinProduct): Product {
  const image = product.imgLargeUrl || product.imgMediumUrl || product.imgSmallUrl;
  const url = product.awDeepLink || "";
  return {
    id: product.productId,
    title: product.productName,
    brand: product.brandName || product.merchantName,
    retailer: product.merchantName,
    price: typeof product.price === "number" ? product.price : null,
    currency: product.currency || null,
    url: url ? normalizeProductUrl(url) : "",
    imageUrl: image || undefined,
    description: product.description || null,
    category: product.categories?.[0]?.name || null,
    availability: product.stockStatus || null,
    source: "awin",
  };
}

async function searchAwin(args: SearchProductsArgs): Promise<ProductSearchResult | null> {
  if (!AWIN_TOKEN) return null;
  const query = args.query;
  if (!query) return null;
  try {
    const payload = await awinFetch("/products/search", {
      query,
      pageSize: Math.min(args.limit ?? 10, 25),
      sort: "relevance",
      countryCode: args.country,
      minPrice: args.budgetMax ? Math.max(args.budgetMax * 0.5, 0).toFixed(2) : undefined,
      maxPrice: args.budgetMax ? args.budgetMax.toFixed(2) : undefined,
      publisherId: AWIN_PUBLISHER_ID,
    });
    const items = Array.isArray(payload?.products)
      ? (payload.products as AwinProduct[]).map(mapAwinProduct).filter((p) => p.url)
      : [];
    if (!items.length) return null;
    return { items: items.slice(0, args.limit ?? items.length), query, source: "awin" };
  } catch (error) {
    console.error("awinAdapter search error", error);
    return null;
  }
}

async function checkAwinStock(args: { productId?: string; url?: string }): Promise<StockResult | null> {
  if (!AWIN_TOKEN) return null;
  if (!args.productId && !args.url) return null;
  try {
    if (args.productId) {
      const payload = await awinFetch(`/products/${args.productId}`, {});
      const product = payload as AwinProduct;
      if (!product) return null;
      const mapped = mapAwinProduct(product);
      return {
        productId: product.productId,
        url: mapped.url,
        inStock: product.stockStatus ? !/out/i.test(product.stockStatus) : true,
        price: mapped.price,
        currency: mapped.currency,
        retailer: mapped.retailer,
      };
    }
    if (args.url) {
      const search = await searchAwin({ query: args.url, limit: 1 });
      const first = search?.items?.[0];
      if (!first) return null;
      return {
        productId: first.id,
        url: first.url,
        inStock: first.availability ? !/out/i.test(first.availability) : true,
        price: first.price,
        currency: first.currency,
        retailer: first.retailer,
      };
    }
  } catch (error) {
    console.error("awinAdapter stock error", error);
  }
  return null;
}

export const awinAdapter: ProductAdapter = {
  name: "awin",
  async searchProducts(args: SearchProductsArgs, _ctx: AdapterContext) {
    return searchAwin(args);
  },
  async checkStock(args, _ctx) {
    return checkAwinStock(args);
  },
  async affiliateLink({ url }) {
    if (!AWIN_TOKEN) return null;
    const normalized = normalizeProductUrl(url);
    try {
      const deepLink = await awinFetch("/affiliate/link-builder", {
        url: normalized,
        publisherId: AWIN_PUBLISHER_ID,
      });
      if (deepLink?.clickUrl) {
        return { url: deepLink.clickUrl as string };
      }
    } catch (error) {
      console.error("awinAdapter affiliate error", error);
    }
    return { url: normalized };
  },
};
