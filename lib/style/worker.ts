// FILE: lib/style/worker.ts
import type { LookResponse, Product, SlotName, StylePlan } from "@/lib/style/types";
import { cacheKey, getCached, setCached, updateJob } from "@/lib/style/store";
import { webProductSearch } from "@/lib/scrape/webProductSearch";

type RetailerAdapter = {
  name: string;
  domain: string;
};

const RETAILERS: RetailerAdapter[] = [
  { name: "COS", domain: "cos.com" },
  { name: "Zara", domain: "zara.com" },
  { name: "& Other Stories", domain: "stories.com" },
];

const PER_RETAILER_TIMEOUT_MS = 1500;
const GLOBAL_TIMEOUT_MS = 8000;

function normalizeAvailability(raw?: string | null): Product["availability"] {
  const v = (raw || "").toLowerCase();
  if (v.includes("out")) return "out_of_stock";
  if (v.includes("in")) return "in_stock";
  return "unknown";
}

function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function hostMatches(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

function stableId(url: string): string {
  const data = new TextEncoder().encode(url);
  let hash = 0;
  for (const b of data) {
    hash = (hash << 5) - hash + b;
    hash |= 0;
  }
  return `prd_${Math.abs(hash)}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

function productFromScrape(
  slot: SlotName,
  category: string,
  retailer: RetailerAdapter,
  item: {
    title?: string;
    brand?: string;
    price?: number;
    currency?: string;
    image?: string;
    url?: string;
    availability?: string;
  }
): Product | null {
  const url = item.url ? safeUrl(item.url) : null;
  const image = item.image ? safeUrl(item.image) : null;
  const title = item.title?.trim();
  const brand = item.brand?.trim() || retailer.name;
  const price = typeof item.price === "number" && Number.isFinite(item.price) ? item.price : null;
  const currency = item.currency?.trim() || "EUR";
  if (!url || !image || !title || !price) return null;
  if (!hostMatches(url, retailer.domain)) return null;
  return {
    id: stableId(url),
    retailer: retailer.name,
    brand,
    title,
    price,
    currency,
    image_url: image,
    product_url: url,
    availability: normalizeAvailability(item.availability),
    slot,
    category,
  };
}

function keywordScore(title: string, keywords: string[]): number {
  const t = title.toLowerCase();
  return keywords.reduce((acc, k) => (t.includes(k.toLowerCase()) ? acc + 1 : acc), 0);
}

function colorScore(title: string, allowed: string[]): number {
  if (!allowed.length) return 0;
  const t = title.toLowerCase();
  return allowed.some((c) => t.includes(c.toLowerCase())) ? 1 : 0;
}

function bannedPenalty(title: string, banned: string[]): number {
  if (!banned.length) return 0;
  const t = title.toLowerCase();
  return banned.some((b) => t.includes(b.toLowerCase())) ? -2 : 0;
}

function priceScore(price: number, min: number, max: number): number {
  if (price < min || price > max) return -1;
  const mid = (min + max) / 2;
  const dist = Math.abs(price - mid);
  return Math.max(0, 1 - dist / (max - min + 1));
}

function scoreProduct(product: Product, slotPlan: StylePlan["per_slot"][number]): number {
  const keyword = keywordScore(product.title, slotPlan.keywords);
  const colors = colorScore(product.title, slotPlan.allowed_colors);
  const banned = bannedPenalty(product.title, slotPlan.banned_materials);
  const price = priceScore(product.price, slotPlan.min_price, slotPlan.max_price);
  return keyword * 2 + colors + price + banned;
}

function estimateTotal(products: Product[]): number | null {
  if (!products.length) return null;
  const total = products.reduce((acc, p) => acc + p.price, 0);
  return Math.round(total);
}

function buildMessage(plan: StylePlan, products: Product[], missing: SlotName[]): string {
  const opening = `Okay — ${plan.preferences.prompt || "I’ve got you."} I’m balancing your budget with the silhouette you asked for.`;
  const direction = `We’re going for ${plan.aesthetic_read.toLowerCase()}.`;
  const lines: string[] = [];
  const slotOrder: SlotName[] = ["anchor", "top", "bottom", "dress", "shoe", "accessory"];
  for (const slot of slotOrder) {
    const item = products.find((p) => p.slot === slot);
    if (!item) continue;
    const label =
      slot === "anchor"
        ? "Anchor"
        : slot === "shoe"
          ? "Footwear"
          : slot === "accessory"
            ? "Optional accent"
            : slot.charAt(0).toUpperCase() + slot.slice(1);
    lines.push(`${label}: ${item.brand} — ${item.title} — ${item.currency} ${item.price} — ${item.retailer}`);
  }
  const total = estimateTotal(products);
  const totalLine = total ? `Estimated total: ${plan.currency} ${total}.` : "Estimated total: —.";
  const note = missing.length
    ? `I’m still missing ${missing.join(", ")} — if you want, I can loosen the budget or colors to fill those.`
    : "If you want this sharper, tighten the palette by one shade; if softer, add texture.";
  return [opening, direction, "The look:", ...lines, totalLine, note].join("\n");
}

async function searchRetailerSlot(
  retailer: RetailerAdapter,
  slot: SlotName,
  slotPlan: StylePlan["per_slot"][number],
  query: string
): Promise<Product[]> {
  const siteQuery = `${query} site:${retailer.domain}`;
  const results = await webProductSearch({ query: siteQuery, limit: 8, preferEU: true });
  return results
    .map((r) =>
      productFromScrape(slot, slotPlan.category, retailer, {
        title: r.title,
        brand: r.brand ?? undefined,
        price: r.price ?? undefined,
        currency: r.currency ?? undefined,
        image: r.image ?? undefined,
        url: r.url,
        availability: r.availability ?? undefined,
      })
    )
    .filter((p): p is Product => Boolean(p));
}

export async function runLookJob(plan: StylePlan) {
  const key = cacheKey(plan);
  const cached = getCached(key);
  if (cached) {
    updateJob(plan.look_id, { status: "complete", result: cached });
    return;
  }

  updateJob(plan.look_id, { status: "running" });
  const started = Date.now();
  const products: Product[] = [];

  const slotPlans = plan.per_slot;
  const slotQueries = new Map(plan.search_queries.map((s) => [s.slot, s.query]));

  for (const slotPlan of slotPlans) {
    if (Date.now() - started > GLOBAL_TIMEOUT_MS) break;
    const slot = slotPlan.slot;
    const query = slotQueries.get(slot) || slotPlan.keywords.join(" ");

    const retailerTasks = RETAILERS.map((retailer) =>
      withTimeout(searchRetailerSlot(retailer, slot, slotPlan, query), PER_RETAILER_TIMEOUT_MS, [])
    );

    const batches = await Promise.all(retailerTasks);
    const candidates = batches.flat();

    const scored = candidates
      .map((p) => ({ p, score: scoreProduct(p, slotPlan) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);

    if (scored.length) products.push(scored[0]);
  }

  const required = plan.required_slots;
  const missing = required.filter((slot) => !products.find((p) => p.slot === slot));
  const status: LookResponse["status"] =
    missing.length > 0 ? (products.length ? "partial" : "failed") : "complete";

  const result: LookResponse = {
    look_id: plan.look_id,
    status,
    message: buildMessage(plan, products, missing),
    slots: products,
    total_price: estimateTotal(products),
    currency: plan.currency,
    missing_slots: missing,
    note: missing.length
      ? "I couldn’t fill every slot yet. Want me to loosen budget or color constraints?"
      : "If you want it sharper, tighten the palette by one step.",
  };

  setCached(key, result);
  updateJob(plan.look_id, { status, result });
}
