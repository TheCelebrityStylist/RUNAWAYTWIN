// FILE: app/api/tools.ts
/**
 * RunwayTwin Tools (single-file, self-contained, Edge-safe)
 * --------------------------------------------------------
 * Public exports used by /app/api/chat/route.ts:
 *   - searchProducts(params)
 *   - affiliateLink(url, retailer?)
 *   - fxConvert(amount, from, to)
 *
 * Internals (no external imports):
 *   - Inline JSON-LD extractor & OG/meta fallback
 *   - demoAdapter (deterministic)
 *   - webAdapter (DuckDuckGo HTML results → fetch PDP → JSON-LD normalize)
 *   - Adapter chaining with EU/US preference and dedupe
 */

export type Product = {
  id: string;
  brand: string;
  title: string;
  price: number | null;
  currency: string | null;
  retailer: string | null;
  url: string;
  imageUrl?: string | null;
  availability?: string | null;
  category?: string | null;
  tags?: string[];
  color?: string | null;
  description?: string | null;
};

export type SearchProductsArgs = {
  query: string;
  country?: string;
  currency?: string;
  size?: string | null;
  color?: string | null;
  limit?: number;          // default 6, capped 12
  preferEU?: boolean;      // soft preference for EU retailers
};

export interface ProductAdapter {
  name: string;
  searchProducts(params: SearchProductsArgs): Promise<Product[]>;
  checkStock?(productIdOrUrl: string, country?: string): Promise<{ availability: string | null }>;
  affiliateLink?(url: string, retailer?: string | null): Promise<string>;
}

/* =========================
 * Small utilities
 * ========================= */
function clampLimit(n?: number, def = 6) {
  const v = Number.isFinite(n as any) ? Number(n) : def;
  return Math.max(1, Math.min(v, 12));
}
function uniqBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>(); const out: T[] = [];
  for (const x of arr) { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
}
const EU_HOST_HINTS = [
  ".eu", ".nl", ".de", ".fr", ".it", ".es", ".ie", ".be", ".se", ".dk", ".fi", ".pl", ".at",
  "matchesfashion.com", "ssense.com", "mytheresa.com", "farfetch.com", "endclothing.com",
  "mrporter.com", "net-a-porter.com", "arket.com", "cos.com", "hm.com", "mango.com", "zara.com", "levi.com",
];
function scoreByRegion(u: string, preferEU?: boolean): number {
  try {
    const host = new URL(u).hostname.toLowerCase();
    const isEUish = EU_HOST_HINTS.some((h) => host.includes(h));
    return preferEU ? (isEUish ? 2 : 0) : (isEUish ? 0 : 2);
  } catch { return 0; }
}

/* =========================
 * Inline JSON-LD + OG extractors
 * ========================= */
type JsonLd = any;
function safeParse(json: string): any | null { try { return JSON.parse(json); } catch { return null; } }
function extractJsonLd(html: string): JsonLd[] {
  const scripts = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );
  const blocks: JsonLd[] = [];
  for (const m of scripts) {
    const text = m[1]?.trim(); if (!text) continue;
    const parsed = safeParse(text); if (parsed == null) continue;
    if (Array.isArray(parsed)) blocks.push(...parsed); else blocks.push(parsed);
  }
  return blocks;
}
function first<T>(arr: T[] | T | undefined): T | undefined { return !arr ? undefined : (Array.isArray(arr) ? arr[0] : arr); }
function pickOffer(offers: any): any | null {
  if (!offers) return null;
  const list = Array.isArray(offers) ? offers : [offers];
  const inStock = list.find((o) => (String(o.availability || "")).toLowerCase().includes("instock"));
  return inStock || list[0] || null;
}
function normalizeProductFromJsonLd(url: string, doc: JsonLd): Product | null {
  const types = (doc["@type"] ? (Array.isArray(doc["@type"]) ? doc["@type"] : [doc["@type"]]) : [])
    .map((t: any) => String(t).toLowerCase());
  const isProduct = types.includes("product");
  const isOffer = types.includes("offer");
  if (!isProduct && !isOffer) {
    if (doc["@graph"]) {
      for (const node of doc["@graph"]) {
        const p = normalizeProductFromJsonLd(url, node);
        if (p) return p;
      }
      return null;
    }
    return null;
  }
  const productNode = isProduct ? doc : (doc.itemOffered || doc);
  const brandNode = productNode.brand;
  const brandName = typeof brandNode === "string" ? brandNode : (brandNode?.name ?? null);

  const offer = pickOffer(productNode.offers || doc.offers);
  const price = offer ? Number(offer.price || offer.priceSpecification?.price || NaN) : NaN;
  const currency = offer?.priceCurrency || offer?.priceSpecification?.priceCurrency || null;

  const image = first(productNode.image) || productNode.image || offer?.image || null;
  const retailer = offer?.seller?.name || offer?.seller || null;
  const title = productNode.name || offer?.itemOffered?.name || null;
  if (!title) return null;
  const id = productNode.sku || productNode.productID || productNode["@id"] || url;

  return {
    id: String(id),
    brand: brandName ? String(brandName) : "",
    title: String(title),
    price: Number.isFinite(price) ? price : null,
    currency: currency ? String(currency) : null,
    retailer: retailer ? String(retailer) : null,
    url,
    imageUrl: image ? String(image) : null,
    availability: offer?.availability || null,
  };
}
function scrapeMinimalFromHtml(url: string, html: string): Partial<Product> {
  const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const brandGuess = html.match(/"brand"\s*:\s*"([^"]+)"/i);
  return {
    url,
    title: titleMatch ? titleMatch[1] : undefined,
    imageUrl: imgMatch ? imgMatch[1] : undefined,
    brand: brandGuess ? brandGuess[1] : undefined,
  };
}

/* =========================
 * demoAdapter (deterministic)
 * ========================= */
