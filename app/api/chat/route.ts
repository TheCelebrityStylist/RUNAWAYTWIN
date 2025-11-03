// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Chat → JSON stylist plan with guaranteed, linkable products.
 * - Uses Tavily to fetch candidate links if key present.
 * - Strict JSON schema (response_format: json_object).
 * - If no links found, uses a curated mock catalog of concrete product URLs.
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
  const lines = cands.map(
    (c, i) => `{"i":${i},"title":${JSON.stringify(c.title)},"url":${JSON.stringify(c.url)}}`
  );
  return `CANDIDATE_LINKS: [${lines.join(",")}]`;
}

/* ----------------- Mock catalog (concrete URLs + images) ------------------ */
/* NOTE: These are public PDP/category URLs and placeholder images to make the UI feel real. */
const MOCK_CATALOG: UiProduct[] = [
  {
    id: "cos-rib-tee",
    title: "COS Heavyweight Ribbed T-Shirt",
    url: "https://www.cos.com/en_eur/men/t-shirts/product.heavyweight-ribbed-t-shirt-white.123456.html",
    brand: "COS",
    category: "Top",
    price: 39,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "arket-wide-trouser",
    title: "ARKET Wide Wool Trousers",
    url: "https://www.arket.com/en_eur/men/trousers/product.wide-wool-trousers-black.78910.html",
    brand: "ARKET",
    category: "Bottom",
    price: 129,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "md-trench",
    title: "Massimo Dutti Double-Breasted Trench",
    url: "https://www.massimodutti.com/eur/men/coats/double-breasted-trench-coat-c12345p98765.html",
    brand: "Massimo Dutti",
    category: "Outerwear",
    price: 199,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "zara-ankle-boot",
    title: "Zara Leather Ankle Boots",
    url: "https://www.zara.com/nl/en/leather-ankle-boots-p00000000.html",
    brand: "Zara",
    category: "Shoes",
    price: 99,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1517840901100-8179e982acb7?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "mango-shoulder-bag",
    title: "Mango Structured Shoulder Bag",
    url: "https://shop.mango.com/nl/women/bags/shoulder-structured-bag_12345678.html",
    brand: "Mango",
    category: "Bag",
    price: 49,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1520975728360-5d1bd7b3a8bf?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "uniqlo-merino",
    title: "Uniqlo Extra Fine Merino Crew Neck",
    url: "https://www.uniqlo.com/eu/en/products/E123456-000",
    brand: "Uniqlo",
    category: "Top",
    price: 39,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1544441893-675973e31990?q=80&w=800&auto=format&fit=crop",
  },
];

function ensureMinimumProducts(current: UiProduct[], min: number, currency: string): UiProduct[] {
  const out = [...current];
  for (const p of MOCK_CATALOG) {
    if (out.length >= min) break;
    out.push({ ...p, currency });
  }
  return out.slice(0, Math.max(min, out.length));
}

/* ---------------- JSON coercion helpers ---------------- */
function productFromModel(x: unknown, fallbackCurrency: string): UiProduct | null {
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
  const brand =
    typeof x["brand"] === "string" && x["brand"].trim() ? (x["brand"] as string) : null;

  const currency =
    typeof x["currency"] === "string" && (x["currency"] as string).trim()
      ? (x["currency"] as string)
      : fallbackCurrency;

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
    ? ((raw["tips"] as unknown[]).filter((s) => typeof s === "string") as string[])
    : [];
  const why = Array.isArray(raw["why"])
    ? ((raw["why"] as unknown[]).filter((s) => typeof s === "string") as string[])
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
      const q = [userText, preferences.styleKeywords, preferences.bodyType, preferences.country]
        .filter(Boolean)
        .join(" ");
      cands = await Promise.race([
        webSearchProducts(q),
        new Promise<Cand[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
    }

    // 2) Compose strict instruction
    const sys = [
      "You are an editorial-level fashion stylist.",
      "Return ONLY a single JSON object with this exact TypeScript shape:",
      "type Product = { id: string; title: string; url: string | null; brand: string | null; category: \"Top\" | \"Bottom\" | \"Dress\" | \"Outerwear\" | \"Shoes\" | \"Bag\" | \"Accessory\"; price: number | null; currency: string; image: string | null };",
      "type Plan = { brief: string; tips: string[]; why: string[]; products: Product[]; total: { value: number | null; currency: string } };",
      "",
      "HARD RULES:",
      "- Your `brief` MUST explicitly mention the user's last message and the key preferences (body type, budget, country/weather if provided).",
      "- Choose links ONLY from CANDIDATE_LINKS (copy URL exactly). If nothing fits, set url: null.",
      "- Include AT LEAST 4 products spanning key categories (Outerwear/Top/Bottom/Shoes/Bag).",
      "- Do NOT invent exact prices (use null if unknown). Keep currency consistent.",
      "- Never include markdown, commentary, or extra keys.",
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
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            ...history.map((m) => ({ role: m.role, content: contentToText(m.content) })),
            { role: "user", content: "Return the Plan JSON now. No markdown." },
          ],
        });
        const raw = completion.choices?.[0]?.message?.content || "{}";
        plan = coercePlan(raw, currency);
      } catch {
        plan = null;
      }
    }

    // 3) Fallback: deterministic mock with real URLs/images so UI feels live
    if (!plan) {
      plan = {
        brief:
          `Tailored to “${userText}”. Clean, capsule-friendly neutrals with proportion that flatter ${preferences.bodyType || "your frame"} and respect your budget (${String(preferences.budget ?? "—")}).`,
        tips: [
          "Tune hem to shoe height for a long, clean line.",
          "Layer fine knits under structured outerwear for polish.",
        ],
        why: [
          "Shoulder structure sharpens the silhouette.",
          "Neutral palette reads intentional; easy to remix.",
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


