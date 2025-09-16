import { ensureAbsoluteUrl, normalizeProductUrl } from "./url";

export type JsonLdProduct = {
  name?: string;
  description?: string;
  brand?: string | { name?: string } | { '@type'?: string; name?: string };
  image?: string | string[];
  offers?: any;
  sku?: string;
  gtin13?: string;
  url?: string;
  category?: string;
  color?: string;
};

export type NormalizedOffer = {
  price: number | null;
  currency: string | null;
  availability?: string | null;
  url?: string | null;
  seller?: string | null;
};

export type NormalizedProduct = {
  name: string;
  brand: string | null;
  description?: string | null;
  image?: string | null;
  url?: string | null;
  price: number | null;
  currency: string | null;
  availability?: string | null;
  seller?: string | null;
  sku?: string | null;
  category?: string | null;
  color?: string | null;
};

const JSONLD_RE = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

export function extractJsonLdBlocks(html: string): any[] {
  const blocks: any[] = [];
  let match: RegExpExecArray | null;
  while ((match = JSONLD_RE.exec(html))) {
    const raw = match[1]
      .replace(/<!--([\s\S]*?)-->/g, "")
      .replace(/<\/(script|SCRIPT)>/g, "");
    try {
      const parsed = JSON.parse(raw.trim());
      blocks.push(parsed);
    } catch {
      // ignore parsing errors
    }
  }
  return blocks;
}

function flattenGraph(node: any): any[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(flattenGraph);
  if (node['@graph']) return flattenGraph(node['@graph']);
  if (node['@type'] === 'ItemList' && Array.isArray(node.itemListElement)) {
    return node.itemListElement.flatMap((it: any) => flattenGraph(it.item || it));
  }
  return [node];
}

function resolveBrand(brand: JsonLdProduct['brand']): string | null {
  if (!brand) return null;
  if (typeof brand === 'string') return brand;
  if (typeof brand === 'object') {
    if ('name' in brand && typeof brand.name === 'string') return brand.name;
  }
  return null;
}

function normalizeOffer(offer: any): NormalizedOffer {
  if (!offer) return { price: null, currency: null };
  const source = Array.isArray(offer) ? offer[0] : offer;
  const priceRaw = typeof source.price === 'number' ? source.price : Number(source.price);
  const price = Number.isFinite(priceRaw) ? Number(priceRaw) : null;
  const currency = source.priceCurrency || (typeof source.priceCurrency === 'string' ? source.priceCurrency : null);
  const availability = source.availability || source.itemAvailability || null;
  const seller = typeof source.seller === 'string'
    ? source.seller
    : source.seller?.name || null;
  const url = source.url || source.offerUrl || null;
  return { price, currency: currency || null, availability: availability || null, url: url || null, seller };
}

export function extractProductsFromJsonLd(html: string): NormalizedProduct[] {
  const blocks = extractJsonLdBlocks(html);
  const nodes = blocks.flatMap(flattenGraph);
  const products: NormalizedProduct[] = [];

  for (const node of nodes) {
    const type = node['@type'];
    if (!type) continue;
    const typeList = Array.isArray(type) ? type : [type];
    if (!typeList.some((t) => typeof t === 'string' && t.toLowerCase().includes('product'))) continue;

    const product = node as JsonLdProduct;
    const offer = normalizeOffer((product as any).offers);
    const imageValue = Array.isArray(product.image) ? product.image[0] : product.image;

    const normalized: NormalizedProduct = {
      name: product.name || '',
      brand: resolveBrand(product.brand),
      description: product.description || null,
      image: imageValue ? ensureAbsoluteUrl(imageValue) : null,
      url: product.url ? normalizeProductUrl(product.url) : null,
      price: offer.price,
      currency: offer.currency,
      availability: offer.availability || null,
      seller: offer.seller || null,
      sku: product.sku || (product as any).mpn || product.gtin13 || null,
      category: product.category || (product as any).itemCategory || null,
      color: product.color || null,
    };

    if (offer.url && !normalized.url) {
      normalized.url = normalizeProductUrl(offer.url);
    }

    products.push(normalized);
  }

  return products;
}
