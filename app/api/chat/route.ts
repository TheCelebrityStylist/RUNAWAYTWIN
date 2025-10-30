// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";
import { searchProductsSerpApi } from "@/lib/products/search";

/**
 * Returns STRICT JSON for the UI:
 * {
 *   brief: string,
 *   tips: string[],
 *   why: string[],
 *   products: UiProduct[],
 *   total: { value: number | null, currency: string }
 * }
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

type UiProduct = {
  id: string;
  title: string;
  url: string | null;
  brand: string | null;
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
const HAS_KEY = Boolean(process.env.OPENAI_API_KEY);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------------- utilities ---------------- */
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

function prefsSummary(p: Prefs) {
  return [
    `Gender=${p.gender ?? "-"}`,
    `BodyType=${p.bodyType ?? "-"}`,
    `Budget=${p.budget ?? "-"}`,
    `Country=${p.country ?? "-"}`,
    `Keywords=${p.styleKeywords ?? "-"}`,
    `Sizes top=${p.sizeTop ?? "-"} bottom=${p.sizeBottom ?? "-"} dress=${p.sizeDress ?? "-"} shoe=${p.sizeShoe ?? "-"}`,
    `Height/Weight=${p.heightCm ?? "-"}cm/${p.weightKg ?? "-"}kg`,
  ].join(" | ");
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
function productFromModel(x: unknown, fallbackCurrency: string): UiProduct | null {
  if (!isObj(x)) return null;
  const url = typeof x["url"] === "string" ? (x["url"] as string) : null;
  const brand =
    typeof x["brand"] === "string" && x["brand"].trim().length ? (x["brand"] as string) : null;

  const currency =
    typeof x["currency"] === "string" && (x["currency"] as string).trim().length
      ? (x["currency"] as string)
      : fallbackCurrency;

  const cat = asString(x["category"], "");
  const category: UiProduct["category"] =
    cat === "Top" ||
    cat === "Bottom" ||
    cat === "Dress" ||
    cat === "Outerwear" ||
    cat === "Shoes" ||
    cat === "Bag" ||
    cat === "Accessory"
      ? cat
      : "Accessory";

  return {
    id: asString(x["id"], crypto.randomUUID()),
    title: asString(x["title"], "Item"),
    url,
    brand,
    category,
    price: asNumberOrNull(x["price"]),
    currency,
    image: typeof x["image"] === "string" ? (x["image"] as string) : null,
  };
}
function coercePlan(content: string, fallbackCurrency: string): PlanJson | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;

  const brief = asString(raw["brief"], "");
  const tips = Array.isArray(raw["tips"])
    ? (raw["tips"] as unknown[]).filter((s) => typeof s === "string") as string[]
    : [];
  const why = Array.isArray(raw["why"])
    ? (raw["why"] as unknown[]).filter((s) => typeof s === "string") as string[]
    : [];

  const productsRaw = Array.isArray(raw["products"]) ? (raw["products"] as unknown[]) : [];
  const products = productsRaw
    .map((p) => productFromModel(p, fallbackCurrency))
    .filter((p): p is UiProduct => !!p);

  const totalObj = isObj(raw["total"]) ? (raw["total"] as Record<string, unknown>) : {};
  const totalCurrency =
    typeof totalObj["currency"] === "string"
      ? (totalObj["currency"] as string)
      : fallbackCurrency;
  const totalValue = asNumberOrNull(totalObj["value"]);

  return {
    brief,
    tips,
    why,
    products,
    total: { value: totalValue, currency: totalCurrency },
  };
}

function ensureMinimumProducts(current: UiProduct[], min: number, currency: string): UiProduct[] {
  const out = [...current];
  const seed: UiProduct[] = [
    {
      id: "seed-outer",
      title: "Tailored Trench Coat",
      url: "https://www.massimodutti.com/",
      brand: "Massimo Dutti",
      category: "Outerwear",
      price: 149,
      currency,
      image: null,
    },
    {
      id: "seed-top",
      title: "Silk-Blend Blouse",
      url: "https://www.zara.com/",
      brand: "Zara",
      category: "Top",
      price: 49,
      currency,
      image: null,
    },
    {
      id: "seed-bottom",
      title: "High-Waist Trousers",
      url: "https://www.cos.com/",
      brand: "COS",
      category: "Bottom",
      price: 89,
      currency,
      image: null,
    },
    {
      id: "seed-shoes",
      title: "Leather Ankle Boots",
      url: "https://www.zalando.nl/",
      brand: "Zalando",
      category: "Shoes",
      price: 120,
      currency,
      image: null,
    },
  ];
  for (const p of seed) {
    if (out.length >= min) break;
    out.push(p);
  }
  return out.slice(0, Math.max(min, out.length));
}

