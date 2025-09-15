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
        query: { type: "string", description: "e.g., 'black leather chelsea boots women'" },
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

// ===== Demo internals (replace with real retailer APIs when ready) =====
function euro(n: number) { return { price: n, currency: "EUR" as const }; }

async function demoSearch(args: any) {
  const q = (args?.query || "").toLowerCase();
  // Return a tiny believable catalog (with imageUrl).
  const db = [
    {
      id: "tw-top-003",
      brand: "Toteme",
      title: "Contour Rib Long-Sleeve",
      ...euro(160),
      retailer: "SSENSE",
      url: "https://www.ssense.example/toteme-contour-rib",
      color: "ivory",
      sizes: ["XS", "S", "M", "L"],
      imageUrl: "https://images.example.com/toteme_rib_ivory.jpg",
    },
    {
      id: "tw-trouser-002",
      brand: "COS",
      title: "Tailored Tapered Wool Trousers",
      ...euro(120),
      retailer: "COS",
      url: "https://www.cos.example/tapered-wool-trouser",
      color: "charcoal",
      sizes: ["34", "36", "38", "40", "42"],
      imageUrl: "https://images.example.com/cos_tapered_charcoal.jpg",
    },
    {
      id: "tw-outer-010",
      brand: "Arket",
      title: "Double-Faced Wool Coat",
      ...euro(260),
      retailer: "Arket",
      url: "https://www.arket.example/dbl-coat",
      color: "black",
      sizes: ["XS", "S", "M", "L"],
      imageUrl: "https://images.example.com/arket_coat_black.jpg",
    },
    {
      id: "tw-boot-001",
      brand: "Aeyde",
      title: "Elongated Leather Ankle Boots",
      ...euro(295),
      retailer: "Zalando",
      url: "https://www.zalando.example/aeyde-elong-boot",
      color: "black",
      sizes: ["36", "37", "38", "39", "40", "41"],
      imageUrl: "https://images.example.com/aeyde_ankle_boot.jpg",
    },
    {
      id: "tw-bag-020",
      brand: "Staud",
      title: "Leather Shoulder Bag",
      ...euro(225),
      retailer: "SSENSE",
      url: "https://www.ssense.example/staud-shoulder",
      color: "black",
      sizes: [],
      imageUrl: "https://images.example.com/staud_shoulder_black.jpg",
    },
    {
      id: "tw-acc-030",
      brand: "Mejuri",
      title: "Bold Gold Hoop Earrings",
      ...euro(95),
      retailer: "Mejuri",
      url: "https://www.mejuri.example/gold-hoop",
      color: "gold",
      sizes: [],
      imageUrl: "https://images.example.com/mejuri_hoop_gold.jpg",
    },
  ];

  const items = db.filter((it) =>
    q.split(/\s+/).every((w: string) => it.title.toLowerCase().includes(w) || it.brand.toLowerCase().includes(w) || it.color.toLowerCase().includes(w))
  );

  return { items: items.length ? items : db.slice(0, 3), query: args?.query };
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

