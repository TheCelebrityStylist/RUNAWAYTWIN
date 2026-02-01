// FILE: lib/affiliates/validate.ts
import type { Category, Product } from "@/lib/affiliates/types";

export type StrictProduct = {
  id: string;
  brand: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  affiliate_url: string;
  retailer: string;
  availability: string;
  category: Category;
  url: string;
};

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function validUrl(x: unknown): string | null {
  if (!isNonEmptyString(x)) return null;
  try {
    const u = new URL(x);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.pathname === "/" || u.pathname.trim() === "") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function normalizeCurrency(x: unknown): string | null {
  if (!isNonEmptyString(x)) return null;
  const cur = x.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(cur)) return null;
  return cur;
}

function normalizeRetailer(x: unknown, url: string): string | null {
  if (isNonEmptyString(x)) {
    const v = x.trim();
    if (v.includes(":") && !v.includes(".")) return v; // allow provider-tagged retailers like awin:123
    if (v.includes(".")) return v.replace(/^www\./, "").toLowerCase();
    return v.toLowerCase();
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function retailerMatchesUrl(retailer: string, url: string): boolean {
  if (!retailer.includes(".")) return true;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const r = retailer.replace(/^www\./, "").toLowerCase();
    return host === r || host.endsWith(`.${r}`);
  } catch {
    return false;
  }
}

export function toStrictProduct(p: Product): StrictProduct | null {
  const id = isNonEmptyString(p.id) ? p.id : null;
  const title = isNonEmptyString(p.title) ? p.title.trim() : null;
  const brand = isNonEmptyString(p.brand) ? p.brand.trim() : null;
  const price =
    typeof p.price === "number" && Number.isFinite(p.price) && p.price > 0 ? p.price : null;
  const currency = normalizeCurrency(p.currency);
  const url = validUrl(p.url);
  const affiliate = validUrl(p.affiliate_url ?? p.url);
  const image = validUrl(p.image);
  const availability = isNonEmptyString(p.availability) ? p.availability.trim() : null;
  const category = p.fit?.category ?? p.category ?? null;

  if (!id || !title || !brand || !price || !currency || !url || !affiliate || !image) return null;
  if (!availability || !category) return null;

  const retailer = normalizeRetailer(p.retailer, url);
  if (!retailer) return null;
  if (!retailerMatchesUrl(retailer, affiliate)) return null;

  return {
    id,
    title,
    brand,
    price,
    currency,
    image,
    affiliate_url: affiliate,
    retailer,
    availability,
    category,
    url,
  };
}
