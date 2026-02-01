// FILE: lib/catalog/mock.ts
// Lightweight local catalog used when providers/keys are missing.
// Images point to Unsplash placeholders; URLs go to the retailer domain homepage.
// Currency defaults to EUR unless overridden per item.

export type Cat =
  | "top"
  | "bottom"
  | "outerwear"
  | "dress"
  | "shoes"
  | "bag"
  | "accessory";

export type MockItem = {
  id: string;
  title: string;
  brand: string;
  categories: Cat[];
  gender: "female" | "male" | "unisex";
  price: number;
  currency: "EUR" | "USD" | "GBP";
  retailer: string;
  url: string;
  image: string;
  availability: "in_stock" | "out_of_stock" | "unknown";
  tags: string[]; // style keywords
};

const U = (w = 800, h = 1000, q = "fashion") =>
  `https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=${w}&h=${h}&q=80&sat=-20&blend=ffffff&bm=normal` +
  `&ixid=mock-${q}`;

export const CATALOG: MockItem[] = [
  // ——— Womens / unisex ———
  {
    id: "zara-trench",
    title: "Water-Resistant Trench Coat",
    brand: "ZARA",
    categories: ["outerwear"],
    gender: "female",
    price: 119,
    currency: "EUR",
    retailer: "zara.com",
    url: "https://www.zara.com/nl/en/water-resistant-trench-coat-p123456.html",
    image: U(800, 1000, "trench"),
    availability: "in_stock",
    tags: ["minimal", "tailoring", "rain", "neutral"],
  },
  {
    id: "cos-knit",
    title: "Fine Merino Knit Sweater",
    brand: "COS",
    categories: ["top"],
    gender: "unisex",
    price: 89,
    currency: "EUR",
    retailer: "cos.com",
    url: "https://www.cos.com/en_eur/men/knitwear/product.merino-knit-sweater.123456.html",
    image: U(800, 1000, "knit"),
    availability: "in_stock",
    tags: ["capsule", "minimal", "layering"],
  },
  {
    id: "arket-trouser",
    title: "High-Waist Tailored Trouser",
    brand: "Arket",
    categories: ["bottom"],
    gender: "female",
    price: 129,
    currency: "EUR",
    retailer: "arket.com",
    url: "https://www.arket.com/en_eur/women/trousers/product.high-waist-tailored-trouser.123456.html",
    image: U(800, 1000, "trouser"),
    availability: "in_stock",
    tags: ["tailoring", "work", "black"],
  },
  {
    id: "stories-ankle-boot",
    title: "Leather Ankle Boots",
    brand: "& Other Stories",
    categories: ["shoes"],
    gender: "female",
    price: 165,
    currency: "EUR",
    retailer: "stories.com",
    url: "https://www.stories.com/en_eur/shoes/boots/product.leather-ankle-boot.123456.html",
    image: U(800, 1000, "boots"),
    availability: "in_stock",
    tags: ["minimal", "weather", "heel-low"],
  },
  {
    id: "mango-shoulder-bag",
    title: "Structured Shoulder Bag",
    brand: "Mango",
    categories: ["bag"],
    gender: "female",
    price: 49,
    currency: "EUR",
    retailer: "mango.com",
    url: "https://shop.mango.com/nl/women/bags/product.structured-shoulder-bag_12345678.html",
    image: U(800, 1000, "bag"),
    availability: "in_stock",
    tags: ["event", "minimal", "black"],
  },
  {
    id: "net-sandal",
    title: "Metallic Heeled Sandal",
    brand: "Gianvito Rossi",
    categories: ["shoes"],
    gender: "female",
    price: 690,
    currency: "EUR",
    retailer: "net-a-porter.com",
    url: "https://www.net-a-porter.com/en-nl/shop/product/gianvito-rossi/shoes/123456.html",
    image: U(800, 1000, "sandal"),
    availability: "in_stock",
    tags: ["evening", "glam"],
  },
  // ——— Mens / unisex ———
  {
    id: "uniqlo-tee",
    title: "U Crew Neck T-Shirt",
    brand: "Uniqlo",
    categories: ["top"],
    gender: "male",
    price: 19,
    currency: "EUR",
    retailer: "uniqlo.com",
    url: "https://www.uniqlo.com/eu/en/product/u-crew-neck-t-shirt-123456.html",
    image: U(800, 1000, "tee"),
    availability: "in_stock",
    tags: ["minimal", "capsule"],
  },
  {
    id: "levi-501",
    title: "501 Original Jeans",
    brand: "Levi's",
    categories: ["bottom"],
    gender: "male",
    price: 110,
    currency: "EUR",
    retailer: "levi.com",
    url: "https://www.levi.com/DE/en_DE/clothing/men/jeans/501-original-fit-jeans/p/123456",
    image: U(800, 1000, "jeans"),
    availability: "in_stock",
    tags: ["denim", "casual"],
  },
  {
    id: "cos-blazer",
    title: "Sharp Wool Blazer",
    brand: "COS",
    categories: ["outerwear"],
    gender: "male",
    price: 225,
    currency: "EUR",
    retailer: "cos.com",
    url: "https://www.cos.com/en_eur/men/tailoring/product.sharp-wool-blazer.123456.html",
    image: U(800, 1000, "blazer"),
    availability: "in_stock",
    tags: ["tailoring", "work", "smart-casual"],
  },
  {
    id: "nike-court",
    title: "Court Sneakers",
    brand: "Nike",
    categories: ["shoes"],
    gender: "unisex",
    price: 99,
    currency: "EUR",
    retailer: "nike.com",
    url: "https://www.nike.com/nl/t/court-sneakers-123456",
    image: U(800, 1000, "sneaker"),
    availability: "in_stock",
    tags: ["street", "casual", "white"],
  },
];

export function searchCatalog(opts: {
  q: string;
  gender: "female" | "male" | "unisex";
  budgetMax: number;
  keywords?: string[];
}): MockItem[] {
  const kws = (opts.keywords ?? [])
    .map((k) => k.toLowerCase())
    .filter(Boolean);

  const inBudget = (p: MockItem) => p.price <= opts.budgetMax * 0.9 || p.price <= opts.budgetMax;
  const byGender = (p: MockItem) =>
    p.gender === "unisex" || p.gender === opts.gender || opts.gender === "unisex";

  const byKeywords = (p: MockItem) =>
    !kws.length || kws.some((k) => p.tags.includes(k) || p.title.toLowerCase().includes(k));

  const byQuery = (p: MockItem) => {
    const q = opts.q.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.tags.some((t) => q.includes(t))
    );
  };

  const scored = CATALOG.map((p) => {
    let score = 0;
    if (inBudget(p)) score += 2;
    if (byGender(p)) score += 1.5;
    if (byKeywords(p)) score += 1;
    if (byQuery(p)) score += 1;
    return { p, score };
  })
    .filter((x) => x.score >= 2.5)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);

  // Always return at least a basic set in deterministic order
  return scored.length ? scored : CATALOG.slice(0, 6);
}
