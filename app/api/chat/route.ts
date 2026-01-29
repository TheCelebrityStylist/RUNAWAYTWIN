// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Chat → JSON stylist plan with linkable products.
 * If the model returns products with url:null, we backfill via /api/products/search (web provider).
 */

type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string | unknown[] };

type Prefs = {
  gender?: string;
  bodyType?: string;
  budget?: number | string;
  country?: string;
  currency?: string;
  styleKeywords?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  heightCm?: number;
  weightKg?: number;
};

type Cand = {
  title: string;
  url: string;
  brand?: string | null;
  affiliate_url?: string | null;
  retailer?: string | null;
  availability?: string | null;
  category?: UiProduct["category"];
  price?: number | null;
  currency?: string | null;
  image?: string | null;
};

type UiProduct = {
  id: string;
  title: string;
  url: string | null;
  brand: string | null;
  affiliate_url: string | null;
  retailer: string | null;
  availability: string | null;
  category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory";
  price: number | null;
  currency: string;
  image: string | null;
};

type PlanJson = {
  brief: string;
  tips: string[];
  why: string[];
  products: UiProduct[];
  total: { value: number | null; currency: string };
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY;
const HAS_KEY = Boolean(apiKey);
const client = apiKey ? new OpenAI({ apiKey }) : null;

function contentToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return (c as unknown[])
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object") {
          const obj = p as Record<string, unknown>;
          const v =
            (obj.text as string | undefined) ??
            (obj.content as string | undefined) ??
            (obj.value as string | undefined);
          return typeof v === "string" ? v : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function lastUserText(msgs: ChatMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === "user") return contentToText(msgs[i].content);
  }
  return "";
}

function currencyFor(p: Prefs) {
  if (p.currency) return p.currency;
  if ((p.country || "").toUpperCase() === "US") return "USD";
  return "EUR";
}

