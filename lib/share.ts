// FILE: lib/share.ts
"use client";

import type { Product } from "@/lib/affiliates/types";

/** Compact, URL-safe base64 from UTF-8 string */
function toBase64Url(s: string): string {
  const b64 =
    typeof window !== "undefined"
      ? btoa(encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))))
      : Buffer.from(s, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const raw =
    typeof window !== "undefined"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("utf8");
  // convert raw binary -> utf8
  const utf8 = Array.prototype.map
    .call(raw, (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
    .join("");
  return decodeURIComponent(utf8);
}

/** Encode a list of products into a compact share code (URL-safe) */
export function encodeProductsToCode(items: Product[]): string {
  // Store only the fields we actually render/share
  const slim = items.map((p) => ({
    id: p.id ?? null,
    title: p.title,
    brand: p.brand ?? null,
    price: p.price ?? null,
    currency: p.currency ?? null,
    image: p.image ?? null,
    url: p.url,
    retailer: p.retailer ?? null,
  }));
  return toBase64Url(JSON.stringify({ v: 1, items: slim }));
}

/** Decode a share code back to products; returns [] on failure */
export function decodeProductsFromCode(code: string): Product[] {
  try {
    const json = fromBase64Url(code);
    const data = JSON.parse(json) as { v: number; items: any[] };
    if (!data || !Array.isArray(data.items)) return [];
    return data.items.map((p) => ({
      id: p.id ?? undefined,
      title: String(p.title ?? ""),
      brand: p.brand ?? undefined,
      price: typeof p.price === "number" ? p.price : undefined,
      currency: typeof p.currency === "string" ? p.currency : undefined,
      image: typeof p.image === "string" ? p.image : undefined,
      url: String(p.url ?? ""),
      retailer: typeof p.retailer === "string" ? p.retailer : undefined,
    })) as Product[];
  } catch {
    return [];
  }
}

/** Simple file helpers for JSON export/import */
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