const DEMO_DATA: Product[] = [
  {
    id: "safiyaa-livia-top",
    brand: "Safiyaa",
    title: "Livia Off-the-Shoulder Stretch-Crepe Top",
    price: 795,
    currency: "EUR",
    retailer: "Matchesfashion",
    url: "https://www.matchesfashion.com/products/safiyaa-livia-off-the-shoulder-stretch-crepe-top-1306495",
    imageUrl: "https://assets.runwaytwin-demo.com/safiyaa-livia-top.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["zendaya", "gala", "evening", "structured", "corset", "hourglass", "pear"],
    description: "Structured corset top that frames the shoulders and nips the waist.",
  },
  {
    id: "safiyaa-viviana-skirt",
    brand: "Safiyaa",
    title: "Viviana Stretch-Crepe Maxi Skirt",
    price: 845,
    currency: "EUR",
    retailer: "Matchesfashion",
    url: "https://www.matchesfashion.com/products/safiyaa-viviana-stretch-crepe-maxi-skirt-1306497",
    imageUrl: "https://assets.runwaytwin-demo.com/safiyaa-viviana-skirt.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["zendaya", "gala", "evening", "column", "hourglass", "pear"],
    description: "Floor-sweeping skirt that elongates the frame with a fluid column cut.",
  },
  {
    id: "alex-vauthier-opera-coat",
    brand: "Alexandre Vauthier",
    title: "Satin Duchesse Opera Coat",
    price: 2250,
    currency: "EUR",
    retailer: "Alexandre Vauthier",
    url: "https://www.alexandrevauthier.com/en/collections/coats/opera-coat",
    imageUrl: "https://assets.runwaytwin-demo.com/alexandre-vauthier-opera-coat.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["zendaya", "gala", "evening", "outerwear", "cape"],
    description: "Dramatic satin coat with sculpted shoulders and sweeping hem.",
  },
  {
    id: "jimmy-choo-bing-100",
    brand: "Jimmy Choo",
    title: "Bing 100 Crystal-Embellished Patent Pumps",
    price: 895,
    currency: "EUR",
    retailer: "Jimmy Choo",
    url: "https://row.jimmychoo.com/en/women/shoes/bing-100-crystal-embellished-patent-pumps/BING100PAT.html",
    imageUrl: "https://assets.runwaytwin-demo.com/jimmy-choo-bing-100.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["zendaya", "gala", "evening", "heels", "pump", "hourglass"],
    description: "Sculptural patent pumps with crystal strap that mirrors couture styling.",
  },
  {
    id: "tyler-ellis-perry-clutch",
    brand: "Tyler Ellis",
    title: "Perry Satin Clutch with Crystal Trim",
    price: 1380,
    currency: "EUR",
    retailer: "Tyler Ellis",
    url: "https://tylerellis.com/collections/perry/products/perry-clutch-satin-crystal",
    imageUrl: "https://assets.runwaytwin-demo.com/tyler-ellis-perry-clutch.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["zendaya", "gala", "evening", "bag", "clutch"],
    description: "Structured minaudière finished with pavé crystal hardware.",
  },
  {
    id: "amina-muaddi-begum",
    brand: "Amina Muaddi",
    title: "Begum 95 Crystal PVC Pumps",
    price: 795,
    currency: "EUR",
    retailer: "Amina Muaddi",
    url: "https://aminamuaddi.com/products/begum-95-pump-clear",
    imageUrl: "https://assets.runwaytwin-demo.com/amina-muaddi-begum.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["zendaya", "gala", "alternate", "heels"],
    description: "Clear stiletto with signature crystal brooch for modern glamour.",
  },
  {
    id: "ralph-lauren-velvet-blazer",
    brand: "Ralph Lauren Collection",
    title: "Velvet Peak-Lapel Evening Blazer",
    price: 1390,
    currency: "EUR",
    retailer: "Ralph Lauren",
    url: "https://www.ralphlauren.eu/en/women-clothing-blazers/velvet-peak-lapel-evening-jacket/613681.html",
    imageUrl: "https://assets.runwaytwin-demo.com/ralph-lauren-velvet-blazer.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["zendaya", "gala", "alternate", "outerwear"],
    description: "Tailored velvet blazer with exaggerated lapels for red-carpet polish.",
  },
  {
    id: "reformation-olena-top",
    brand: "Reformation",
    title: "Olena Silk Corset Top",
    price: 198,
    currency: "EUR",
    retailer: "Reformation",
    url: "https://www.thereformation.com/products/olena-top/1300823.html",
    imageUrl: "https://assets.runwaytwin-demo.com/reformation-olena-top.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["zendaya", "gala", "save", "corset", "pear", "hourglass"],
    description: "Boned silk top that mimics couture structure on a smaller budget.",
  },
  {
    id: "reformation-julietta-skirt",
    brand: "Reformation",
    title: "Julietta Silk Maxi Skirt",
    price: 248,
    currency: "EUR",
    retailer: "Reformation",
    url: "https://www.thereformation.com/products/julietta-skirt/1300714.html",
    imageUrl: "https://assets.runwaytwin-demo.com/reformation-julietta-skirt.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["zendaya", "gala", "save", "column"],
    description: "Bias-cut silk skirt that glides over curves for formal nights.",
  },
  {
    id: "stories-satin-duster",
    brand: "& Other Stories",
    title: "Satin Belted Duster Coat",
    price: 189,
    currency: "EUR",
    retailer: "& Other Stories",
    url: "https://www.stories.com/en_eur/clothing/coats/product.satin-belted-duster-coat-black.1109060001.html",
    imageUrl: "https://assets.runwaytwin-demo.com/stories-satin-duster.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["zendaya", "gala", "save", "outerwear"],
    description: "Fluid satin coat that drapes elegantly over evening looks.",
  },
  {
    id: "schutz-altina-sandal",
    brand: "Schutz",
    title: "Altina Metallic Sandals",
    price: 220,
    currency: "EUR",
    retailer: "Schutz",
    url: "https://global.schutz-shoes.com/products/altina-metallic-sandal-gold",
    imageUrl: "https://assets.runwaytwin-demo.com/schutz-altina-sandal.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["zendaya", "gala", "save", "heels"],
    description: "Strappy metallic heel that elongates the leg line.",
  },
  {
    id: "cult-gaia-eos-clutch",
    brand: "Cult Gaia",
    title: "Eos Box Clutch",
    price: 395,
    currency: "EUR",
    retailer: "Cult Gaia",
    url: "https://cultgaia.com/products/eos-box-clutch-gold",
    imageUrl: "https://assets.runwaytwin-demo.com/cult-gaia-eos-clutch.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["zendaya", "gala", "save", "bag", "clutch"],
    description: "Glossy box clutch with sculptural edges for modern glamour.",
  },
  {
    id: "valentino-divina-gown",
    brand: "Valentino",
    title: "Divina Silk-Crepe One-Shoulder Gown",
    price: 8900,
    currency: "EUR",
    retailer: "Valentino",
    url: "https://www.valentino.com/en-eu/product/divina-one-shoulder-gown",
    imageUrl: "https://assets.runwaytwin-demo.com/valentino-divina-gown.jpg",
    availability: "PreOrder",
    category: "Dress",
    tags: ["zendaya", "gala", "evening", "couture", "dress"],
    description: "Fluid silk-crepe gown with architectural one-shoulder drape and pooled hem.",
  },
  {
    id: "schiaparelli-sculpted-coat",
    brand: "Schiaparelli",
    title: "Sculpted Velvet Opera Coat",
    price: 6400,
    currency: "EUR",
    retailer: "Schiaparelli",
    url: "https://www.schiaparelli.com/en/collection/sculpted-velvet-coat",
    imageUrl: "https://assets.runwaytwin-demo.com/schiaparelli-sculpted-coat.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["zendaya", "gala", "evening", "outerwear", "dramatic"],
    description: "Velvet opera coat with exaggerated collar and satin lining for couture warmth.",
  },
  {
    id: "aquazzura-soiree-pump",
    brand: "Aquazzura",
    title: "Soirée 105 Crystal Sandals",
    price: 850,
    currency: "EUR",
    retailer: "Aquazzura",
    url: "https://www.aquazzura.com/en-eu/soiree-105-crystal-sandals",
    imageUrl: "https://assets.runwaytwin-demo.com/aquazzura-soiree-pump.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["zendaya", "gala", "evening", "heel", "crystal"],
    description: "Strappy crystal-studded sandals that mirror red-carpet polish.",
  },
  {
    id: "bulgari-serpenti-clutch",
    brand: "Bulgari",
    title: "Serpenti Forever Metallic Clutch",
    price: 2350,
    currency: "EUR",
    retailer: "Bulgari",
    url: "https://www.bulgari.com/en-eu/serpenti-forever-metallic-clutch",
    imageUrl: "https://assets.runwaytwin-demo.com/bulgari-serpenti-clutch.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["zendaya", "gala", "evening", "statement", "clutch"],
    description: "Metallic minaudière with signature serpent-head clasp for couture sparkle.",
  },
  {
    id: "reformation-natasha-gown",
    brand: "Reformation",
    title: "Natasha Silk Charmeuse Gown",
    price: 428,
    currency: "EUR",
    retailer: "Reformation",
    url: "https://www.thereformation.com/products/natasha-dress",
    imageUrl: "https://assets.runwaytwin-demo.com/reformation-natasha-gown.jpg",
    availability: "InStock",
    category: "Dress",
    tags: ["zendaya", "gala", "save", "dress"],
    description: "Bias-cut silk gown with draped neckline that nods to red-carpet glamour on a gentler budget.",
  },
  {
    id: "stories-liquid-coat",
    brand: "& Other Stories",
    title: "Liquid Satin Maxi Coat",
    price: 210,
    currency: "EUR",
    retailer: "& Other Stories",
    url: "https://www.stories.com/en_eur/clothing/coats/product.satin-maxi-coat-black.1160982001.html",
    imageUrl: "https://assets.runwaytwin-demo.com/stories-liquid-coat.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["zendaya", "gala", "save", "outerwear"],
    description: "Fluid satin wrap coat that mimics couture drape for accessible drama.",
  },
  {
    id: "aldo-crystal-sandal",
    brand: "ALDO",
    title: "Stessy Crystal Strappy Sandal",
    price: 120,
    currency: "EUR",
    retailer: "Aldo",
    url: "https://www.aldoshoes.com/eu/en/p/stessy-crystal-sandal",
    imageUrl: "https://assets.runwaytwin-demo.com/aldo-crystal-sandal.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["zendaya", "gala", "save", "heels"],
    description: "Crystal-encrusted sandal with slim heel for accessible evening sparkle.",
  },
  {
    id: "olga-berg-lucie-clutch",
    brand: "Olga Berg",
    title: "Lucie Crystal Clutch",
    price: 139,
    currency: "EUR",
    retailer: "Olga Berg",
    url: "https://olgaberg.com/products/lucie-crystal-clutch",
    imageUrl: "https://assets.runwaytwin-demo.com/olga-berg-lucie-clutch.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["zendaya", "gala", "save", "clutch"],
    description: "Box clutch studded with crystals to echo couture shine without the splurge.",
  },
  {
    id: "the-row-wesler",
    brand: "The Row",
    title: "Wesler Merino T-Shirt",
    price: 590,
    currency: "EUR",
    retailer: "Matches",
    url: "https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt",
    imageUrl: "https://assets.runwaytwin-demo.com/the-row-wesler.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["minimal", "jennifer lawrence", "everyday", "top"],
    description: "Fine merino tee with clean lines for elevated basics.",
  },
  {
    id: "khaite-eddie-trouser",
    brand: "Khaite",
    title: "Eddie High-Rise Wool Trousers",
    price: 980,
    currency: "EUR",
    retailer: "Khaite",
    url: "https://khaite.com/products/eddie-trouser-black",
    imageUrl: "https://assets.runwaytwin-demo.com/khaite-eddie-trouser.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["jennifer lawrence", "everyday", "work", "bottom"],
    description: "Fluid pleated trouser that elongates the leg with quiet luxury energy.",
  },
  {
    id: "levis-501",
    brand: "Levi's",
    title: "501 Original Straight Jeans (Indigo)",
    price: 110,
    currency: "EUR",
    retailer: "Levi.com EU",
    url: "https://www.levi.com/NL/en_NL/search?q=501",
    imageUrl: "https://assets.runwaytwin-demo.com/levis-501.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["casual", "jennifer lawrence", "everyday", "denim"],
    description: "Straight-leg denim that anchors minimalist day dressing.",
  },
  {
    id: "the-row-balter-coat",
    brand: "The Row",
    title: "Balder Double-Faced Wool Coat",
    price: 3850,
    currency: "EUR",
    retailer: "The Row",
    url: "https://www.therow.com/en-eu/balder-coat-black",
    imageUrl: "https://assets.runwaytwin-demo.com/the-row-balder-coat.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["jennifer lawrence", "everyday", "work", "outerwear"],
    description: "Oversized double-faced coat that defines Jennifer Lawrence’s polished minimalism.",
  },
  {
    id: "mango-trench",
    brand: "Mango",
    title: "Classic Cotton Trench Coat",
    price: 119.99,
    currency: "EUR",
    retailer: "Mango",
    url: "https://shop.mango.com/nl/dames/jassen/trench-classic",
    imageUrl: "https://assets.runwaytwin-demo.com/mango-trench.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["transitional", "everyday", "outerwear"],
    description: "Belted trench that sharpens casual layers.",
  },
  {
    id: "manolo-bb-70",
    brand: "Manolo Blahnik",
    title: "BB 70 Suede Pumps",
    price: 595,
    currency: "EUR",
    retailer: "Manolo Blahnik",
    url: "https://www.manoloblahnik.com/eu/bb-70-blue-suede-pump-004650.html",
    imageUrl: "https://assets.runwaytwin-demo.com/manolo-bb-70.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["jennifer lawrence", "everyday", "work", "heels"],
    description: "Moderate heel that keeps minimalist looks polished yet wearable.",
  },
  {
    id: "loewe-puzzle-tote",
    brand: "Loewe",
    title: "Puzzle Edge Small Leather Tote",
    price: 3200,
    currency: "EUR",
    retailer: "Loewe",
    url: "https://www.loewe.com/eur/en/women/bags/puzzle-edge-bag-in-classic-calfskin/1990094717.html",
    imageUrl: "https://assets.runwaytwin-demo.com/loewe-puzzle-edge.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["jennifer lawrence", "everyday", "bag", "accessory"],
    description: "Soft-structured tote that keeps the look luxe but practical.",
  },
  {
    id: "toteme-signature-coat",
    brand: "Totême",
    title: "Signature Wool-Blend Coat",
    price: 910,
    currency: "EUR",
    retailer: "Totême",
    url: "https://www.toteme-studio.com/en-eu/signature-coat-beige",
    imageUrl: "https://assets.runwaytwin-demo.com/toteme-signature-coat.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["jennifer lawrence", "everyday", "alternate", "outerwear"],
    description: "Double-faced wool coat with relaxed shoulders for minimalist layering.",
  },
  {
    id: "common-projects-achellea",
    brand: "Common Projects",
    title: "Achilles Low Leather Sneakers",
    price: 410,
    currency: "EUR",
    retailer: "Common Projects",
    url: "https://www.commonprojects.com/collections/women/products/achilles-low-white",
    imageUrl: "https://assets.runwaytwin-demo.com/common-projects-achilles.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["jennifer lawrence", "alternate", "everyday", "shoes"],
    description: "Minimal leather sneaker that keeps the palette polished yet relaxed.",
  },
  {
    id: "arket-merino-tee",
    brand: "ARKET",
    title: "Fine Merino Wool Tee",
    price: 59,
    currency: "EUR",
    retailer: "ARKET",
    url: "https://www.arket.com/en_eur/women/knitwear/product.fine-merino-wool-t-shirt-black.0951435001.html",
    imageUrl: "https://assets.runwaytwin-demo.com/arket-merino-tee.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["jennifer lawrence", "save", "everyday", "top"],
    description: "Lightweight merino tee that mimics The Row’s refined drape.",
  },
  {
    id: "arket-wide-leg-trouser",
    brand: "ARKET",
    title: "Tailored Wide-Leg Trousers",
    price: 89,
    currency: "EUR",
    retailer: "ARKET",
    url: "https://www.arket.com/en_eur/women/trousers/product.wide-leg-trousers-black.0824690002.html",
    imageUrl: "https://assets.runwaytwin-demo.com/arket-wide-leg-trouser.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["jennifer lawrence", "save", "everyday", "bottom"],
    description: "High-rise trouser that streamlines the leg while staying effortless.",
  },
  {
    id: "cos-wool-wrap-coat",
    brand: "COS",
    title: "Wool-Blend Wrap Coat",
    price: 250,
    currency: "EUR",
    retailer: "COS",
    url: "https://www.cos.com/en_eur/women/coats-and-jackets/coats/product.wrap-coat-green.1173699001.html",
    imageUrl: "https://assets.runwaytwin-demo.com/cos-wool-wrap-coat.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["jennifer lawrence", "save", "everyday", "outerwear"],
    description: "Soft wrap coat that mirrors Totême’s drape at a friendlier price.",
  },
  {
    id: "veja-esplar",
    brand: "Veja",
    title: "Esplar Leather Sneakers",
    price: 130,
    currency: "EUR",
    retailer: "Veja",
    url: "https://www.veja-store.com/en-eu/esplar-leather-extra-white",
    imageUrl: "https://assets.runwaytwin-demo.com/veja-esplar.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["jennifer lawrence", "save", "everyday", "sneaker"],
    description: "Clean white sneaker that keeps the silhouette grounded and chic.",
  },
  {
    id: "polene-numero-un",
    brand: "Polène",
    title: "Numéro Un Nano Bag",
    price: 420,
    currency: "EUR",
    retailer: "Polène",
    url: "https://www.polene-paris.com/en/products/numero-un-nano-texture-noir",
    imageUrl: "https://assets.runwaytwin-demo.com/polene-numero-un.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["jennifer lawrence", "save", "everyday", "bag"],
    description: "Mini satchel with sculpted folds that nod to quiet luxury styling.",
  },
  {
    id: "toteme-contour-ribbed-tank",
    brand: "Totême",
    title: "Contour Ribbed Stretch-Knit Tank",
    price: 120,
    currency: "EUR",
    retailer: "Totême",
    url: "https://toteme-studio.com/en-eu/contour-ribbed-tank-black",
    imageUrl: "https://assets.runwaytwin-demo.com/toteme-contour-ribbed-tank.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["hailey bieber", "weekend casual", "top", "hourglass", "pear"],
    description: "Sculpting tank with a squared neckline that sharpens the shoulders.",
  },
  {
    id: "agolde-90s-pinched-jean",
    brand: "AGOLDE",
    title: "90's Pinch Waist Straight-Leg Jeans",
    price: 260,
    currency: "EUR",
    retailer: "AGOLDE",
    url: "https://www.agolde.com/products/90s-pinch-waist-straight-leg-jean-porcelain",
    imageUrl: "https://assets.runwaytwin-demo.com/agolde-90s-pinched-jean.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["hailey bieber", "weekend casual", "bottom", "denim"],
    description: "High-rise straight jean with a pinched waist that lengthens the leg.",
  },
  {
    id: "wardrobe-nyc-double-breasted-coat",
    brand: "WARDROBE.NYC",
    title: "Release 08 Double-Breasted Wool Coat",
    price: 1300,
    currency: "EUR",
    retailer: "WARDROBE.NYC",
    url: "https://wardrobe.nyc/products/release-08-coat-camel",
    imageUrl: "https://assets.runwaytwin-demo.com/wardrobe-nyc-double-breasted-coat.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["hailey bieber", "weekend casual", "outerwear"],
    description: "Structured camel coat with razor-sharp lapels for instant model-off-duty polish.",
  },
  {
    id: "saint-laurent-le-loafer",
    brand: "Saint Laurent",
    title: "Le Loafer Leather Penny Loafers",
    price: 695,
    currency: "EUR",
    retailer: "Saint Laurent",
    url: "https://www.ysl.com/en-eu/le-loafer-leather-penny-loafers-631143AAAAV1000.html",
    imageUrl: "https://assets.runwaytwin-demo.com/saint-laurent-le-loafer.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["hailey bieber", "weekend casual", "shoes"],
    description: "Glossy loafers with an elongated toe to keep the silhouette sleek.",
  },
  {
    id: "bottega-mini-jodie",
    brand: "Bottega Veneta",
    title: "Mini Jodie Knotted Leather Bag",
    price: 2200,
    currency: "EUR",
    retailer: "Bottega Veneta",
    url: "https://www.bottegaveneta.com/en-en/mini-jodie-bag-123180671.html",
    imageUrl: "https://assets.runwaytwin-demo.com/bottega-mini-jodie.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["hailey bieber", "weekend casual", "bag"],
    description: "Signature Intrecciato mini bag that tucks neatly under the arm.",
  },
  {
    id: "autry-medalist-sneaker",
    brand: "Autry",
    title: "Medalist Low Leather Sneakers",
    price: 195,
    currency: "EUR",
    retailer: "Autry",
    url: "https://www.autry-usa.com/products/medalist-low-white-beige",
    imageUrl: "https://assets.runwaytwin-demo.com/autry-medalist-sneaker.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["hailey bieber", "alternate", "weekend casual", "sneaker"],
    description: "Retro court sneaker with subtle panels for low-key street polish.",
  },
  {
    id: "frankie-shop-bea-blazer",
    brand: "The Frankie Shop",
    title: "Bea Oversized Twill Blazer",
    price: 345,
    currency: "EUR",
    retailer: "The Frankie Shop",
    url: "https://thefrankieshop.com/products/bea-blazer-taupe",
    imageUrl: "https://assets.runwaytwin-demo.com/frankie-shop-bea-blazer.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["hailey bieber", "alternate", "weekend casual", "outerwear"],
    description: "Boxy blazer with strong shoulders for Hailey’s signature proportion play.",
  },
  {
    id: "mango-ribbed-tank",
    brand: "Mango",
    title: "Ribbed Knit Tank",
    price: 19.99,
    currency: "EUR",
    retailer: "Mango",
    url: "https://shop.mango.com/en/women/tops-ribbed-tank-top_27093889.html",
    imageUrl: "https://assets.runwaytwin-demo.com/mango-ribbed-tank.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["hailey bieber", "save", "weekend casual", "top"],
    description: "Budget-friendly ribbed tank that still sharpens the shoulder line.",
  },
  {
    id: "levi-ribcage-straight",
    brand: "Levi's",
    title: "Ribcage Straight Ankle Jeans",
    price: 110,
    currency: "EUR",
    retailer: "Levi's",
    url: "https://www.levi.com/US/en_US/apparel/women/jeans/ribcage-straight-ankle-womens-jeans/p/726930008",
    imageUrl: "https://assets.runwaytwin-demo.com/levi-ribcage-straight.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["hailey bieber", "save", "weekend casual", "denim"],
    description: "Ultra-high rise jean that nips the waist and elongates the leg.",
  },
  {
    id: "stories-oversized-wool-coat",
    brand: "& Other Stories",
    title: "Oversized Wool Blend Coat",
    price: 249,
    currency: "EUR",
    retailer: "& Other Stories",
    url: "https://www.stories.com/en_eur/clothing/coats/product.oversized-wool-coat-beige.1113780001.html",
    imageUrl: "https://assets.runwaytwin-demo.com/stories-oversized-wool-coat.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["hailey bieber", "save", "weekend casual", "outerwear"],
    description: "Soft-shouldered coat that mirrors the camel tone at a gentler price.",
  },
  {
    id: "vagabond-ayden-loafer",
    brand: "Vagabond",
    title: "Ayden Leather Loafers",
    price: 120,
    currency: "EUR",
    retailer: "Vagabond",
    url: "https://www.vagabond.com/en/ayden-4732-201-20",
    imageUrl: "https://assets.runwaytwin-demo.com/vagabond-ayden-loafer.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["hailey bieber", "save", "weekend casual", "shoes"],
    description: "Polished loafer with a slim vamp to keep the leg looking long.",
  },
  {
    id: "charles-keith-luna-bag",
    brand: "Charles & Keith",
    title: "Luna Half-Moon Shoulder Bag",
    price: 75,
    currency: "EUR",
    retailer: "Charles & Keith",
    url: "https://www.charleskeith.eu/eu/bags/CK2-20151135-1.html",
    imageUrl: "https://assets.runwaytwin-demo.com/charles-keith-luna-bag.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["hailey bieber", "save", "weekend casual", "bag"],
    description: "Curved shoulder bag that nods to the Mini Jodie silhouette.",
  },
  {
    id: "loewe-origami-gown",
    brand: "Loewe",
    title: "Origami Silk-Satin Gown",
    price: 5200,
    currency: "EUR",
    retailer: "Loewe",
    url: "https://www.loewe.com/en-eu/origami-gown",
    imageUrl: "https://assets.runwaytwin-demo.com/loewe-origami-gown.jpg",
    availability: "PreOrder",
    category: "Dress",
    tags: ["taylor russell", "event", "avant-garde", "dress"],
    description: "Asymmetric silk gown with sculptural folds that mirror Taylor Russell’s fashion-week moments.",
  },
  {
    id: "rick-owens-spiral-top",
    brand: "Rick Owens",
    title: "Spiral-Draped Jersey Top",
    price: 890,
    currency: "EUR",
    retailer: "Rick Owens",
    url: "https://www.rickowens.eu/en/spiral-top",
    imageUrl: "https://assets.runwaytwin-demo.com/rick-owens-spiral-top.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["taylor russell", "event", "top", "sculptural"],
    description: "Architectural jersey top with twisted seams for futuristic structure.",
  },
  {
    id: "balenciaga-sculpted-boot",
    brand: "Balenciaga",
    title: "Knife 110 Satin Boots",
    price: 1395,
    currency: "EUR",
    retailer: "Balenciaga",
    url: "https://www.balenciaga.com/en-eu/knife-satin-boots",
    imageUrl: "https://assets.runwaytwin-demo.com/balenciaga-sculpted-boot.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["taylor russell", "event", "shoes"],
    description: "Ultra-pointed satin boots that elongate the line for avant-garde red carpets.",
  },
  {
    id: "boucheron-quatre-cuff",
    brand: "Boucheron",
    title: "Quatre Radiant Edition Cuff",
    price: 4200,
    currency: "EUR",
    retailer: "Boucheron",
    url: "https://www.boucheron.com/eu/en/quatre-radiant-cuff",
    imageUrl: "https://assets.runwaytwin-demo.com/boucheron-quatre-cuff.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["taylor russell", "event", "statement", "jewelry"],
    description: "Mixed-metal cuff with sculptural lines to echo Taylor’s futuristic glamour.",
  },
  {
    id: "versace-ombre-gown",
    brand: "Versace",
    title: "Ombre Sequinned Column Gown",
    price: 7800,
    currency: "EUR",
    retailer: "Versace",
    url: "https://www.versace.com/en-eu/ombre-sequin-gown",
    imageUrl: "https://assets.runwaytwin-demo.com/versace-ombre-gown.jpg",
    availability: "PreOrder",
    category: "Dress",
    tags: ["blake lively", "gala", "evening", "dress"],
    description: "Gradient sequin gown with corseted waist that channels Blake Lively’s red-carpet playfulness.",
  },
  {
    id: "marchesa-feather-stole",
    brand: "Marchesa",
    title: "Feather-Trimmed Organza Stole",
    price: 1450,
    currency: "EUR",
    retailer: "Marchesa",
    url: "https://www.marchesa.com/en/feather-stole",
    imageUrl: "https://assets.runwaytwin-demo.com/marchesa-feather-stole.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["blake lively", "gala", "outerwear"],
    description: "Sheer organza wrap with feather trim for Upper East Side glamour.",
  },
  {
    id: "louboutin-follies-pump",
    brand: "Christian Louboutin",
    title: "Follies Strass 100 Pumps",
    price: 695,
    currency: "EUR",
    retailer: "Christian Louboutin",
    url: "https://www.christianlouboutin.com/eu_en/follies-strass-100.html",
    imageUrl: "https://assets.runwaytwin-demo.com/louboutin-follies-pump.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["blake lively", "gala", "shoes", "sparkle"],
    description: "Crystal mesh pumps with iconic red sole for playful glamour.",
  },
  {
    id: "judith-leiber-cupcake-clutch",
    brand: "Judith Leiber",
    title: "Cupcake Crystal Clutch",
    price: 4295,
    currency: "EUR",
    retailer: "Judith Leiber",
    url: "https://www.judithleiber.com/products/cupcake-crystal-clutch",
    imageUrl: "https://assets.runwaytwin-demo.com/judith-leiber-cupcake-clutch.jpg",
    availability: "PreOrder",
    category: "Accessories",
    tags: ["blake lively", "gala", "statement", "clutch"],
    description: "Whimsical minaudière dripping in crystals — pure Blake Lively charm.",
  },
  {
    id: "balmain-crystal-bodysuit",
    brand: "Balmain",
    title: "Crystal Mesh Power Bodysuit",
    price: 3200,
    currency: "EUR",
    retailer: "Balmain",
    url: "https://www.balmain.com/en-eu/crystal-bodysuit",
    imageUrl: "https://assets.runwaytwin-demo.com/balmain-crystal-bodysuit.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["beyonce", "performance", "evening", "top"],
    description: "Corseted crystal bodysuit built for Beyoncé-level stage presence.",
  },
  {
    id: "mugler-chainmail-skirt",
    brand: "Mugler",
    title: "Chainmail Draped Skirt",
    price: 2100,
    currency: "EUR",
    retailer: "Mugler",
    url: "https://www.mugler.com/en/chainmail-skirt",
    imageUrl: "https://assets.runwaytwin-demo.com/mugler-chainmail-skirt.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["beyonce", "performance", "evening", "bottom"],
    description: "Silver chainmail skirt with dramatic slit to spotlight powerhouse legs.",
  },
  {
    id: "giuseppe-rossi-platform",
    brand: "Giuseppe Zanotti",
    title: "Bebe Strass Platform Sandals",
    price: 890,
    currency: "EUR",
    retailer: "Giuseppe Zanotti",
    url: "https://www.giuseppezanotti.com/eu/bebe-strass.html",
    imageUrl: "https://assets.runwaytwin-demo.com/giuseppe-rossi-platform.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["beyonce", "performance", "shoes"],
    description: "Sky-high crystal platforms worthy of a Renaissance tour finale.",
  },
  {
    id: "telfar-metallic-bag",
    brand: "Telfar",
    title: "Metallic Small Shopping Bag",
    price: 240,
    currency: "EUR",
    retailer: "Telfar",
    url: "https://shop.telfar.net/collections/shopping-bags/products/metallic-small",
    imageUrl: "https://assets.runwaytwin-demo.com/telfar-metallic-bag.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["beyonce", "performance", "bag"],
    description: "Iridescent Telfar shopping bag for a modern high-low accessory punch.",
  },
  {
    id: "dior-bar-jacket",
    brand: "Dior",
    title: "Bar Jacket in Ecru Wool",
    price: 4200,
    currency: "EUR",
    retailer: "Dior",
    url: "https://www.dior.com/en_eu/bar-jacket",
    imageUrl: "https://assets.runwaytwin-demo.com/dior-bar-jacket.jpg",
    availability: "PreOrder",
    category: "Outerwear",
    tags: ["anya taylor-joy", "evening", "outerwear"],
    description: "Iconic Bar jacket cinched at the waist for Anya’s couture romanticism.",
  },
  {
    id: "rodarte-lace-dress",
    brand: "Rodarte",
    title: "Embellished Lace Tea Dress",
    price: 2650,
    currency: "EUR",
    retailer: "Rodarte",
    url: "https://www.rodarte.net/products/embellished-lace-dress",
    imageUrl: "https://assets.runwaytwin-demo.com/rodarte-lace-dress.jpg",
    availability: "InStock",
    category: "Dress",
    tags: ["anya taylor-joy", "evening", "dress"],
    description: "Victorian-inspired lace dress with pearl beading for ethereal glamour.",
  },
  {
    id: "manolo-satin-mule",
    brand: "Manolo Blahnik",
    title: "Hangisi 90 Satin Mules",
    price: 895,
    currency: "EUR",
    retailer: "Manolo Blahnik",
    url: "https://www.manoloblahnik.com/eu/hangisi-90-mule",
    imageUrl: "https://assets.runwaytwin-demo.com/manolo-satin-mule.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["anya taylor-joy", "evening", "shoes"],
    description: "Crystal-buckle satin mules suited to a modern couture heroine.",
  },
  {
    id: "van-cleef-alhambra-earrings",
    brand: "Van Cleef & Arpels",
    title: "Vintage Alhambra Earrings",
    price: 4200,
    currency: "EUR",
    retailer: "Van Cleef & Arpels",
    url: "https://www.vancleefarpels.com/eu/en/collections/alhambra/vintage-alhambra-earrings.html",
    imageUrl: "https://assets.runwaytwin-demo.com/van-cleef-alhambra-earrings.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["anya taylor-joy", "evening", "jewelry"],
    description: "Iconic mother-of-pearl studs for timeless Old Hollywood sparkle.",
  },
  {
    id: "valentino-pink-gown",
    brand: "Valentino",
    title: "PP Pink Cutout Gown",
    price: 6500,
    currency: "EUR",
    retailer: "Valentino",
    url: "https://www.valentino.com/en-eu/pp-pink-cutout-gown",
    imageUrl: "https://assets.runwaytwin-demo.com/valentino-pink-gown.jpg",
    availability: "InStock",
    category: "Dress",
    tags: ["florence pugh", "gala", "dress"],
    description: "Hot pink column gown with daring cutouts, a Florence Pugh signature.",
  },
  {
    id: "mcqueen-cape-blazer",
    brand: "Alexander McQueen",
    title: "Crepe Cape Blazer",
    price: 2450,
    currency: "EUR",
    retailer: "Alexander McQueen",
    url: "https://www.alexandermcqueen.com/en-eu/crepe-cape-blazer",
    imageUrl: "https://assets.runwaytwin-demo.com/mcqueen-cape-blazer.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["florence pugh", "gala", "outerwear"],
    description: "Structured cape blazer delivering Florence’s bold sculptural drama.",
  },
  {
    id: "gianvito-rossi-plexi-pump",
    brand: "Gianvito Rossi",
    title: "Plexi 105 Pumps",
    price: 620,
    currency: "EUR",
    retailer: "Gianvito Rossi",
    url: "https://www.gianvitorossi.com/eu_en/plexi-105.html",
    imageUrl: "https://assets.runwaytwin-demo.com/gianvito-rossi-plexi-pump.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["florence pugh", "gala", "shoes"],
    description: "PVC-trimmed pumps that balance daring gowns with sleek polish.",
  },
  {
    id: "haider-ackermann-silk-blazer",
    brand: "Haider Ackermann",
    title: "Silk Satin Tuxedo Jacket",
    price: 3100,
    currency: "EUR",
    retailer: "Haider Ackermann",
    url: "https://haiderackermann.eu/silk-satin-tuxedo",
    imageUrl: "https://assets.runwaytwin-demo.com/haider-ackermann-silk-blazer.jpg",
    availability: "InStock",
    category: "Outerwear",
    tags: ["timothée chalamet", "evening", "outerwear"],
    description: "Fluid tuxedo jacket with razor lapels for Timothée’s gender-fluid tailoring.",
  },
  {
    id: "prada-sequin-tank",
    brand: "Prada",
    title: "Sequin Satin Tank",
    price: 980,
    currency: "EUR",
    retailer: "Prada",
    url: "https://www.prada.com/en/sequin-satin-top",
    imageUrl: "https://assets.runwaytwin-demo.com/prada-sequin-tank.jpg",
    availability: "InStock",
    category: "Top",
    tags: ["timothée chalamet", "evening", "top", "unisex"],
    description: "Slinky sequin tank that riffs on Timothée’s fearless red-carpet moves.",
  },
  {
    id: "saint-laurent-tapered-trouser",
    brand: "Saint Laurent",
    title: "Tapered Wool Trousers",
    price: 890,
    currency: "EUR",
    retailer: "Saint Laurent",
    url: "https://www.ysl.com/en-eu/tapered-wool-trousers",
    imageUrl: "https://assets.runwaytwin-demo.com/saint-laurent-tapered-trouser.jpg",
    availability: "InStock",
    category: "Bottom",
    tags: ["timothée chalamet", "evening", "bottom"],
    description: "Slim wool trousers that balance embellished tops with French precision.",
  },
  {
    id: "rick-owens-kiss-boot",
    brand: "Rick Owens",
    title: "Kiss 130 Platform Boots",
    price: 1200,
    currency: "EUR",
    retailer: "Rick Owens",
    url: "https://www.rickowens.eu/en/kiss-platform-boots",
    imageUrl: "https://assets.runwaytwin-demo.com/rick-owens-kiss-boot.jpg",
    availability: "InStock",
    category: "Shoes",
    tags: ["timothée chalamet", "evening", "shoes"],
    description: "Signature platforms that give rockstar lift to fluid tailoring.",
  },
  {
    id: "cartier-panthere-ring",
    brand: "Cartier",
    title: "Panthère Onyx Ring",
    price: 7600,
    currency: "EUR",
    retailer: "Cartier",
    url: "https://www.cartier.com/en-eu/panthere-onyx-ring",
    imageUrl: "https://assets.runwaytwin-demo.com/cartier-panthere-ring.jpg",
    availability: "InStock",
    category: "Accessories",
    tags: ["timothée chalamet", "evening", "jewelry"],
    description: "Statement ring to punctuate Timothée’s polished-meets-punk vibe.",
  },
];
const demoAdapter: ProductAdapter = {
  name: "demoAdapter",
  async searchProducts(params: SearchProductsArgs): Promise<Product[]> {
    const q = (params.query || "").toLowerCase();
    const limit = clampLimit(params.limit);
    if (!q) return DEMO_DATA.slice(0, limit);
    const tokens = q.split(/\s+/).filter(Boolean);

    const scored = DEMO_DATA.map((p) => {
      const hay = `${p.brand} ${p.title} ${p.retailer}`.toLowerCase();
      const tags = (p.tags || []).map((t) => t.toLowerCase());
      const category = (p.category || "").toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (!token) continue;
        if (hay.includes(token)) score += 2;
        if (category.includes(token)) score += 1.5;
        if (tags.some((t) => t.includes(token))) score += 4;
        if (["gala", "red", "carpet"].includes(token) && tags.includes("gala")) {
          score += 6;
        }
        if (["evening", "cocktail"].includes(token) && tags.includes("evening")) {
          score += 4;
        }
        if (["everyday", "casual", "day"].includes(token) && tags.includes("everyday")) {
          score += 3;
        }
        if (["hourglass", "pear", "apple", "rectangle"].includes(token)) {
          if (tags.some((tag) => tag.includes(token))) score += 2;
        }
        if (
          [
            "zendaya",
            "jennifer",
            "lawrence",
            "blake",
            "lively",
            "hailey",
            "bieber",
            "taylor",
            "russell",
            "beyonce",
            "rihanna",
            "anya",
            "taylor-joy",
            "joy",
            "florence",
            "pugh",
            "timothee",
            "timothée",
            "chalamet",
          ].includes(token)
        ) {
          if (tags.some((tag) => tag.includes(token))) score += 5;
        }
      }
      return {
        product: p,
        score,
        region: scoreByRegion(p.url, params.preferEU),
      };
    });

    const filtered = scored
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.region - a.region;
      })
      .map((entry) => entry.product);

    const base = filtered.length ? filtered : DEMO_DATA;
    return base.slice(0, limit);
  },
  async checkStock(productIdOrUrl: string) {
    const hit = DEMO_DATA.find((p) => p.id === productIdOrUrl || p.url === productIdOrUrl);
    return { availability: hit?.availability ?? null };
  },
  async affiliateLink(url: string) { return url; },
};

