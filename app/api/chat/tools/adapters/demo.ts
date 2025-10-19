import { AdapterContext, Product, ProductAdapter, ProductSearchResult, SearchProductsArgs, StockResult } from "../types";
import { normalizeProductUrl } from "@/lib/extract/url";

const demoCatalog: Product[] = [
  {
    id: "demo-top-001",
    category: "Top",
    brand: "Totême",
    title: "Contour Ribbed-knit Top",
    retailer: "NET-A-PORTER",
    price: 190,
    currency: "EUR",
    url: "https://www.net-a-porter.com/en-gb/shop/product/toteme/clothing/knitwear/contour-ribbed-stretch-knit-top/43769801097072712",
    imageUrl: "https://images.net-a-porter.com/images/products/43769801097072712/in/w560_q60.jpg",
    color: "ivory",
    availability: "http://schema.org/InStock",
  },
  {
    id: "demo-bottom-001",
    category: "Bottom",
    brand: "Khaite",
    title: "Gabe Pleated Wool Trousers",
    retailer: "MATCHESFASHION",
    price: 890,
    currency: "EUR",
    url: "https://www.matchesfashion.com/products/khaite-gabe-high-rise-wool-twill-trousers-1520858",
    imageUrl: "https://assets.matchesfashion.com/images/1520858_1_large.jpg",
    color: "charcoal",
    availability: "http://schema.org/InStock",
  },
  {
    id: "demo-outer-001",
    category: "Outerwear",
    brand: "The Row",
    title: "Selby Double-face Coat",
    retailer: "NET-A-PORTER",
    price: 3200,
    currency: "EUR",
    url: "https://www.net-a-porter.com/en-gb/shop/product/the-row/clothing/coats/selby-double-faced-wool-coat/43769801095500498",
    imageUrl: "https://images.net-a-porter.com/images/products/43769801095500498/in/w560_q60.jpg",
    color: "black",
    availability: "http://schema.org/LimitedAvailability",
  },
  {
    id: "demo-shoe-001",
    category: "Shoes",
    brand: "The Row",
    title: "Adela Leather Ankle Boots",
    retailer: "SSENSE",
    price: 1190,
    currency: "EUR",
    url: "https://www.ssense.com/en-us/women/product/the-row/black-adela-boots/13790881",
    imageUrl: "https://res.cloudinary.com/ssenseweb/image/upload/b_white,c_pad,dpr_1.0,f_auto,h_1200,q_90,w_1200/v1642529250/dsjn53x6znk0f4mwx0ef.jpg",
    color: "black",
    availability: "http://schema.org/InStock",
  },
  {
    id: "demo-bag-001",
    category: "Bag",
    brand: "Bottega Veneta",
    title: "Medium Andiamo Leather Tote",
    retailer: "Bottega Veneta",
    price: 3600,
    currency: "EUR",
    url: "https://www.bottegaveneta.com/en-nl/andiamo/andiamo-medium-in-black-intrecciato-leather-749455V1G218842.html",
    imageUrl: "https://www.bottegaveneta.com/variants/images/36115873551491174/D/w400.jpg",
    color: "black",
    availability: "http://schema.org/PreOrder",
  },
  {
    id: "demo-acc-001",
    category: "Accessories",
    brand: "Mejuri",
    title: "Bold Small Hoop Earrings",
    retailer: "Mejuri",
    price: 150,
    currency: "USD",
    url: "https://mejuri.com/world/en/product/bold-hoops-small-gold",
    imageUrl: "https://cdn.mejuri.com/content/product/00X3/01/MEJURI/Bold-Hoops/1148/hero-1148.jpg",
    color: "gold",
    availability: "http://schema.org/InStock",
  },
  {
    id: "demo-alt-outer-001",
    category: "Outerwear",
    brand: "COS",
    title: "Oversized Double-Face Wool Coat",
    retailer: "COS",
    price: 275,
    currency: "EUR",
    url: "https://www.cos.com/en_eur/women/womenswear/coats-and-jackets/product.oversized-double-faced-wool-coat-black.0915802001.html",
    imageUrl: "https://www.cos.com/content/dam/cos/2023/women/coats/0915802001/0915802001_0.jpg",
    color: "black",
    availability: "http://schema.org/InStock",
  },
  {
    id: "demo-alt-shoe-001",
    category: "Shoes",
    brand: "Aeyde",
    title: "Delia Leather Boots",
    retailer: "Aeyde",
    price: 475,
    currency: "EUR",
    url: "https://www.aeyde.com/en-eu/products/delia-black-leather",
    imageUrl: "https://cdn.shopify.com/s/files/1/0264/0264/5361/products/Aeyde_Delia_Black_Leather_1.jpg?v=1693308654",
    color: "black",
    availability: "http://schema.org/InStock",
  },
  {
    id: "demo-dress-001",
    category: "Dress",
    brand: "Nensi Dojaka",
    title: "Cami Cutout Mini Dress",
    retailer: "NET-A-PORTER",
    price: 865,
    currency: "EUR",
    url: "https://www.net-a-porter.com/en-gb/shop/product/nensi-dojaka/clothing/mini/cutout-crepe-mini-dress/1647597285813967",
    imageUrl: "https://images.net-a-porter.com/images/products/43769801096707015/in/w560_q60.jpg",
    color: "black",
    availability: "http://schema.org/LimitedAvailability",
  },
  {
    id: "demo-top-002",
    category: "Top",
    brand: "The Row",
    title: "Briker Silk-blend Shirt",
    retailer: "MATCHESFASHION",
    price: 950,
    currency: "EUR",
    url: "https://www.matchesfashion.com/products/the-row-briker-silk-blend-shirt-1432919",
    imageUrl: "https://assets.matchesfashion.com/images/1432919_1_large.jpg",
    color: "white",
    availability: "http://schema.org/InStock",
  },
  {
    id: "demo-bottom-002",
    category: "Bottom",
    brand: "Wardrobe NYC",
    title: "Tailored Stirrup Leggings",
    retailer: "WARDROBE.NYC",
    price: 450,
    currency: "USD",
    url: "https://wardrobe.nyc/collections/woman/products/tailored-stirrup-legging-black",
    imageUrl: "https://cdn.shopify.com/s/files/1/0268/7482/8075/products/WNM2026-BLK_1_1800x1800.jpg?v=1674543726",
    color: "black",
    availability: "http://schema.org/InStock",
  },
  {
    id: "demo-bag-002",
    category: "Bag",
    brand: "Celine",
    title: "Triomphe Shoulder Bag",
    retailer: "24S",
    price: 2900,
    currency: "EUR",
    url: "https://www.24s.com/en-nl/triomphe-small-bag-in-shiny-calfskin-celine_CELJ74E8",
    imageUrl: "https://cdn-images.24sevres.com/1W8QgqbV7hEUzl8Yw2H8kr/540x720/triomphe-small-bag-in-shiny-calfskin-celine.jpg",
    color: "tan",
    availability: "http://schema.org/InStock",
  },
];

