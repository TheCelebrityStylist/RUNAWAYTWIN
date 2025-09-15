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
        query: { type: "string", description: "e.g., 'black leather chelsea boots men'" },
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
      },
      required: ["productId", "country"],
    },
  },
  {
    name: "affiliate_link",
    description: "Convert a product URL to an affiliate-safe link",
    schema: {
      type: "object",
      properties: { url: { type: "string" }, retailer: { type: "string" } },
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
];

// ===== Demo internals (replace with real retailer APIs) =====
async function demoSearch(args: any) {
  const { query } = args;
  const euro = (n: number) => ({ price: n, currency: "EUR" });
  return {
    items: [
      {
        id: "tw-boot-001",
        brand: "Aeyde",
        title: "Elongated Leather Ankle Boots",
        ...euro(295),
        retailer: "Zalando",
        url: "https://www.zalando.example/aeyde-elong-boot",
        color: "black",
        sizes: ["36","37","38","39","40","41"],
      },
      {
        id: "tw-trouser-002",
        brand: "COS",
        title: "Tailored Tapered Wool Trousers",
        ...euro(120),
        retailer: "COS",
        url: "https://www.cos.example/tapered-wool-trouser",
        color: "charcoal",
        sizes: ["34","36","38","40","42"],
      },
      {
        id: "tw-top-003",
        brand: "Toteme",
        title: "Contour Rib Long-Sleeve",
        ...euro(160),
        retailer: "SSENSE",
        url: "https://www.ssense.example/toteme-contour-rib",
        color: "ivory",
        sizes: ["XS","S","M","L"],
      },
    ],
    query,
  };
}

export async function runTool(name: string, args: any, _ctx?: any) {
  switch (name) {
    case "retailer_search":
      return demoSearch(args);
    case "stock_check":
      return { productId: args.productId, country: args.country, inStock: true, price: 149, currency: "EUR" };
    case "affiliate_link":
      return { url: args.url + "?affid=runwaytwin", retailer: args.retailer || null };
    case "palette_from_image":
      return { colors: ["#2E2E2E", "#8B8B8B", "#EAEAEA", "#3A5F5F", "#C7A27A"] };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