/* =========================
 * webAdapter (DuckDuckGo → PDP → JSON-LD)
 * ========================= */
const UA = "Mozilla/5.0 (compatible; RunwayTwinBot/1.0)";
async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" } });
    if (!res.ok) return null;
    const html = await res.text();
    return html && html.length > 200 ? html : null;
  } catch { return null; }
}
async function searchViaDuckDuckGo(query: string, preferEU?: boolean): Promise<string[]> {
  const q = encodeURIComponent(`${query} site:(.com|.eu|.co|.de|.fr|.it|.es|.nl)`);
  const url = `https://duckduckgo.com/html/?q=${q}`;
  const html = await tryFetch(url);
  if (!html) return [];
  const out: string[] = [];
  const rx = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) {
    try {
      const u = new URL(m[1]);
      if (!/^https?:$/.test(u.protocol)) continue;
      out.push(u.toString());
      if (out.length >= 12) break;
    } catch {}
  }
  return out.map((u) => ({ u, s: scoreByRegion(u, preferEU) }))
    .sort((a, b) => b.s - a.s).map((x) => x.u);
}
async function extractProductFromHtml(url: string, html: string): Promise<Product | null> {
  const blocks = extractJsonLd(html);
  for (const b of blocks) {
    const prod = normalizeProductFromJsonLd(url, b);
    if (prod && prod.title) return prod;
  }
  const partial = scrapeMinimalFromHtml(url, html);
  if (partial.title) {
    return {
      id: partial.url || url,
      brand: partial.brand || "",
      title: partial.title!,
      price: null, currency: null,
      retailer: partial.url ? new URL(partial.url).hostname.replace(/^www\./, "") : null,
      url, imageUrl: partial.imageUrl || null, availability: null,
    };
  }
  return null;
}
const webAdapter: ProductAdapter = {
  name: "webAdapter",
  async searchProducts(params: SearchProductsArgs): Promise<Product[]> {
    const query = (params.query || "").trim();
    const limit = clampLimit(params.limit);
    if (!query) return [];
    const candidates = await searchViaDuckDuckGo(query, params.preferEU);
    if (!candidates.length) return [];
    const out: Product[] = [];
    for (const href of candidates.slice(0, 12)) {
      const html = await tryFetch(href);
      if (!html) continue;
      const prod = await extractProductFromHtml(href, html);
      if (!prod) continue;
      if (!prod.brand && prod.title) {
        const guess = prod.title.split("—")[0].split("-")[0].trim();
        if (guess && guess.length <= 24) prod.brand = guess;
      }
      out.push(prod);
      if (out.length >= limit) break;
    }
    return uniqBy(out, (p) => p.url)
      .map((p) => ({ p, s: scoreByRegion(p.url, params.preferEU) }))
      .sort((a, b) => b.s - a.s).map((x) => x.p)
      .slice(0, limit);
  },
  async affiliateLink(url: string) { return url; },
};

