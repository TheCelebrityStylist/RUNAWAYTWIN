// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Chat → JSON stylist plan with guaranteed, linkable products.
 * - Uses Tavily to fetch candidate links if key present.
 * - Strict JSON schema (response_format: json_object).
 * - If no links found, uses a curated mock catalog (real retailer URLs).
 * - Always returns application/json with:
 *   { brief, tips[], why[], products[ {id,title,url,brand,category,price,currency,image} ], total{value|null,currency} }
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

type Cand = { title: string; url: string };

type UiProduct = {
  id: string;
  title: string;
  url: string | null;
  brand: string | null;
  category: string;
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
const ALLOW_WEB = (process.env.ALLOW_WEB || "true").toLowerCase() !== "false";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------- helpers -------------------------- */
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
    `USER PROFILE`,
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ?? "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
  ].join("\n");
}

function retailerFromUrl(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* ---------------- Tavily candidates (optional) ---------------- */
async function webSearchProducts(query: string): Promise<Cand[]> {
  if (!ALLOW_WEB || !process.env.TAVILY_API_KEY) return [];
  const booster =
    " site:(zara.com OR mango.com OR hm.com OR net-a-porter.com OR matchesfashion.com OR farfetch.com OR uniqlo.com OR cos.com OR arket.com OR massimodutti.com OR levi.com)";
  const q = `${query}${booster}`;

  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: q,
      search_depth: "basic",
      max_results: 12,
      include_answer: false,
      include_raw_content: false,
    }),
  }).catch(() => null);

  if (!resp || !resp.ok) return [];

  const data = (await resp.json().catch(() => ({}))) as {
    results?: Array<{ title?: unknown; url?: unknown }>;
  };

  const raw: Array<{ title?: unknown; url?: unknown }> = Array.isArray(data.results)
    ? data.results
    : [];

  return raw
    .map((r) => ({
      title: typeof r?.title === "string" ? r.title : "",
      url: typeof r?.url === "string" ? r.url : "",
    }))
    .filter((x) => x.title && x.url)
    .slice(0, 12);
}

function candidatesBlock(cands: Cand[]) {
  if (!cands.length) return "CANDIDATE_LINKS: []";
  const lines = cands.map((c, i) => `{"i":${i},"title":${JSON.stringify(c.title)},"url":${JSON.stringify(c.url)}}`);
  return `CANDIDATE_LINKS: [${lines.join(",")}]`;
}

/* ----------------- Mock catalog (real URLs) ------------------ */
const MOCK_CATALOG: UiProduct[] = [
  {
    id: "zara-chino",
    title: "Slim Fit Chino Pants",
    url: "https://www.massimodutti.com/",
    brand: "Massimo Dutti",
    category: "Bottom",
    price: 80,
    currency: "EUR",
    image: null,
  },
  {
    id: "cos-knit",
    title: "Lightweight Knit Sweater",
    url: "https://www.cos.com/",
    brand: "COS",
    category: "Top",
    price: 59,
    currency: "EUR",
    image: null,
  },
  {
    id: "zara-boots",
    title: "Leather Chelsea Boots",
    url: "https://www.zara.com/",
    brand: "Zara",
    category: "Shoes",
    price: 90,
    currency: "EUR",
    image: null,
  },
  {
    id: "levis-denim",
    title: "Classic Denim Jacket",
    url: "https://www.levi.com/",
    brand: "Levi's",
    category: "Outerwear",
    price: 100,
    currency: "EUR",
    image: null,
  },
  {
    id: "arket-bag",
    title: "Structured Crossbody Bag",
    url: "https://www.arket.com/",
    brand: "ARKET",
    category: "Accessory",
    price: 70,
    currency: "EUR",
    image: null,
  },
];

function ensureMinimumProducts(
  current: UiProduct[],
  min: number,
  currency: string
): UiProduct[] {
  const out = [...current];
  for (const p of MOCK_CATALOG) {
    if (out.length >= min) break;
    out.push({ ...p, currency });
  }
  return out.slice(0, Math.max(min, out.length));
}

