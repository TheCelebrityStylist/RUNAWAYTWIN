// app/api/chat/tools.ts
export const toolSchemas = [
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

// TODO: Replace internals with your integrations (Algolia/retailer APIs).
async function demoSearch(args: any) {
  const { query, country, budgetMax, color } = args;
  return {
    items: [
      {
        id: "boots-123",
        brand: "Aldo Rossi",
        title: "Cap-Toe Chelsea Boots",
        price: 149,
        currency: "EUR",
        retailer: "Zalando",
        url: "https://www.zalando.example/boots-123",
        color: "black",
        sizes: ["40", "41", "42", "43", "44"],
      },
      {
        id: "trouser-456",
        brand: "COS",
        title: "Tapered Wool Trousers",
        price: 120,
        currency: "EUR",
        retailer: "COS",
        url: "https://www.cos.example/trouser-456",
        color: "charcoal",
        sizes: ["46", "48", "50"],
      },
    ],
    query,
    country,
    budgetMax,
    color,
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
