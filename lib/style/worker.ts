// FILE: lib/style/worker.ts
import type { LookResponse, Product, SlotName, StylePlan } from "@/lib/style/types";
import { searchCatalog } from "@/lib/catalog/mock";
import { searchSeedCatalog } from "@/lib/seedCatalog";
import {
  addJobError,
  addJobLog,
  cacheKey,
  getCached,
  setCached,
  updateJob,
  updateJobProgress,
} from "@/lib/style/store";
import { webProductSearch } from "@/lib/scrape/webProductSearch";
import { renderStylistText } from "@/lib/stylistCopy";

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
const PER_SLOT_TIMEOUT_MS = 2500;
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

function buildMessage(plan: StylePlan, products: Product[]): string {
  return renderStylistText({ mode: "final", plan, products });
}

function buildEmptyMessage(plan: StylePlan): string {
  return renderStylistText({ mode: "blueprint", plan });
}

function isMVL(products: Product[]): boolean {
  const anchor = products.find((p) => p.slot === "anchor");
  const footwear = products.find((p) => p.slot === "shoe");
  const core = products.find((p) => p.slot === "top" || p.slot === "bottom" || p.slot === "dress");
  return Boolean(anchor && footwear && core);
}

function relaxedSlotPlan(slotPlan: StylePlan["per_slot"][number]): StylePlan["per_slot"][number] {
  const min = Math.round(slotPlan.min_price * 0.9);
  const max = Math.round(slotPlan.max_price * 1.1);
  const baseColors = ["black", "white", "cream", "charcoal"];
  return {
    ...slotPlan,
    min_price: Math.max(10, min),
    max_price: Math.max(min + 20, max),
    allowed_colors: Array.from(new Set([...slotPlan.allowed_colors, ...baseColors])),
    keywords: Array.from(new Set([...slotPlan.keywords, slotPlan.category, "tailored", "clean"])),
  };
}

function expandCategories(slotPlan: StylePlan["per_slot"][number]): StylePlan["per_slot"][number] {
  if (slotPlan.slot === "dress") {
    return {
      ...slotPlan,
      keywords: Array.from(new Set([...slotPlan.keywords, "slip dress", "tailored set"])),
    };
  }
  if (slotPlan.slot === "shoe") {
    return {
      ...slotPlan,
      keywords: Array.from(new Set([...slotPlan.keywords, "boot", "pointed flat", "heel"])),
    };
  }
  return slotPlan;
}

function catalogFallback(plan: StylePlan, slotPlan: StylePlan["per_slot"][number], slot: SlotName): Product[] {
  const budgetMax = slotPlan.max_price || plan.budget_total;
  const keywords = slotPlan.keywords.slice(0, 6);
  const items = searchCatalog({
    q: keywords.join(" "),
    gender: (plan.preferences.gender as "female" | "male" | "unisex") || "unisex",
    budgetMax,
    keywords,
  });
  const seed = searchSeedCatalog({
    slot,
    region: (plan.preferences.country || "EU").toUpperCase(),
    maxPrice: budgetMax * 1.1,
    tags: keywords,
  });
  const pool = items.length
    ? items.map((item) => ({
        id: item.id,
        retailer: item.retailer,
        brand: item.brand,
        title: item.title,
        price: item.price,
        currency: item.currency,
        image_url: item.image,
        product_url: item.url,
        availability: item.availability,
        slot,
        category: slotPlan.category,
      }))
    : seed.map((item) => ({
        id: item.id,
        retailer: item.brand,
        brand: item.brand,
        title: item.title,
        price: item.price,
        currency: item.currency,
        image_url: item.image,
        product_url: item.url,
        availability: "unknown",
        slot,
        category: slotPlan.category,
      }));
  return pool;
}

async function searchRetailerSlot(
  retailer: RetailerAdapter,
  slot: SlotName,
  slotPlan: StylePlan["per_slot"][number],
  query: string,
  jobId: string
): Promise<Product[]> {
  try {
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
  } catch (err) {
    addJobError(jobId, {
      retailer: retailer.name,
      slot,
      message: err instanceof Error ? err.message : "search failed",
    });
    return [];
  }
}

