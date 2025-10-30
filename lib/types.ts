// FILE: lib/types.ts
// Centralized, strict-safe shared types for RunwayTwin.

// ====== Core user preference types ======
export type Gender = "female" | "male" | "other";
export type CountryCode = string;

export type Sizes = {
  top?: string;
  bottom?: string;
  dress?: string;
  shoe?: string;
};

export type Prefs = {
  gender?: Gender;
  bodyType?: string;
  budget?: string;
  country?: CountryCode;
  keywords?: string[];
  sizes?: Sizes; // optional; UI should handle undefined
};

// ====== Chat message types ======
export interface Message {
  role: "user" | "assistant";
  content: string;
}
export type Msg = Message;

// ====== Product & AI output types used across API/UI ======
/** Unified product shape for all providers (SerpAPI, Rakuten/Awin, Amazon, mocks). */
export type UiProduct = {
  id: string;
  title: string;
  url: string | null;
  brand: string | null;
  category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory";
  price: number | null; // keep numeric if parsed; null if unknown
  currency: string; // e.g., "EUR" | "USD" | "GBP"
  image: string | null; // absolute URL if available
};

/** Strict JSON object the stylist endpoint returns and the UI renders. */
export type AiJson = {
  brief: string;
  tips: string[];
  why: string[];
  products: UiProduct[];
  total: { value: number | null; currency: string };
};

// ====== Lightweight type guard helpers (no extra deps) ======
export function isMessage(x: unknown): x is Message {
  return (
    typeof x === "object" &&
    x !== null &&
    // @ts-expect-error index access at runtime
    (x.role === "user" || x.role === "assistant") &&
    // @ts-expect-error index access at runtime
    typeof x.content === "string"
  );
}

export function isPrefs(x: unknown): x is Prefs {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const okStr = (v: unknown) => v === undefined || typeof v === "string";
  const okArr = (v: unknown) =>
    v === undefined || (Array.isArray(v) && v.every((s) => typeof s === "string"));
  const okSizes = (v: unknown) =>
    v === undefined ||
    (typeof v === "object" &&
      v !== null &&
      ["top", "bottom", "dress", "shoe"].every((k) => {
        const val = (v as Record<string, unknown>)[k];
        return val === undefined || typeof val === "string";
      }));

  return (
    okStr(o.gender) &&
    okStr(o.bodyType) &&
    okStr(o.budget) &&
    okStr(o.country) &&
    okArr(o.keywords) &&
    okSizes(o.sizes)
  );
}

// ====== Safe coercion helpers (optional, used by UI/API) ======
export function asString(x: unknown, def = ""): string {
  return typeof x === "string" ? x : def;
}
export function asNumberOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}
export function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/** Attempt to coerce an unknown value to UiProduct (keeping strictness). */
export function asUiProduct(x: unknown, fallbackCurrency = "EUR"): UiProduct | null {
  if (!isObj(x)) return null;
  const catRaw = asString(x["category"], "Accessory");
  const allowed: UiProduct["category"][] = [
    "Top",
    "Bottom",
    "Dress",
    "Outerwear",
    "Shoes",
    "Bag",
    "Accessory",
  ];
  const category = (allowed.includes(catRaw as UiProduct["category"])
    ? (catRaw as UiProduct["category"])
    : "Accessory") as UiProduct["category"];

  return {
    id: asString(x["id"], crypto.randomUUID()),
    title: asString(x["title"], "Item"),
    url: typeof x["url"] === "string" ? (x["url"] as string) : null,
    brand: typeof x["brand"] === "string" ? (x["brand"] as string) : null,
    category,
    price: asNumberOrNull(x["price"]),
    currency: typeof x["currency"] === "string" ? (x["currency"] as string) : fallbackCurrency,
    image: typeof x["image"] === "string" ? (x["image"] as string) : null,
  };
}

/** Coerce a JSON string (from LLM) into AiJson; returns null if not usable. */
export function coerceAiJsonFromString(jsonText: string): AiJson | null {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;

  const productsRaw = Array.isArray(raw["products"]) ? (raw["products"] as unknown[]) : [];
  // currency from first product, else default
  const fallbackCurrency =
    productsRaw
      .map((p) => (isObj(p) && typeof p["currency"] === "string" ? (p["currency"] as string) : null))
      .find((c): c is string => !!c) ?? "EUR";

  const products: UiProduct[] = productsRaw
    .map((p) => asUiProduct(p, fallbackCurrency))
    .filter((p): p is UiProduct => !!p);

  const totalObj = isObj(raw["total"]) ? (raw["total"] as Record<string, unknown>) : {};
  const total = {
    value: asNumberOrNull(totalObj["value"]),
    currency:
      typeof totalObj["currency"] === "string"
        ? (totalObj["currency"] as string)
        : fallbackCurrency,
  };

  const brief = asString(raw["brief"], "");
  const tips =
    Array.isArray(raw["tips"])
      ? (raw["tips"] as unknown[]).filter((s) => typeof s === "string") as string[]
      : [];
  const why =
    Array.isArray(raw["why"])
      ? (raw["why"] as unknown[]).filter((s) => typeof s === "string") as string[]
      : [];

  if (!brief && products.length === 0 && tips.length === 0 && why.length === 0) {
    return null;
  }

  return { brief, tips, why, products, total };
}