export function getDemoCatalog(): Product[] {
  return demoCatalog.map((item) => ({ ...item }));
}

type ScoreEntry = { item: Product; score: number };

function scoreItem(item: Product, query: string, category?: string) {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  let score = 0;
  const haystack = `${item.brand} ${item.title} ${item.category ?? ""} ${item.color ?? ""}`.toLowerCase();
  for (const token of tokens) {
    if (haystack.includes(token)) score += 1;
  }
  if (category && item.category?.toLowerCase() === category.toLowerCase()) score += 1.5;
  return score;
}

async function searchDemo(args: SearchProductsArgs): Promise<ProductSearchResult | null> {
  const limit = args.limit ?? 6;
  const scored: ScoreEntry[] = demoCatalog.map((item) => ({
    item: { ...item, url: normalizeProductUrl(item.url) },
    score: scoreItem(item, args.query, args.category),
  }));

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((entry) => entry.score > 0).slice(0, limit).map((entry) => ({
    ...entry.item,
    source: "demo",
  }));

  if (!top.length) {
    return {
      items: demoCatalog.slice(0, limit).map((item) => ({ ...item, source: "demo", url: normalizeProductUrl(item.url) })),
      query: args.query,
      source: "demo",
      notes: "fallback",
    };
  }

  return {
    items: top,
    query: args.query,
    source: "demo",
  };
}

async function checkDemoStock(args: SearchProductsArgs | { productId?: string; url?: string }): Promise<StockResult | null> {
  const id = (args as any).productId;
  const url = (args as any).url ? normalizeProductUrl((args as any).url) : undefined;
  const item = demoCatalog.find((it) => (id && it.id === id) || (url && normalizeProductUrl(it.url) === url));
  if (!item) return null;
  return {
    productId: item.id,
    url: normalizeProductUrl(item.url),
    inStock: item.availability !== "http://schema.org/OutOfStock",
    price: item.price,
    currency: item.currency,
    retailer: item.retailer,
    sizeOptions: item.sizes,
  };
}

export const demoAdapter: ProductAdapter = {
  name: "demo",
  async searchProducts(args: SearchProductsArgs, _ctx: AdapterContext) {
    return searchDemo(args);
  },
  async checkStock(args, _ctx) {
    return checkDemoStock(args);
  },
  async affiliateLink({ url }) {
    const normalized = normalizeProductUrl(url);
    const parsed = new URL(normalized);
    parsed.searchParams.set("utm_source", "runwaytwin-demo");
    return { url: parsed.toString() };
  },
};