export async function runLookJob(plan: StylePlan) {
  const key = cacheKey(plan);
  const cached = getCached(key);
  if (cached) {
    updateJob(plan.look_id, { status: "complete", result: cached });
    return;
  }

  updateJob(plan.look_id, { status: "running" });
  addJobLog(plan.look_id, "job started");
  const started = Date.now();
  const products: Product[] = [];
  let lastProgressAt = Date.now();

  const keepAlive = setInterval(() => {
    updateJob(plan.look_id, { status: "running" });
  }, 500);

  const slotPlans = plan.per_slot;
  const slotQueries = new Map(plan.search_queries.map((s) => [s.slot, s.query]));

  for (const slotPlan of slotPlans) {
    if (Date.now() - started > GLOBAL_TIMEOUT_MS) break;
    const slot = slotPlan.slot;
    const query = slotQueries.get(slot) || slotPlan.keywords.join(" ");

    const slotTimeout = withTimeout(
      Promise.all(
        RETAILERS.map((retailer) =>
          withTimeout(searchRetailerSlot(retailer, slot, slotPlan, query, plan.look_id), PER_RETAILER_TIMEOUT_MS, [])
        )
      ),
      PER_SLOT_TIMEOUT_MS,
      []
    );

    const batches = await slotTimeout;
    const candidates = Array.isArray(batches) ? batches.flat() : [];

    const scored = candidates
      .map((p) => ({ p, score: scoreProduct(p, slotPlan) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);

    if (scored.length) {
      products.push(scored[0]);
      updateJobProgress(plan.look_id, slot, scored.length);
      lastProgressAt = Date.now();
    }

    if (Date.now() - lastProgressAt > 2000) {
      addJobLog(plan.look_id, "no progress, relaxing constraints");
    }

    if (isMVL(products)) {
      const interimMissing = plan.required_slots.filter((s) => !products.find((p) => p.slot === s));
      updateJob(plan.look_id, {
        status: "partial",
        result: {
          look_id: plan.look_id,
          status: "partial",
          message: buildMessage(plan, products, interimMissing),
          slots: products,
          total_price: estimateTotal(products),
          currency: plan.currency,
          missing_slots: interimMissing,
        },
      });
    }
  }

  let required = plan.required_slots;
  let missing = required.filter((slot) => !products.find((p) => p.slot === slot));

  if (products.length < 2 || missing.length) {
    for (const slotPlan of slotPlans) {
      if (Date.now() - started > GLOBAL_TIMEOUT_MS) break;
      const slot = slotPlan.slot;
      if (products.find((p) => p.slot === slot)) continue;
      const relaxed = expandCategories(relaxedSlotPlan(slotPlan));
      const fallbackCandidates = catalogFallback(plan, relaxed, slot);
      if (fallbackCandidates.length) {
        const scored = fallbackCandidates
          .map((p) => ({ p, score: scoreProduct(p, relaxed) }))
          .sort((a, b) => b.score - a.score)
          .map((x) => x.p);
        if (scored.length) {
          products.push(scored[0]);
          updateJobProgress(plan.look_id, slot, scored.length);
        }
      }
    }
    required = plan.required_slots;
    missing = required.filter((slot) => !products.find((p) => p.slot === slot));
  }
  const timedOut = Date.now() - started >= GLOBAL_TIMEOUT_MS;
  const coreRequired = required.filter((slot) => slot !== "accessory");
  const coreMissing = coreRequired.filter((slot) => !products.find((p) => p.slot === slot));
  const hasMVL = isMVL(products);
  const status: LookResponse["status"] =
    products.length === 0
      ? "failed"
      : hasMVL || coreMissing.length === 0 || timedOut
        ? "complete"
        : "partial";

  const result: LookResponse = {
    look_id: plan.look_id,
    status,
    message: products.length ? buildMessage(plan, products) : buildEmptyMessage(plan),
    slots: products,
    total_price: estimateTotal(products),
    currency: plan.currency,
    missing_slots: missing,
    note: missing.length ? "I kept the line clean and focused on the strongest pieces." : "Keep the palette tight for the cleanest read.",
  };

  setCached(key, result);
  updateJob(plan.look_id, { status, result });
  clearInterval(keepAlive);
}
