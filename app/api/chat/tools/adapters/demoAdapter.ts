// app/api/chat/tools/adapters/demoAdapter.ts
import type {
  AffiliateLinkArgs,
  AffiliateLinkResponse,
  FxConvertArgs,
  FxConvertResponse,
  PaletteFromImageArgs,
  PaletteFromImageResponse,
  SearchProductsArgs,
  ToolAdapter,
  ToolContext,
  CheckStockArgs,
  CheckStockResponse,
  AdapterProduct,
} from "../index";

const DEMO_SOURCE = "demo";

const demoCatalog: AdapterProduct[] = [
  {
    id: "tw-top-003",
    brand: "Toteme",
    title: "Contour Rib Long-Sleeve",
    price: 160,
    currency: "EUR",
    retailer: "SSENSE",
    url: "https://www.ssense.example/toteme-contour-rib",
    color: "ivory",
    sizes: ["XS", "S", "M", "L"],
    image: "https://images.example.com/toteme_rib_ivory.jpg",
    stock: true,
  },
  {
    id: "tw-trouser-002",
    brand: "COS",
    title: "Tailored Tapered Wool Trousers",
    price: 120,
    currency: "EUR",
    retailer: "COS",
    url: "https://www.cos.example/tapered-wool-trouser",
    color: "charcoal",
    sizes: ["34", "36", "38", "40", "42"],
    image: "https://images.example.com/cos_tapered_charcoal.jpg",
    stock: true,
  },
  {
    id: "tw-outer-010",
    brand: "Arket",
    title: "Double-Faced Wool Coat",
    price: 260,
    currency: "EUR",
    retailer: "Arket",
    url: "https://www.arket.example/dbl-coat",
    color: "black",
    sizes: ["XS", "S", "M", "L"],
    image: "https://images.example.com/arket_coat_black.jpg",
    stock: true,
  },
  {
    id: "tw-boot-001",
    brand: "Aeyde",
    title: "Elongated Leather Ankle Boots",
    price: 295,
    currency: "EUR",
    retailer: "Zalando",
    url: "https://www.zalando.example/aeyde-elong-boot",
    color: "black",
    sizes: ["36", "37", "38", "39", "40", "41"],
    image: "https://images.example.com/aeyde_ankle_boot.jpg",
    stock: true,
  },
  {
    id: "tw-bag-020",
    brand: "Staud",
    title: "Leather Shoulder Bag",
    price: 225,
    currency: "EUR",
    retailer: "SSENSE",
    url: "https://www.ssense.example/staud-shoulder",
    color: "black",
    sizes: [],
    image: "https://images.example.com/staud_shoulder_black.jpg",
    stock: true,
  },
  {
    id: "tw-acc-030",
    brand: "Mejuri",
    title: "Bold Gold Hoop Earrings",
    price: 95,
    currency: "EUR",
    retailer: "Mejuri",
    url: "https://www.mejuri.example/gold-hoop",
    color: "gold",
    sizes: [],
    image: "https://images.example.com/mejuri_hoop_gold.jpg",
    stock: true,
  },
];