/* ---------------- JSON coercion helpers ---------------- */
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

  return {
    id: asString(x["id"], crypto.randomUUID()),
    title: asString(x["title"], "Item"),
    url,
    brand,
    category: asString(x["category"], "Accessory"),
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
          error:
            "Tell me your occasion, body type, budget, and any celebrity muse. I’ll style a full look.",
        }),
        { status: 400, headers }
      );
    }

    // 1) Optional candidates
    let cands: Cand[] = [];
    if (ALLOW_WEB && process.env.TAVILY_API_KEY) {
      const q = [
        userText,
        preferences.styleKeywords,
        preferences.bodyType,
        preferences.country,
      ]
        .filter(Boolean)
        .join(" ");
      cands = await Promise.race([
        webSearchProducts(q),
        new Promise<Cand[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
    }

    const sys = [
      "You are an editorial-level fashion stylist.",
      "Return ONLY a single JSON object with this exact TypeScript shape:",
      "type Product = { id: string; title: string; url: string | null; brand: string | null; category: string; price: number | null; currency: string; image: string | null };",
      "type Plan = { brief: string; tips: string[]; why: string[]; products: Product[]; total: { value: number | null; currency: string } };",
      "",
      "HARD RULES:",
      "- Use clean, wearable styling tailored to the brief and body type.",
      "- Choose links ONLY from CANDIDATE_LINKS (copy URL exactly). If nothing fits, set url: null.",
      "- Include AT LEAST 4 products spanning key categories (Outerwear/Top/Bottom/Shoes/Bag).",
      "- Do NOT invent exact prices you don't know (use null); keep currency consistent.",
      "- Never include markdown, commentary or extra keys.",
      "",
      prefsBlock(preferences),
      "",
      cands.length ? "CANDIDATE_LINKS:" : "CANDIDATE_LINKS: []",
      ...cands.map((c, i) => `- [${i}] ${c.title} — ${c.url}`),
    ].join("\n");

    const currency = currencyFor(preferences);
    let plan: PlanJson | null = null;

    if (HAS_KEY) {
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: 0.5,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            ...history.map((m) => ({ role: m.role, content: contentToText(m.content) })),
            {
              role: "user",
              content:
                "Return the Plan JSON now. Respect the schema and rules. No markdown, no prose.",
            },
          ],
        });
        const raw = completion.choices?.[0]?.message?.content || "{}";
        const parsed = coercePlan(raw, currency);
        plan = parsed;
      } catch {
        plan = null;
      }
    }

    // 2) Fallback: deterministic mock filled with real URLs
    if (!plan) {
      // Basic brief based on user text
      plan = {
        brief:
          "A chic and sophisticated look tailored to your brief, with capsule-friendly neutrals you can remix.",
        tips: [
          "Keep hems tuned to shoe height for clean lines.",
          "Layer fine knits under outerwear for changing weather.",
        ],
        why: [
          "Proportions balance your frame and keep a long line.",
          "Subtle structure sharpens the overall silhouette.",
        ],
        products: [],
        total: { value: null, currency },
      };
    }

    // Ensure minimum, linkable products
    plan.products = ensureMinimumProducts(plan.products, 4, currency);

    // Compute total if prices exist
    const sum = plan.products.reduce((acc, p) => (p.price != null ? acc + p.price : acc), 0);
    const anyPrice = plan.products.some((p) => p.price != null);
    plan.total = { value: anyPrice ? Math.round(sum) : null, currency };

    return new Response(JSON.stringify(plan), { headers });
  } catch (err: unknown) {
    const currency = "EUR";
    // Last-resort JSON so UI never breaks
    const fallback: PlanJson = {
      brief:
        "Quick starter outfit (safe fallback). Refresh to regenerate when connectivity recovers.",
      tips: ["Use monochrome layers to look cohesive.", "Add structure with tailored outerwear."],
      why: ["Clean lines lengthen the silhouette.", "Neutral palette feels intentional."],
      products: ensureMinimumProducts([], 4, currency),
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}