function prefsBlock(p: Prefs) {
  const cur = currencyFor(p);
  return [
    `USER PROFILE (use this to tailor the plan strictly)`,
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ?? "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    `HARD REQUIREMENT: Your brief MUST reference the user's last message and these preferences.`,
  ].join("\n");
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function asString(x: unknown, def = ""): string {
  return typeof x === "string" ? x : def;
}
function asNumberOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function normalizeCategory(raw: unknown, fallbackTitle?: string): UiProduct["category"] {
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  const t = (fallbackTitle || "").toLowerCase();
  const v = `${value} ${t}`;
  if (v.includes("dress")) return "Dress";
  if (v.includes("coat") || v.includes("jacket") || v.includes("trench"))
    return "Outerwear";
  if (v.includes("shoe") || v.includes("boot") || v.includes("sneaker") || v.includes("heel"))
    return "Shoes";
  if (v.includes("bag") || v.includes("handbag")) return "Bag";
  if (v.includes("top") || v.includes("shirt") || v.includes("tee") || v.includes("blouse") || v.includes("knit"))
    return "Top";
  if (v.includes("trouser") || v.includes("pant") || v.includes("jean") || v.includes("skirt"))
    return "Bottom";
  return "Accessory";
}

async function providerCandidates(baseUrl: string, query: string, prefs: Prefs): Promise<Cand[]> {
  try {
    const url = new URL("/api/products/search", baseUrl);
    const resp = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit: 24,
        perProvider: 8,
        country: prefs.country,
        prefs,
        providers: ["web", "awin", "rakuten", "amazon"],
      }),
    });
    if (!resp.ok) return [];
    const data = (await resp.json().catch(() => null)) as
      | {
          items?: Array<{
            id?: unknown;
            title?: unknown;
            url?: unknown;
            brand?: unknown;
            image?: unknown;
            price?: unknown;
            currency?: unknown;
            retailer?: unknown;
            affiliate_url?: unknown;
            availability?: unknown;
            category?: unknown;
          }>;
        }
      | null;
    const items = Array.isArray(data?.items) ? data!.items : [];

    const seen = new Set<string>();
    const out: Cand[] = [];
    for (const it of items) {
      const title = typeof it.title === "string" ? it.title : "";
      const urlStr = typeof it.url === "string" ? it.url : "";
      if (!title || !urlStr) continue;
      const brand = typeof it.brand === "string" ? it.brand : null;
      const image = typeof it.image === "string" ? it.image : null;
      const price = typeof it.price === "number" && Number.isFinite(it.price) ? it.price : null;
      const currency = typeof it.currency === "string" ? it.currency : null;
      const retailer = typeof it.retailer === "string" ? it.retailer : null;
      const affiliate = typeof it.affiliate_url === "string" ? it.affiliate_url : null;
      const availability = typeof it.availability === "string" ? it.availability : null;
      const category = normalizeCategory(it.category, title);
      try {
        const u = new URL(urlStr);
        const key = `${u.hostname.replace(/^www\./, "")}${u.pathname}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          title,
          url: urlStr,
          brand,
          image,
          price,
          currency,
          retailer,
          affiliate_url: affiliate,
          availability,
          category,
        });
      } catch {
        // ignore
      }
      if (out.length >= 20) break;
    }
    return out;
  } catch {
    return [];
  }
}

function candidatesBlock(cands: Cand[]) {
  if (!cands.length) return "CANDIDATE_LINKS: []";
  const lines = cands.map(
    (c, i) =>
      `{"i":${i},"title":${JSON.stringify(c.title)},"url":${JSON.stringify(
        c.url
      )},"affiliate_url":${JSON.stringify(c.affiliate_url ?? c.url)},"brand":${JSON.stringify(
        c.brand ?? null
      )},"category":${JSON.stringify(c.category ?? "Accessory")},"price":${JSON.stringify(
        c.price ?? null
      )},"currency":${JSON.stringify(c.currency ?? null)},"image":${JSON.stringify(
        c.image ?? null
      )},"retailer":${JSON.stringify(c.retailer ?? null)},"availability":${JSON.stringify(
        c.availability ?? null
      )}}`
  );
  return `CANDIDATE_LINKS: [${lines.join(",")}]`;
}

function productsFromCandidates(cands: Cand[], currency: string): UiProduct[] {
  const byCategory: Partial<Record<UiProduct["category"], UiProduct>> = {};
  for (const c of cands) {
    if (!c.url || !c.title) continue;
    const category = c.category ?? normalizeCategory(c.title);
    if (byCategory[category]) continue;
    byCategory[category] = {
      id: c.url,
      title: c.title,
      url: c.url,
      brand: c.brand ?? null,
      affiliate_url: c.affiliate_url ?? c.url,
      retailer: c.retailer ?? null,
      availability: c.availability ?? null,
      category,
      price: c.price ?? null,
      currency: c.currency ?? currency,
      image: c.image ?? null,
    };
    if (Object.keys(byCategory).length >= 5) break;
  }
  return Object.values(byCategory).filter((p): p is UiProduct => !!p);
}

function productFromModel(
  x: unknown,
  fallbackCurrency: string,
  candidatesByUrl: Map<string, Cand>
): UiProduct | null {
  if (!isObj(x)) return null;

  const rawCat = asString(x["category"], "Accessory");
  const allowed = new Set([
    "Top",
    "Bottom",
    "Dress",
    "Outerwear",
    "Shoes",
    "Bag",
    "Accessory",
  ]);
  const category = allowed.has(rawCat) ? (rawCat as UiProduct["category"]) : "Accessory";

  const url = typeof x["url"] === "string" ? (x["url"] as string) : null;
  const candidate = url ? candidatesByUrl.get(url) : undefined;
  if (!candidate) return null;
  const brand =
    typeof x["brand"] === "string" && (x["brand"] as string).trim() ? (x["brand"] as string) : null;

  const currency =
    typeof x["currency"] === "string" && (x["currency"] as string).trim()
      ? (x["currency"] as string)
      : fallbackCurrency;

  return {
    id: asString(x["id"], crypto.randomUUID()),
    title: candidate?.title ?? asString(x["title"], "Item"),
    url: candidate?.url ?? url,
    brand: candidate?.brand ?? brand,
    affiliate_url: candidate?.affiliate_url ?? candidate?.url ?? url,
    retailer: candidate?.retailer ?? null,
    availability: candidate?.availability ?? null,
    category: candidate?.category ?? category,
    price: candidate?.price ?? asNumberOrNull(x["price"]),
    currency: candidate?.currency ?? currency,
    image:
      candidate?.image ?? (typeof x["image"] === "string" ? (x["image"] as string) : null),
  };
}

function coercePlan(
  content: string,
  fallbackCurrency: string,
  candidates: Cand[]
): PlanJson | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;

  const brief = asString(raw["brief"], "");
  const tips = Array.isArray(raw["tips"])
    ? ((raw["tips"] as unknown[]).filter((s) => typeof s === "string") as string[])
    : [];
  const why = Array.isArray(raw["why"])
    ? ((raw["why"] as unknown[]).filter((s) => typeof s === "string") as string[])
    : [];

  const productsRaw = Array.isArray(raw["products"]) ? (raw["products"] as unknown[]) : [];
  const candidatesByUrl = new Map<string, Cand>();
  for (const c of candidates) {
    if (c.url) candidatesByUrl.set(c.url, c);
  }

  const products = productsRaw
    .map((p) => productFromModel(p, fallbackCurrency, candidatesByUrl))
    .filter((p): p is UiProduct => !!p);

  const totalObj = isObj(raw["total"]) ? (raw["total"] as Record<string, unknown>) : {};
  const totalCurrency =
    typeof totalObj["currency"] === "string" ? (totalObj["currency"] as string) : fallbackCurrency;
  const totalValue = asNumberOrNull(totalObj["value"]);

  return { brief, tips, why, products, total: { value: totalValue, currency: totalCurrency } };
}

function validateUiProduct(p: UiProduct): boolean {
  if (!p.id || !p.title || !p.brand || !p.category) return false;
  if (!p.affiliate_url || !p.url || !p.image) return false;
  if (!p.retailer || !p.availability) return false;
  if (typeof p.price !== "number" || !Number.isFinite(p.price) || p.price <= 0) return false;
  if (!p.currency || !/^[A-Z]{3}$/.test(p.currency)) return false;
  return true;
}

function hashText(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function aestheticRead(userText: string): string {
  const t = userText.toLowerCase();
  const seed = hashText(userText);
  if (t.includes("gallery") || t.includes("opening")) {
    return pick(
      [
        "Intellectual minimalism with architectural restraint.",
        "Quiet structure, disciplined lines, gallery-ready composure.",
        "Sculptural tailoring with a restrained, cultural edge.",
      ],
      seed
    );
  }
  if (t.includes("rain") || t.includes("wet")) {
    return pick(
      [
        "Weather-proof structure with a clean, urban line.",
        "Rain-ready tailoring with deliberate proportions.",
        "Protective layers, sharp silhouettes, no excess.",
      ],
      seed
    );
  }
  if (t.includes("off-duty") || t.includes("street")) {
    return pick(
      [
        "Restrained off-duty minimalism with a tactile edge.",
        "Elevated casual built on clean lines and texture.",
        "Controlled street polish without the noise.",
      ],
      seed
    );
  }
  return pick(
    [
      "Controlled minimalism with a decisive silhouette.",
      "Modern uniformity with a quiet edge.",
      "Clean proportion, considered texture, zero excess.",
    ],
    seed
  );
}

function formatMoney(currency: string, price: number): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
  } catch {
    return `${currency} ${Math.round(price)}`;
  }
}

function lineFor(role: string, p: UiProduct): string {
  return `${role} — ${p.brand} — ${p.title} — ${formatMoney(p.currency, p.price ?? 0)}`;
}

function roleReason(role: keyof typeof roleReasons, userText: string): string {
  const seed = hashText(`${role}:${userText}`);
  return pick(roleReasons[role], seed);
}

const roleReasons = {
  Anchor: [
    "Sets the line and carries the visual authority.",
    "Defines the silhouette and the level of formality.",
    "Controls the proportion; everything else follows.",
  ],
  Support: [
    "Keeps the proportions balanced and the look disciplined.",
    "Supports the anchor without competing for attention.",
    "Adds structure without hardening the silhouette.",
  ],
  Footwear: [
    "Grounds the look with weather-aware practicality.",
    "Handles the environment while staying sharp.",
    "Keeps the silhouette clean under real conditions.",
  ],
  Accent: [
    "Adds a precise texture note without noise.",
    "A restrained finish that reinforces the palette.",
    "Small detail, high impact.",
  ],
} satisfies Record<string, string[]>;

function mapRoleProducts(products: UiProduct[]) {
  const anchor =
    products.find((p) => p.category === "Outerwear") ||
    products.find((p) => p.category === "Dress") ||
    products.find((p) => p.category === "Top") ||
    products[0];
  const support =
    products.find((p) => p.category === "Bottom" && p.id !== anchor?.id) ||
    products.find((p) => p.category === "Top" && p.id !== anchor?.id);
  const footwear = products.find((p) => p.category === "Shoes");
  const accent = products.find((p) => p.category === "Bag" || p.category === "Accessory");
  return { anchor, support, footwear, accent };
}

function ensureNarrative(plan: PlanJson, userText: string): PlanJson {
  if (!plan.products.length) return plan;
  const { anchor, support, footwear, accent } = mapRoleProducts(plan.products);
  const tips: string[] = [];
  if (anchor) tips.push(lineFor("Anchor", anchor));
  if (support) tips.push(lineFor("Support Piece", support));
  if (footwear) tips.push(lineFor("Footwear", footwear));
  if (accent) tips.push(lineFor("Optional Accent", accent));

  const why: string[] = [];
  if (anchor) why.push(roleReason("Anchor", userText));
  if (support) why.push(roleReason("Support", userText));
  if (footwear) why.push(roleReason("Footwear", userText));
  if (accent) why.push(roleReason("Accent", userText));

  return {
    ...plan,
    brief: aestheticRead(userText),
    tips,
    why,
  };
}

function timeout<T>(ms: number, fallback: T) {
  return new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
}

async function enrichMissingLinks(
  baseUrl: string,
  prefs: Prefs,
  products: UiProduct[]
): Promise<UiProduct[]> {
  const needs = products
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !p.url || !p.image)
    .slice(0, 6);

  if (needs.length === 0) return products;

  const enriched = [...products];

  await Promise.all(
    needs.map(async ({ p, idx }) => {
      const qParts = [p.title, p.brand ?? "", p.category, prefs.country ?? ""].filter(Boolean);
      const q = qParts.join(" ").trim();
      if (!q) return;

      try {
        const url = new URL("/api/products/search", baseUrl);
        const resp = await Promise.race([
          fetch(url.toString(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q,
            limit: 6,
            perProvider: 6,
            country: prefs.country,
            prefs,
            providers: ["web", "amazon", "rakuten", "awin"],
          }),
        }),
          timeout<Response>(4000, new Response(null, { status: 599 })),
        ]);

        if (!resp.ok) return;

        const data = (await resp.json().catch(() => null)) as
          | {
              items?: Array<{
                title?: unknown;
                url?: unknown;
                affiliate_url?: unknown;
                image?: unknown;
                price?: unknown;
                currency?: unknown;
                brand?: unknown;
                retailer?: unknown;
                availability?: unknown;
                category?: unknown;
              }>;
            }
          | null;

        const firstItem = Array.isArray(data?.items) ? data!.items[0] : undefined;
        if (!firstItem) return;

        const urlStr = typeof firstItem.url === "string" ? firstItem.url : null;
        const affiliateStr =
          typeof firstItem.affiliate_url === "string" ? firstItem.affiliate_url : urlStr;
        const imgStr = typeof firstItem.image === "string" ? firstItem.image : null;
        const priceNum =
          typeof firstItem.price === "number" && Number.isFinite(firstItem.price) ? firstItem.price : null;
        const curStr = typeof firstItem.currency === "string" ? firstItem.currency : p.currency;
        const brandStr = typeof firstItem.brand === "string" ? firstItem.brand : p.brand;
        const retailerStr = typeof firstItem.retailer === "string" ? firstItem.retailer : p.retailer;
        const availabilityStr =
          typeof firstItem.availability === "string" ? firstItem.availability : p.availability;
        const categoryStr =
          typeof firstItem.category === "string"
            ? normalizeCategory(firstItem.category)
            : p.category;

        enriched[idx] = {
          ...p,
          url: p.url ?? urlStr,
          affiliate_url: p.affiliate_url ?? affiliateStr,
          image: p.image ?? imgStr,
          price: p.price ?? priceNum,
          currency: curStr,
          brand: p.brand ?? brandStr ?? null,
          retailer: p.retailer ?? retailerStr ?? null,
          availability: p.availability ?? availabilityStr ?? null,
          category: p.category ?? categoryStr,
        };
      } catch {
        // ignore
      }
    })
  );

  return enriched;
}

export async function POST(req: NextRequest) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  try {
    if (!(req.headers.get("content-type") || "").includes("application/json")) {
      return new Response(JSON.stringify({ error: "Expected application/json body." }), {
        status: 415,
        headers,
      });
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
      preferences?: Prefs;
    };

    const history: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const preferences: Prefs = (body?.preferences || {}) as Prefs;

    const userText = lastUserText(history);
    if (!userText) {
      return new Response(
        JSON.stringify({
          error: "Tell me your occasion, body type, budget, and any celebrity muse. I’ll style a full look.",
        }),
        { status: 400, headers }
      );
    }

    const queryString = [userText, preferences.styleKeywords, preferences.bodyType, preferences.country]
      .filter(Boolean)
      .join(" ");

    const prov = await Promise.race([providerCandidates(req.url, queryString, preferences), timeout<Cand[]>(4500, [])]);

    const seen = new Set<string>();
    const merged: Cand[] = [];
    for (const c of prov) {
      try {
        const u = new URL(c.url);
        const key = `${u.hostname.replace(/^www\./, "")}${u.pathname}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(c);
      } catch {
        // ignore
      }
      if (merged.length >= 20) break;
    }

    const sys = [
      "You are an editorial-level fashion stylist with a decisive point of view.",
      "Return ONLY a single JSON object with this exact TypeScript shape:",
      "type Product = { id: string; title: string; brand: string; category: \"Top\" | \"Bottom\" | \"Dress\" | \"Outerwear\" | \"Shoes\" | \"Bag\" | \"Accessory\"; price: number; currency: string; image: string; url: string; affiliate_url: string; retailer: string; availability: string };",
      "type Plan = { brief: string; tips: string[]; why: string[]; products: Product[]; total: { value: number | null; currency: string } };",
      "",
      "HARD RULES:",
      "- Your `brief` MUST explicitly mention the user's last message and the key preferences (body type, budget, country/weather if provided).",
      "- Choose links ONLY from CANDIDATE_LINKS (copy URL exactly). If nothing fits, return an empty products array.",
      "- If a candidate provides category/brand/price/currency/image/retailer/availability, reuse those values. Do NOT invent them.",
      "- Do NOT invent products. If nothing meets the standard, return an empty products array.",
      "- Do NOT invent exact prices. If missing, omit the product entirely.",
      "- Never include markdown, commentary, or extra keys.",
      "- Avoid generic filler phrases. Write with fashion intelligence and restraint.",
      "",
      prefsBlock(preferences),
      "",
      candidatesBlock(merged),
    ].join("\n");

    const currency = currencyFor(preferences);
    let plan: PlanJson | null = null;

    if (HAS_KEY && client) {
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            ...history.map((m) => ({ role: m.role, content: contentToText(m.content) })),
            { role: "user", content: "Return the Plan JSON now. No markdown." },
          ],
        });
        const raw = completion.choices?.[0]?.message?.content || "{}";
        plan = coercePlan(raw, currency, merged);
      } catch {
        plan = null;
      }
    }

    if (!plan) {
      const seeded = productsFromCandidates(merged, currency);
      plan = {
        brief: aestheticRead(userText),
        tips: [],
        why: [],
        products: seeded,
        total: { value: null, currency },
      };
    }

    // Backfill missing urls/images/prices using providers (strict validation may still remove items)
    plan.products = await enrichMissingLinks(req.url, preferences, plan.products);
    plan.products = plan.products.filter((p) => validateUiProduct(p));
    plan = ensureNarrative(plan, userText);

    const sum = plan.products.reduce((acc, p) => (p.price != null ? acc + p.price : acc), 0);
    const anyPrice = plan.products.some((p) => p.price != null);
    plan.total = { value: anyPrice ? Math.round(sum) : null, currency };

    if (!plan.products.length) {
      return new Response(
        JSON.stringify({
          brief: "Inventory is thin for this brief.",
          tips: [
            "Increase the budget by ~10–15% to access stronger tailoring and footwear.",
            "If staying strict, pivot the aesthetic toward clean utility rather than sculptural tailoring.",
          ],
          why: [
            "The current price band limits structural fabrics and weather-ready shoes.",
            "A small budget shift unlocks significantly better silhouettes.",
          ],
          products: [],
          total: { value: null, currency },
        }),
        { headers }
      );
    }

    return new Response(JSON.stringify(plan), { headers });
  } catch {
    const currency = "EUR";
    const fallback: PlanJson = {
      brief: "Inventory is thin for this brief.",
      tips: [
        "Increase the budget by ~10–15% to access stronger tailoring and footwear.",
        "If staying strict, pivot the aesthetic toward clean utility rather than sculptural tailoring.",
      ],
      why: [
        "The current price band limits structural fabrics and weather-ready shoes.",
        "A small budget shift unlocks significantly better silhouettes.",
      ],
      products: [],
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}