function tokens(text: string) {
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function itemMatches(item: AdapterProduct, terms: string[]) {
  if (!terms.length) return true;
  const haystack = [item.title, item.brand, item.color]
    .map((s) => (typeof s === "string" ? s.toLowerCase() : ""))
    .join(" ");
  return terms.every((t) => haystack.includes(t));
}

function clampLimit(limit?: number) {
  if (!Number.isFinite(limit || NaN)) return 6;
  return Math.max(1, Math.min(20, Math.floor(Number(limit))));
}

function makePalette(imageUrl: string, swatches = 5) {
  const base = ["#2E2E2E", "#7F7F7F", "#EDE9E3", "#C7A27A", "#4A646C", "#B59DA4", "#22303C"];
  const count = Math.max(1, Math.min(swatches, base.length));
  if (!imageUrl) return base.slice(0, count);
  let hash = 0;
  for (let i = 0; i < imageUrl.length; i += 1) {
    hash = (hash * 33 + imageUrl.charCodeAt(i)) % base.length;
  }
  const rotated = [...base.slice(hash), ...base.slice(0, hash)];
  return rotated.slice(0, count);
}

function convertFx(args: FxConvertArgs): FxConvertResponse {
  const start = Date.now();
  const from = (args.from || "EUR").toUpperCase();
  const to = (args.to || "EUR").toUpperCase();
  const amount = Number(args.amount || 0);
  const precision = Number.isFinite(args.precision || NaN)
    ? Math.max(0, Math.min(4, Math.floor(Number(args.precision))))
    : 2;
  const matrix: Record<string, Record<string, number>> = {
    EUR: { USD: 1.08, GBP: 0.86, EUR: 1 },
    USD: { EUR: 0.93, GBP: 0.80, USD: 1 },
    GBP: { EUR: 1.16, USD: 1.24, GBP: 1 },
  };
  const rate = matrix[from]?.[to] ?? 1;
  const converted = Number((amount * rate).toFixed(precision));
  return {
    amount: converted,
    currency: to,
    rate,
    source: DEMO_SOURCE,
    latency: Date.now() - start,
  };
}

function makeAffiliateLink(args: AffiliateLinkArgs): AffiliateLinkResponse {
  const started = Date.now();
  try {
    const url = new URL(args.url);
    url.searchParams.set("affid", "runwaytwin-demo");
    return {
      url: url.toString(),
      retailer: args.retailer || url.hostname.replace(/^www\./i, ""),
      source: DEMO_SOURCE,
      latency: Date.now() - started,
    };
  } catch {
    return {
      url: args.url,
      retailer: args.retailer || null,
      source: DEMO_SOURCE,
      latency: Date.now() - started,
    };
  }
}

function checkDemoStock(args: CheckStockArgs): CheckStockResponse {
  const started = Date.now();
  const match = demoCatalog.find((item) => item.id === args.productId || item.url === args.productId);
  if (!match) {
    return {
      productId: args.productId,
      inStock: false,
      source: DEMO_SOURCE,
      latency: Date.now() - started,
    };
  }
  return {
    productId: match.id || args.productId,
    inStock: match.stock !== false,
    price: typeof match.price === "number" ? match.price : undefined,
    currency: typeof match.currency === "string" ? match.currency : undefined,
    retailer: typeof match.retailer === "string" ? match.retailer : undefined,
    url: typeof match.url === "string" ? match.url : undefined,
    image: typeof match.image === "string" ? match.image : undefined,
    sizes: Array.isArray(match.sizes) ? match.sizes.map(String) : undefined,
    source: DEMO_SOURCE,
    latency: Date.now() - started,
  };
}

function demoPalette(args: PaletteFromImageArgs): PaletteFromImageResponse {
  const started = Date.now();
  return {
    colors: makePalette(args.imageUrl, args.swatches),
    source: DEMO_SOURCE,
    latency: Date.now() - started,
  };
}

function searchDemoCatalog(args: SearchProductsArgs, _ctx: ToolContext) {
  const started = Date.now();
  const terms = tokens(args.query || "");
  const limit = clampLimit(args.limit);
  let items = demoCatalog.filter((item) => itemMatches(item, terms));
  if (!items.length) items = demoCatalog.slice(0, limit);
  const sliced = items.slice(0, limit).map((item) => ({ ...item }));
  return {
    items: sliced,
    source: DEMO_SOURCE,
    latency: Date.now() - started,
    meta: { total: items.length },
  };
}

export const demoAdapter: ToolAdapter = {
  id: DEMO_SOURCE,
  async searchProducts(args: SearchProductsArgs, ctx: ToolContext) {
    return searchDemoCatalog(args, ctx);
  },
  async checkStock(args: CheckStockArgs) {
    return checkDemoStock(args);
  },
  async affiliateLink(args: AffiliateLinkArgs) {
    return makeAffiliateLink(args);
  },
  async paletteFromImage(args: PaletteFromImageArgs) {
    return demoPalette(args);
  },
  async fxConvert(args: FxConvertArgs) {
    return convertFx(args);
  },
};
