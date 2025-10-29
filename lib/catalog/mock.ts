// FILE: lib/catalog/mock.ts
// Lightweight mock catalog so the app works without external keys.
// Replace/extend with real providers later.

export type CatalogProduct = {
  id: string;
  title: string;
  brand: string;
  price: number;
  currency: "EUR" | "USD" | "GBP";
  image: string;
  url: string;
  retailer: string;
  gender?: "female" | "male" | "unisex";
  categories: string[]; // ["top","bottom","outerwear","shoes","bag","dress","accessory"]
  keywords: string[];   // ["minimal","tailoring","street","evening"]
  colors?: string[];
};

export const MOCK_CATALOG: CatalogProduct[] = [
  {
    id: "zara-trench-cream",
    title: "Waterproof Belted Trench Coat",
    brand: "Zara",
    price: 99,
    currency: "EUR",
    image:
      "https://static.zara.net/photos///2024/I/0/1/p/8075/301/710/2/w/560/8075301710_1_1_1.jpg",
    url: "https://www.zara.com/",
    retailer: "zara.com",
    gender: "female",
    categories: ["outerwear"],
    keywords: ["trench", "tailoring", "minimal"],
    colors: ["beige"],
  },
  {
    id: "cos-knit-merino",
    title: "Fine-Knit Merino Wool Sweater",
    brand: "COS",
    price: 89,
    currency: "EUR",
    image:
      "https://media.cosstores.com/image/fetch/c_limit,f_auto,q_auto:eco,w_1200/https://www.cosstores.com/content/dam/cos/2023/w24/ladies/knitwear/merino/merino_1.jpg",
    url: "https://www.cos.com/",
    retailer: "cos.com",
    gender: "female",
    categories: ["top"],
    keywords: ["knit", "minimal", "capsule"],
    colors: ["black", "cream", "grey"],
  },
  {
    id: "stories-trouser-tailored",
    title: "High-Waist Tailored Trousers",
    brand: "& Other Stories",
    price: 89,
    currency: "EUR",
    image:
      "https://lp2.hm.com/hmgoepprod?set=source[/1c/5c/1c5c1d22f.jpg],type[DESCRIPTIVE],res[m],hmver[1]&call=url[file:/product/main]",
    url: "https://www.stories.com/",
    retailer: "stories.com",
    gender: "female",
    categories: ["bottom"],
    keywords: ["tailoring", "black", "minimal"],
    colors: ["black"],
  },
  {
    id: "mango-ankle-rain-boot",
    title: "Rubber Ankle Rain Boots",
    brand: "Mango",
    price: 59,
    currency: "EUR",
    image:
      "https://st.mngbcn.com/rcs/pics/static/T6/images/37/12/35/37123521_99_B.jpg",
    url: "https://shop.mango.com/",
    retailer: "mango.com",
    gender: "female",
    categories: ["shoes"],
    keywords: ["rain", "ankle boot", "utility"],
    colors: ["black"],
  },
  {
    id: "aritzia-crossbody",
    title: "Structured Leather Crossbody",
    brand: "Aritzia",
    price: 110,
    currency: "EUR",
    image:
      "https://aritzia.scene7.com/is/image/Aritzia/large/f22_07_a09_86010_1274_on_a.jpg",
    url: "https://www.aritzia.com/",
    retailer: "aritzia.com",
    gender: "female",
    categories: ["bag"],
    keywords: ["leather", "minimal", "structured"],
    colors: ["black"],
  },
  {
    id: "uniqlo-heattech-tee",
    title: "HEATTECH Crew Neck T-Shirt",
    brand: "Uniqlo",
    price: 19,
    currency: "EUR",
    image:
      "https://im.uniqlo.com/global-cms/spa/res2cd3a9c6df383f6af.jpg",
    url: "https://www.uniqlo.com/",
    retailer: "uniqlo.com",
    gender: "unisex",
    categories: ["top"],
    keywords: ["layering", "thermal", "capsule"],
    colors: ["black", "white"],
  },
];

export type SearchInput = {
  q?: string;
  gender?: "female" | "male" | "unisex";
  categories?: string[];
  budgetMax?: number;
  keywords?: string[];
};

export function searchCatalog(input: SearchInput = {}): CatalogProduct[] {
  const { q, gender, categories, budgetMax, keywords } = input;
  const ql = (q || "").toLowerCase();

  return MOCK_CATALOG
    .filter((p) => {
      if (gender && p.gender && p.gender !== gender && p.gender !== "unisex")
        return false;
      if (categories && categories.length && !categories.some((c) => p.categories.includes(c)))
        return false;
      if (typeof budgetMax === "number" && p.price > budgetMax) return false;
      if (keywords && keywords.length && !keywords.some((k) => p.keywords.includes(k)))
        return false;
      if (ql) {
        const hay = `${p.title} ${p.brand} ${p.retailer} ${p.keywords.join(" ")}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    })
    .slice(0, 24);
}
