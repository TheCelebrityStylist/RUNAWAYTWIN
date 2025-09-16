// app/api/chat/tools.ts
export type ToolSchema = {
  name: string;
  description: string;
  schema: Record<string, any>;
};

export const toolSchemas: ToolSchema[] = [
  {
    name: "retailer_search",
    description: "Search in-stock fashion items with filters",
    schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords or URL for the desired product" },
        url: { type: "string", description: "Direct product URL to inspect" },
        country: { type: "string" },
        currency: { type: "string" },
        budgetMax: { type: "number" },
        size: { type: "string" },
        category: { type: "string" },
        color: { type: "string" },
        limit: { type: "number", default: 12 },
      },
      required: ["query"],
    },
  },
  {
    name: "stock_check",
    description: "Check EU/US stock & price for a product",
    schema: {
      type: "object",
      properties: {
        productId: { type: "string" },
        country: { type: "string" },
        currency: { type: "string" },
      },
      required: ["productId", "country"],
    },
  },
  {
    name: "affiliate_link",
    description: "Convert a product URL to an affiliate-safe link",
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
    description: "Extract dominant colors (hex) from a user image to guide palette",
    schema: {
      type: "object",
      properties: { imageUrl: { type: "string" }, swatches: { type: "number", default: 5 } },
      required: ["imageUrl"],
    },
  },
  {
    name: "fx_convert",
    description: "Convert an amount between currencies",
    schema: {
      type: "object",
      properties: {
        amount: { type: "number" },
        from: { type: "string", description: "Source currency (e.g. EUR)" },
        to: { type: "string", description: "Target currency (e.g. USD)" },
        precision: { type: "number", description: "Decimal places for rounding" },
      },
      required: ["amount", "from", "to"],
    },
  },
];

export { createToolDispatcher } from "./tools/index";
export type {
  ToolDispatcher,
  ToolAdapter,
  ToolContext,
  ToolName,
  SearchProductsArgs,
  SearchProductsResponse,
  CheckStockArgs,
  CheckStockResponse,
  AffiliateLinkArgs,
  AffiliateLinkResponse,
  PaletteFromImageArgs,
  PaletteFromImageResponse,
  FxConvertArgs,
  FxConvertResponse,
  NormalizedProduct,
} from "./tools/index";

export { demoAdapter } from "./tools/adapters/demoAdapter";
export { webAdapter } from "./tools/adapters/webAdapter";
export { awinAdapter } from "./tools/adapters/awinAdapter";