/* ---------------- route ---------------- */
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
          brief:
            "Tell me your muse, occasion, body type, and budget band — I’ll assemble a full look.",
          tips: [],
          why: [],
          products: [],
          total: { value: null, currency: currencyFor(preferences) },
        } satisfies PlanJson),
        { headers, status: 200 }
      );
    }

    // 1) Fetch real product candidates (SerpAPI or mock)
    const searchQuery = [
      userText,
      preferences.styleKeywords,
      preferences.bodyType,
      preferences.gender,
      preferences.budget,
    ]
      .filter(Boolean)
      .join(" ");

    const candidates = await searchProductsSerpApi({
      query: searchQuery,
      country: preferences.country || "NL",
      max: 16,
    });

    // 2) Ask the model to select 4–6 products and write the brief/why/tips
    const sys = `
You are a professional fashion stylist.
Return ONLY a JSON object with this exact shape:
{
  "brief": string,
  "tips": string[],
  "why": string[],
  "products": [{
    "id": string, "title": string, "url": string|null, "brand": string|null,
    "category": "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory",
    "price": number|null, "currency": string, "image": string|null
  }],
  "total": { "value": number|null, "currency": string }
}
Rules:
- Choose 4–6 items from CANDIDATES only (copy the id/url/price/currency as-is).
- Style must suit: ${prefsSummary(preferences)}.
- Keep "brief" to 1–2 sentences; "tips" and "why" concise bullets.
- If price unknown, leave it null. Keep currency consistent.
`;

    const candidatesJson = JSON.stringify(candidates);

    let plan: PlanJson | null = null;

    if (HAS_KEY) {
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            { role: "system", content: `CANDIDATES: ${candidatesJson}` },
            ...history.map((m) => ({ role: m.role, content: contentToText(m.content) })),
            {
              role: "user",
              content: "Return ONLY the final JSON object for the look.",
            },
          ],
        });

        const raw = completion.choices?.[0]?.message?.content || "{}";
        plan = coercePlan(raw, currencyFor(preferences));
      } catch {
        plan = null;
      }
    }

    // 3) Fallback (no key / parse issue): deterministic safe object
    if (!plan) {
      plan = {
        brief:
          "A chic, weather-aware look with clean lines and capsule-friendly neutrals tailored to your brief.",
        tips: [
          "Tune hems to shoe height for a long line.",
          "Layer fine knits under structured outerwear.",
        ],
        why: [
          "Balanced proportions flatter your frame.",
          "Minimal palette keeps the outfit cohesive.",
        ],
        products: candidates.slice(0, 4),
        total: { value: null, currency: currencyFor(preferences) },
      };
    }

    // 4) Ensure at least 4 products & compute total if available
    plan.products = ensureMinimumProducts(plan.products, 4, currencyFor(preferences));
    const sum = plan.products.reduce((acc, p) => (p.price != null ? acc + p.price : acc), 0);
    const anyPrice = plan.products.some((p) => p.price != null);
    plan.total = { value: anyPrice ? Math.round(sum) : null, currency: currencyFor(preferences) };

    return new Response(JSON.stringify(plan), { headers, status: 200 });
  } catch {
    const currency = "EUR";
    const fallback: PlanJson = {
      brief:
        "Quick starter outfit (fallback). Refresh to regenerate a tailored look when connectivity recovers.",
      tips: ["Lean on monochrome layers.", "Add structure with a trench or blazer."],
      why: ["Clean lines lengthen the silhouette.", "Neutral palette looks intentional."],
      products: ensureMinimumProducts([], 4, currency),
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}

