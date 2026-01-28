// FILE: lib/scrape/productParse.ts
import { cleanText } from "@/lib/scrape/http";

export type ParsedProduct = {
  title: string;
  url: string;
  image?: string;
  brand?: string;
  price?: number;
  currency?: string;
};

function firstString(x: unknown): string | undefined {
  if (typeof x === "string" && x.trim()) return x.trim();
  if (Array.isArray(x)) {
    for (const v of x) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return undefined;
}

function asNumber(x: unknown): number | undefined {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function extractMeta(html: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  return m?.[1] ? cleanText(m[1]) : undefined;
}

function extractJsonLdBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[1] ?? "").trim();
    if (raw) blocks.push(raw);
  }
  return blocks;
}

function* iterJsonObjects(value: unknown): Generator<Record<string, unknown>> {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const v of value) yield* iterJsonObjects(v);
    return;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    yield obj;
    if (Array.isArray(obj["@graph"])) {
      for (const v of obj["@graph"] as unknown[]) yield* iterJsonObjects(v);
    }
  }
}

function isProductType(t: unknown): boolean {
  if (typeof t === "string") return t.toLowerCase() === "product";
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && x.toLowerCase() === "product");
  return false;
}

export function parseProductPage(html: string, url: string): ParsedProduct | null {
  const ogTitle = extractMeta(html, "og:title");
  const ogImage = extractMeta(html, "og:image");

  const ldBlocks = extractJsonLdBlocks(html);
  for (const block of ldBlocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }

    for (const obj of iterJsonObjects(parsed)) {
      if (!isProductType(obj["@type"])) continue;

      const name = firstString(obj["name"]);
      const image = firstString(obj["image"]) ?? ogImage;
      const brandObj = obj["brand"];
      const brand =
        typeof brandObj === "string"
          ? cleanText(brandObj)
          : typeof brandObj === "object" && brandObj !== null
          ? firstString((brandObj as Record<string, unknown>)["name"])
          : undefined;

      let price: number | undefined;
      let currency: string | undefined;

      const offers = obj["offers"];
      if (offers && typeof offers === "object") {
        const offersObj = offers as Record<string, unknown>;
        price =
          asNumber(offersObj["price"]) ??
          asNumber((offersObj["lowPrice"] ?? offersObj["highPrice"]) as unknown);
        currency = firstString(offersObj["priceCurrency"]);
      } else if (Array.isArray(offers)) {
        for (const o of offers) {
          if (!o || typeof o !== "object") continue;
          const offersObj = o as Record<string, unknown>;
          price = asNumber(offersObj["price"]);
          currency = firstString(offersObj["priceCurrency"]);
          if (typeof price === "number") break;
        }
      }

      const title = cleanText(name ?? ogTitle ?? "");
      if (!title) continue;

      return {
        title,
        url,
        image,
        brand,
        price,
        currency,
      };
    }
  }

  // Fallback meta-only
  const title = cleanText(ogTitle ?? "");
  if (!title) return null;

  return {
    title,
    url,
    image: ogImage,
  };
}