/* =========================
 * Adapter registry
 * ========================= */
const ADAPTERS: ProductAdapter[] = [webAdapter, demoAdapter];

/* =========================
 * Public API (imported by route.ts)
 * ========================= */
export async function searchProducts(params: SearchProductsArgs): Promise<Product[]> {
  const limit = clampLimit(params.limit);
  const safe: SearchProductsArgs = { ...params, limit };
  const collected: Product[] = [];

  for (const adapter of ADAPTERS) {
    try {
      const res = await adapter.searchProducts(safe);
      if (res?.length) {
        // Keep a light cap per adapter so we don't overwhelm the caller while still
        // letting multiple sources contribute candidates for styling heuristics.
        const cap = Math.max(limit, 6);
        collected.push(...res.slice(0, cap));
      }
    } catch (e: any) {
      console.warn(`[tools] ${adapter.name}.searchProducts failed:`, e?.message);
    }
  }

  if (!collected.length) return [];

  return uniqBy(collected, (p) => p.url)
    .map((p) => ({ p, s: scoreByRegion(p.url, params.preferEU) }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.p)
    .slice(0, limit);
}
export async function checkStock(productIdOrUrl: string, country?: string) {
  for (const a of ADAPTERS) {
    if (!a.checkStock) continue;
    try {
      const r = await a.checkStock(productIdOrUrl, country);
      if (r && typeof r.availability === "string") return r;
    } catch (e: any) {
      console.warn(`[tools] ${a.name}.checkStock failed:`, e?.message);
    }
  }
  return { availability: null };
}
export async function affiliateLink(url: string, retailer?: string | null) {
  for (const a of ADAPTERS) {
    if (!a.affiliateLink) continue;
    try {
      const r = await a.affiliateLink(url, retailer ?? null);
      if (r) return r;
    } catch (e: any) {
      console.warn(`[tools] ${a.name}.affiliateLink failed:`, e?.message);
    }
  }
  return url;
}

/* =========================
 * FX conversion (static, Edge-safe)
 * ========================= */
const FX: Record<string, number> = { EUR: 1, USD: 1.07, GBP: 0.84 };
export function fxConvert(amount: number, from: string, to: string) {
  const f = FX[from?.toUpperCase()] ?? 1;
  const t = FX[to?.toUpperCase()] ?? 1;
  return Math.round((amount / f) * t * 100) / 100;
}

export function getCatalogProductById(id: string): Product | undefined {
  return DEMO_DATA.find((p) => p.id === id);
}
