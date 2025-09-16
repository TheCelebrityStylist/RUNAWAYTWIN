import { extractProductsFromJsonLd } from "@/lib/extract/jsonld";
import { extractFirstImage, extractMeta, extractTitle } from "@/lib/extract/html";
import { ensureAbsoluteUrl, normalizeProductUrl } from "@/lib/extract/url";
import {
  AdapterContext,
  Product,
  ProductAdapter,
  ProductSearchResult,
  SearchProductsArgs,
  StockResult,
} from "../types";

const UA = "RunwayTwinBot/1.0 (+https://runwaytwin.app/contact)";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    url: normalizeProductUrl(product.url),
    imageUrl: product.imageUrl ? ensureAbsoluteUrl(product.imageUrl) : null,
  };
}

function mapJsonLdToProduct(json: ReturnType<typeof extractProductsFromJsonLd>[number]): Product {
  return normalizeProduct({
    title: json.name,
    brand: json.brand || "",
    retailer: json.seller || json.brand || "",
    price: json.price ?? null,
    currency: json.currency ?? null,
    url: json.url || "",
    imageUrl: json.image || undefined,
    category: json.category || null,
    description: json.description || null,
    color: json.color || null,
    availability: json.availability || null,
    source: "web-jsonld",
  });
}

function buildFallbackProduct(url: string, html: string): Product {
  const title = extractTitle(html) || "Product";
  const retailer = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "retailer";
    }
  })();
  const priceRaw = extractMeta(html, [
    "product:price:amount",
    "og:price:amount",
    "price",
  ]);
  const currency = extractMeta(html, [
    "product:price:currency",
    "og:price:currency",
  ]);
  const price = priceRaw ? Number(priceRaw.replace(/[^0-9.,]/g, "").replace(/,/g, "")) : null;
  const image = extractFirstImage(html);
  return normalizeProduct({
    title,
    brand: title.split(" ")[0] || retailer,
    retailer,
    price: Number.isFinite(price) ? Number(price) : null,
    currency: currency || null,
    url,
    imageUrl: image ? ensureAbsoluteUrl(image) : null,
    source: "web-fallback",
  });
}

async function searchWeb(args: SearchProductsArgs): Promise<ProductSearchResult | null> {
  if (!args.url && !args.query) return null;
  const targetUrl = args.url ? ensureAbsoluteUrl(args.url) : undefined;
  if (!targetUrl) return null;

  try {
    const html = await fetchHtml(targetUrl);
    const jsonld = extractProductsFromJsonLd(html);
    if (jsonld.length) {
      const items = jsonld
        .map(mapJsonLdToProduct)
        .filter((item) => item.url)
        .slice(0, args.limit ?? jsonld.length)
        .map((item) => ({ ...item, source: "web-jsonld" }));
      if (items.length) {
        return { items, query: args.query || targetUrl, source: "web" };
      }
    }

    const fallback = buildFallbackProduct(targetUrl, html);
    return { items: [fallback], query: args.query || targetUrl, source: "web", notes: "meta" };
  } catch (error) {
    console.error("webAdapter searchProducts error", error);
    return null;
  }
}

async function checkWebStock(args: { url?: string }): Promise<StockResult | null> {
  if (!args.url) return null;
  try {
    const url = ensureAbsoluteUrl(args.url);
    const html = await fetchHtml(url);
    const jsonld = extractProductsFromJsonLd(html);
    const product = jsonld[0];
    if (!product) {
      return {
        url: normalizeProductUrl(url),
        inStock: true,
      };
    }
    return {
      url: normalizeProductUrl(product.url || url),
      productId: product.sku || undefined,
      inStock: product.availability ? !/outofstock/i.test(product.availability) : true,
      price: product.price ?? null,
      currency: product.currency ?? null,
      retailer: product.seller || product.brand || null,
      raw: product,
    };
  } catch (error) {
    console.error("webAdapter checkStock error", error);
    return null;
  }
}

export const webAdapter: ProductAdapter = {
  name: "web",
  async searchProducts(args: SearchProductsArgs, _ctx: AdapterContext) {
    return searchWeb(args);
  },
  async checkStock(args, _ctx) {
    return checkWebStock(args);
  },
};
