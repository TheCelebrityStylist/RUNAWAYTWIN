// FILE: lib/scrape/sources/hm.ts
import * as cheerio from "cheerio";
import type { Product } from "@/lib/affiliates/types";
import { absolutizeUrl, cleanText, fetchText } from "@/lib/scrape/http";

type HmMarket = "en_gb" | "en_us" | "en_nl" | "en_de" | "en_fr";

function marketForCountry(country?: string): HmMarket {
  const c = (country ?? "NL").toUpperCase();
  if (c === "US") return "en_us";
  if (c === "GB" || c === "UK") return "en_gb";
  if (c === "DE") return "en_de";
  if (c === "FR") return "en_fr";
  return "en_nl";
}

function currencyForCountry(country?: string): string {
  const c = (country ?? "NL").toUpperCase();
  if (c === "US") return "USD";
  if (c === "GB" || c === "UK") return "GBP";
  return "EUR";
}

function parsePriceNumber(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const t = raw.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
    const v = Number.parseFloat(t);
    return Number.isFinite(v) ? v : undefined;
  }
  return undefined;
}

function ldJsonObjects($: cheerio.CheerioAPI): unknown[] {
  const out: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).text();
    if (!txt) return;
    try {
      const parsed = JSON.parse(txt) as unknown;
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      // ignore
    }
  });
  return out;
}

function* walkLdJson(node: unknown): Generator<Record<string, unknown>> {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  if (typeof obj["@type"] === "string") yield obj;

  for (const v of Object.values(obj)) {
    if (Array.isArray(v)) {
      for (const item of v) yield* walkLdJson(item);
    } else if (v && typeof v === "object") {
      yield* walkLdJson(v);
    }
  }
}

function pickBrand(x: Record<string, unknown>): string | undefined {
  const b = x["brand"];
  if (typeof b === "string") return cleanText(b);
  if (b && typeof b === "object") {
    const o = b as Record<string, unknown>;
    if (typeof o["name"] === "string") return cleanText(o["name"]);
  }
  return undefined;
}

function pickImage(x: Record<string, unknown>): string | undefined {
  const img = x["image"];
  if (typeof img === "string") return img;
  if (Array.isArray(img) && typeof img[0] === "string") return img[0] as string;
  return undefined;
}

export async function scrapeHmProducts(params: {
  query: string;
  country?: string;
  limit: number;
}): Promise<Product[]> {
  const { query, country, limit } = params;

  const market = marketForCountry(country);
  const base = `https://www2.hm.com/${market}/search-results.html`;
  const url = new URL(base);
  url.searchParams.set("q", query);

  const html = await fetchText(url.toString(), { timeoutMs: 12_000, noStore: true });
  if (!html) return [];

  const $ = cheerio.load(html);
  const currency = currencyForCountry(country);

  const nodes = ldJsonObjects($);
  const products: Product[] = [];
  const seen = new Set<string>();

  for (const top of nodes) {
    for (const node of walkLdJson(top)) {
      if (node["@type"] !== "Product") continue;

      const name = typeof node["name"] === "string" ? cleanText(node["name"]) : "";
      const relUrl = typeof node["url"] === "string" ? node["url"] : "";
      const absUrl = relUrl ? absolutizeUrl("https://www2.hm.com", relUrl) : null;

      if (!name || !absUrl) continue;
      if (seen.has(absUrl)) continue;
      seen.add(absUrl);

      const brand = pickBrand(node);
      const image = pickImage(node);

      let price: number | undefined;
      const offers = node["offers"];
      if (offers && typeof offers === "object" && !Array.isArray(offers)) {
        const o = offers as Record<string, unknown>;
        price = parsePriceNumber(o["price"]);
      } else if (Array.isArray(offers) && offers[0] && typeof offers[0] === "object") {
        const o = offers[0] as Record<string, unknown>;
        price = parsePriceNumber(o["price"]);
      }

      products.push({
        id: `hm:${absUrl}`,
        title: name,
        brand: brand ?? "H&M",
        retailer: "hm",
        url: absUrl,
        image,
        price,
        currency,
        availability: "unknown",
        fit: { category: guessCategory(name) },
      });

      if (products.length >= limit) break;
    }
    if (products.length >= limit) break;
  }

  // Fallback: parse product tiles if LD+JSON changes
  if (products.length === 0) {
    const tiles: Product[] = [];
    const tileSeen = new Set<string>();

    $("a[href*='/productpage.']").each((_, el) => {
      if (tiles.length >= limit) return;

      const href = $(el).attr("href") ?? "";
      const abs = href ? absolutizeUrl("https://www2.hm.com", href) : null;
      if (!abs) return;
      if (tileSeen.has(abs)) return;
      tileSeen.add(abs);

      const title = cleanText($(el).text() || "");
      if (!title) return;

      const img =
        $(el).find("img").attr("src") ??
        $(el).find("img").attr("data-src") ??
        $(el).find("img").attr("data-original") ??
        undefined;

      tiles.push({
        id: `hm:${abs}`,
        title,
        brand: "H&M",
        retailer: "hm",
        url: abs,
        image: img,
        currency,
        availability: "unknown",
        fit: { category: guessCategory(title) },
      });
    });

    return tiles;
  }

  return products;
}

function guessCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\bboot|\bshoe|\bsneaker|\bheel/.test(t)) return "shoes";
  if (/\bcoat|\btrench|\bjacket|\bblazer|\bouterwear/.test(t)) return "outerwear";
  if (/\bdress/.test(t)) return "dress";
  if (/\btrouser|\bpant|\bjean|\bskirt|\bdenim/.test(t)) return "bottom";
  if (/\bshirt|\btee|\btop|\bblouse|\bknit|\bsweater/.test(t)) return "top";
  if (/\bbag|\btote|\bshoulder bag|\bcrossbody/.test(t)) return "bag";
  return "accessory";
}
