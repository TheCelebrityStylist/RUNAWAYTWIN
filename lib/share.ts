// FILE: lib/share.ts
// Encode/Decode selected products to a compact share code (URL-safe base64)
// Uses your Product type. We only store the minimal fields needed for sharing.

import type { Product, Category } from "@/lib/affiliates/types";

/** URL-safe base64 helpers */
function toB64(json: string) {
  return Buffer.from(json, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function fromB64(b64: string) {
  const pad = b64.length % 4 ? "====".slice(b64.length % 4) : "";
  const s = b64.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(s, "base64").toString("utf-8");
}

/** Minimal shape kept in share payload (keeps URLs short) */
type Tiny = {
  id: string;
  title: string;
  url: string;
  brand?: string;
  retailer?: string;
  image?: string;
  price?: number;
  currency?: string;
  fit?: { category?: Category };
};

function normalizeCategory(value: unknown): Category | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.toLowerCase();
  if (raw.includes("shoe") || raw.includes("sneaker") || raw.includes("boot") || raw.includes("heel"))
    return "Shoes";
  if (raw.includes("dress")) return "Dress";
  if (raw.includes("trouser") || raw.includes("pants") || raw.includes("jean") || raw.includes("skirt"))
    return "Bottom";
  if (raw.includes("coat") || raw.includes("jacket") || raw.includes("trench") || raw.includes("blazer"))
    return "Outerwear";
  if (raw.includes("bag") || raw.includes("handbag")) return "Bag";
  if (raw.includes("shirt") || raw.includes("tee") || raw.includes("top") || raw.includes("blouse") || raw.includes("knit"))
    return "Top";
  if (raw.includes("accessory")) return "Accessory";
  return undefined;
}

function sanitize(p: Product): Tiny | null {
  if (!p || typeof p !== "object") return null;
  const title = typeof p.title === "string" ? p.title : "";
  const url = typeof p.url === "string" ? p.url : "";
  const id =
    (typeof p.id === "string" && p.id) ||
    (url ? url : title);

  if (!id || !title) return null;

  const tiny: Tiny = {
    id,
    title,
    url,
  };
  if (typeof p.brand === "string") tiny.brand = p.brand;
  if (typeof p.retailer === "string") tiny.retailer = p.retailer;
  if (typeof p.image === "string") tiny.image = p.image;
  if (typeof p.price === "number" && Number.isFinite(p.price)) tiny.price = p.price;
  if (typeof p.currency === "string") tiny.currency = p.currency;
  if (p.fit?.category) tiny.fit = { category: p.fit.category };

  return tiny;
}

export function encodeProductsToCode(list: Product[]): string {
  const items: Tiny[] = [];
  for (const p of list) {
    const t = sanitize(p);
    if (t) items.push(t);
  }
  return toB64(JSON.stringify({ v: 1, items }));
}

export function decodeProductsFromCode(code: string): Product[] {
  try {
    const json = fromB64(code.trim());
    const data = JSON.parse(json) as { v?: number; items?: Tiny[] };
    const items = Array.isArray(data.items) ? data.items : [];
    const out: Product[] = [];
    for (const t of items) {
      if (!t || typeof t !== "object") continue;
      if (!t.id || !t.title || !t.url) continue;
      out.push({
        id: t.id,
        title: t.title,
        url: t.url,
        brand: t.brand,
        retailer: t.retailer,
        image: t.image,
        price: t.price,
        currency: t.currency,
        fit: t.fit ? { category: normalizeCategory(t.fit.category) } : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
