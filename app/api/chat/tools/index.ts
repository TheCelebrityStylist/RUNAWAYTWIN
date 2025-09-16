import { demoAdapter } from "./adapters/demo";
import { webAdapter } from "./adapters/web";
import { awinAdapter } from "./adapters/awin";
import {
  AdapterContext,
  AffiliateLinkArgs,
  FxArgs,
  FxResult,
  PaletteArgs,
  PaletteResult,
  Product,
  ProductAdapter,
  ProductSearchResult,
  SearchProductsArgs,
  StockResult,
} from "./types";

export type ToolDefinition = {
  name: string;
  description: string;
  schema: Record<string, any>;
};

const productAdapters: ProductAdapter[] = [awinAdapter, webAdapter, demoAdapter];

function uniqueProducts(items: Product[], limit: number): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const item of items) {
    const key = item.url || item.id || `${item.brand}-${item.title}`;
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export async function searchProducts(
  args: SearchProductsArgs,
  ctx: AdapterContext
): Promise<ProductSearchResult | null> {
  const limit = args.limit ?? 8;
  const aggregated: Product[] = [];
  const notes: string[] = [];

  for (const adapter of productAdapters) {
    if (!adapter.searchProducts) continue;
    try {
      const started = Date.now();
      const result = await adapter.searchProducts(args, ctx);
      if (!result || !result.items?.length) continue;
      const duration = Date.now() - started;
      notes.push(`${adapter.name}:${duration}ms:${result.items.length}`);
      for (const item of result.items) {
        aggregated.push({ ...item, source: item.source ?? adapter.name });
      }
      if (aggregated.length >= limit) break;
    } catch (error) {
      console.error(`searchProducts adapter ${adapter.name} error`, error);
    }
  }

  if (!aggregated.length) return null;

  return {
    items: uniqueProducts(aggregated, limit),
    query: args.query,
    source: notes.join(" | ") || "adapters",
  };
}

export async function checkStock(
  args: { productId?: string; url?: string; country?: string },
  ctx: AdapterContext
): Promise<StockResult | null> {
  for (const adapter of productAdapters) {
    if (!adapter.checkStock) continue;
    try {
      const result = await adapter.checkStock(args, ctx);
      if (result) return result;
    } catch (error) {
      console.error(`checkStock adapter ${adapter.name} error`, error);
    }
  }
  return null;
}

export async function affiliateLink(
  args: AffiliateLinkArgs,
  ctx: AdapterContext
): Promise<{ url: string; retailer?: string | null }> {
  for (const adapter of productAdapters) {
    if (!adapter.affiliateLink) continue;
    try {
      const result = await adapter.affiliateLink(args, ctx);
      if (result) return result;
    } catch (error) {
      console.error(`affiliateLink adapter ${adapter.name} error`, error);
    }
  }
  return { url: args.url, retailer: args.retailer };
}

async function extractPalette(args: PaletteArgs): Promise<PaletteResult> {
  const swatches = Math.max(3, Math.min(args.swatches ?? 5, 8));
  try {
    const res = await fetch(args.imageUrl);
    if (!res.ok) throw new Error(`palette fetch ${res.status}`);
    const blob = await res.blob();
    if (typeof createImageBitmap === "function" && typeof OffscreenCanvas !== "undefined") {
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(Math.min(bitmap.width, 80), Math.min(bitmap.height, 80));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const buckets = new Map<string, number>();
      for (let i = 0; i < data.length; i += 4 * 5) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = [r, g, b]
          .map((value) => {
            const quantized = Math.round(value / 32) * 32;
            return Math.max(0, Math.min(255, quantized));
          })
          .join(",");
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
      const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1]).slice(0, swatches);
      const colors = sorted.map(([key]) => {
        const [r, g, b] = key.split(",").map(Number);
        return `#${[r, g, b]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")}`;
      });
      return { colors, source: "image" };
    }
  } catch (error) {
    console.error("paletteFromImage error", error);
  }
  return {
    colors: ["#1F1F1F", "#6B6B6B", "#E9E9E9", "#C19A6B", "#1B3A4B"].slice(0, args.swatches ?? 5),
    source: "fallback",
  };
}

async function convertFx(args: FxArgs): Promise<FxResult> {
  const amount = Number(args.amount);
  if (!Number.isFinite(amount)) {
    throw new Error("Invalid amount");
  }
  try {
    const url = new URL("https://api.exchangerate.host/convert");
    url.searchParams.set("from", args.from.toUpperCase());
    url.searchParams.set("to", args.to.toUpperCase());
    url.searchParams.set("amount", amount.toString());
    const res = await fetch(url.toString());
    const json = await res.json();
    if (json && typeof json.result === "number" && typeof json.info?.rate === "number") {
      return {
        amount: json.result,
        rate: json.info.rate,
        currency: args.to.toUpperCase(),
        source: "exchangerate.host",
      };
    }
  } catch (error) {
    console.error("fxConvert error", error);
  }
  return {
    amount,
    rate: 1,
    currency: args.to.toUpperCase(),
    source: "fallback",
  };
}

export const toolSchemas: ToolDefinition[] = [
  {
    name: "search_products",
    description: "Search for in-stock fashion products with structured output",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language search term" },
        url: { type: "string", description: "Optional direct product URL to hydrate" },
        country: { type: "string" },
        currency: { type: "string" },
        budgetMax: { type: "number" },
        size: { type: "string" },
        color: { type: "string" },
        category: { type: "string" },
        limit: { type: "number", default: 8 },
      },
      anyOf: [{ required: ["query"] }, { required: ["url"] }],
    },
  },
  {
    name: "check_stock",
    description: "Validate inventory and latest pricing for a product",
    schema: {
      type: "object",
      properties: {
        productId: { type: "string" },
        url: { type: "string" },
        country: { type: "string" },
      },
      anyOf: [{ required: ["productId"] }, { required: ["url"] }],
    },
  },
  {
    name: "affiliate_link",
    description: "Convert a retailer URL into an affiliate-safe tracking link",
    schema: {
      type: "object",
      properties: {
        url: { type: "string" },
        retailer: { type: "string" },
      },
      required: ["url"],
    },
  },
  {
    name: "palette_from_image",
    description: "Extract a balanced palette from a user image",
    schema: {
      type: "object",
      properties: {
        imageUrl: { type: "string" },
        swatches: { type: "number", minimum: 3, maximum: 8 },
      },
      required: ["imageUrl"],
    },
  },
  {
    name: "fx_convert",
    description: "Convert an amount between currencies using live FX rates",
    schema: {
      type: "object",
      properties: {
        amount: { type: "number" },
        from: { type: "string" },
        to: { type: "string" },
      },
      required: ["amount", "from", "to"],
    },
  },
];

export async function runTool(
  name: string,
  args: any,
  ctx: AdapterContext
): Promise<any> {
  switch (name) {
    case "search_products":
      return searchProducts(args, ctx);
    case "check_stock":
      return checkStock(args, ctx);
    case "affiliate_link":
      return affiliateLink(args, ctx);
    case "palette_from_image":
      return extractPalette(args);
    case "fx_convert":
      return convertFx(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
