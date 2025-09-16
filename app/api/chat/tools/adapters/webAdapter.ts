// app/api/chat/tools/adapters/webAdapter.ts
import type {
  AdapterProduct,
  SearchProductsArgs,
  ToolAdapter,
  ToolContext,
} from "../index";

const WEB_SOURCE = "web";
const USER_AGENT =
  "RunwayTwinBot/1.0 (+https://runwaytwin.app/tools; contact@runwaytwin.app)";

export const webAdapter: ToolAdapter = {
  id: WEB_SOURCE,
  async searchProducts(args: SearchProductsArgs, ctx: ToolContext) {
    const started = Date.now();
    const candidateUrl = pickUrlCandidate(args);
    if (!candidateUrl) return null;

    try {
      const fetcher = ctx.fetch || fetch;
      const res = await fetcher(candidateUrl, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          ...(ctx.headers || {}),
        },
        signal: ctx.signal,
      });

      if (!res.ok) {
        return {
          items: [],
          source: WEB_SOURCE,
          latency: Date.now() - started,
          meta: { status: res.status, url: candidateUrl },
        };
      }

      const html = await res.text();
      const doc = parseHtml(html);
      const jsonLdNodes = extractJsonLd(doc, html);
      let product = extractProduct(jsonLdNodes, candidateUrl);
      if (!product) {
        product = extractFromHtml(doc, candidateUrl);
      }
      if (product) {
        if (!product.url) product.url = candidateUrl;
        if (!product.retailer) product.retailer = retailerFromUrl(candidateUrl) || undefined;
      }

      return {
        items: product ? [product] : [],
        source: WEB_SOURCE,
        latency: Date.now() - started,
        meta: { url: candidateUrl, jsonLd: jsonLdNodes.length },
      };
    } catch (err: any) {
      return {
        items: [],
        source: WEB_SOURCE,
        latency: Date.now() - started,
        meta: { url: candidateUrl, error: err?.message || "fetch failed" },
      };
    }
  },
};

function pickUrlCandidate(args: SearchProductsArgs): string | null {
  const direct = typeof args.url === "string" && args.url.trim();
  if (direct && isLikelyUrl(direct)) return direct;
  const q = typeof args.query === "string" ? args.query.trim() : "";
  if (q && isLikelyUrl(q)) return q;
  return null;
}

function isLikelyUrl(candidate: string) {
  try {
    const parsed = new URL(candidate);
    return Boolean(parsed.protocol && parsed.hostname);
  } catch {
    return false;
  }
}

function parseHtml(html: string): Document | null {
  if (typeof DOMParser === "undefined") return null;
  try {
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html");
  } catch {
    return null;
  }
}

function extractJsonLd(doc: Document | null, html: string): any[] {
  const scripts: string[] = [];
  if (doc) {
    const nodes = Array.from(
      doc.querySelectorAll('script[type="application/ld+json"]')
    );
    for (const node of nodes) {
      const text = node.textContent || node.innerHTML || "";
      if (text.trim()) scripts.push(text.trim());
    }
  } else {
    const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html))) {
      if (match[1] && match[1].trim()) scripts.push(match[1].trim());
    }
  }

  const parsed: any[] = [];
  for (const script of scripts) {
    const node = safeJsonParse(script);
    if (node != null) parsed.push(node);
  }
  return parsed;
}

function extractProduct(nodes: any[], fallbackUrl: string): AdapterProduct | null {
  const queue = [...nodes];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (typeof current !== "object") continue;

    const type = (current as any)["@type"];
    const types = Array.isArray(type) ? type : type ? [type] : [];
    if (types.some((t) => typeof t === "string" && /product/i.test(t))) {
      return mapProductNode(current, fallbackUrl);
    }

    if (current["@graph"]) queue.push(current["@graph"]);
    if (current.itemListElement) queue.push(current.itemListElement);
    if (current.mainEntity) queue.push(current.mainEntity);
  }
  return null;
}

function mapProductNode(node: any, fallbackUrl: string): AdapterProduct {
  const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
  const offerSpec = offers?.priceSpecification || offers?.priceSpecifications;
  const seller = offers?.seller || node.seller;
  const image = Array.isArray(node.image) ? node.image[0] : node.image;
  const price =
    offers?.price ??
    offerSpec?.price ??
    node.price ??
    node.priceAmount ??
    node.priceValue;
  const priceCurrency =
    offers?.priceCurrency ??
    offerSpec?.priceCurrency ??
    node.priceCurrency;
  const availability = offers?.availability || node.availability;

  return {
    id: node.sku || node.productID || node["@id"],
    sku: node.sku,
    brand: node.brand,
    title: node.name || node.title,
    description: node.description,
    price,
    priceCurrency,
    currency: priceCurrency,
    seller,
    retailer: seller?.name || seller,
    image,
    url: node.url || fallbackUrl,
    availability,
    inStock: typeof availability === "string" ? /instock|in stock/i.test(availability) : undefined,
    colors: node.color,
    sizes: node.size || node.sizes,
  } as AdapterProduct;
}

function extractFromHtml(doc: Document | null, url: string): AdapterProduct | null {
  if (!doc) return null;

  const title = getText(doc, [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    "title",
    "h1",
  ]);
  if (!title) return null;

  const image = getAttr(doc, [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'link[rel="image_src"]',
  ]);

  const price = getAttr(doc, [
    'meta[property="product:price:amount"]',
    "[itemprop=price]",
    'meta[name="twitter:data1"]',
  ]);

  const currency = getAttr(doc, [
    'meta[property="product:price:currency"]',
    "[itemprop=priceCurrency]",
  ]);

  const brand = getAttr(doc, [
    "[itemprop=brand]",
    'meta[property="og:site_name"]',
  ]) ||
    getText(doc, [".product-brand", ".brand", "[data-brand]"]);

  const availability =
    getAttr(doc, ["[itemprop=availability]"]) ||
    getText(doc, [".availability", ".stock", "[data-stock-status]"]);

  return {
    title,
    image,
    price,
    currency,
    brand,
    availability,
    retailer: retailerFromUrl(url) || undefined,
    url,
  } as AdapterProduct;
}

function getAttr(doc: Document, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (!el) continue;
    const attr = el.getAttribute("content") || el.getAttribute("data-price") || el.getAttribute("value");
    if (attr && attr.trim()) return attr.trim();
    if (typeof HTMLMetaElement !== "undefined" && el instanceof HTMLMetaElement && el.content)
      return el.content.trim();
    if (typeof HTMLImageElement !== "undefined" && el instanceof HTMLImageElement && el.src)
      return el.src.trim();
    if (typeof HTMLAnchorElement !== "undefined" && el instanceof HTMLAnchorElement && el.href)
      return el.href.trim();
    if (el.textContent && el.textContent.trim()) return el.textContent.trim();
  }
  return undefined;
}

function getText(doc: Document, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (!el) continue;
    const content = el.getAttribute("content") || el.textContent;
    if (content && content.trim()) return content.trim();
  }
  return undefined;
}

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    try {
      const sanitized = text
        .trim()
        .replace(/^[^(\[{]*([\[{])/, "$1")
        .replace(/([\]\}])[^\]\}]*$/, "$1");
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

function retailerFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}
