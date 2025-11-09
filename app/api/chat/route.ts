// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Chat → JSON stylist plan with grounded, linkable products.
 *
 * Pipeline:
 * 1. Read last user message + preferences.
 * 2. Query /api/products/search (AWIN/Rakuten/Amazon) for real products.
 * 3. (Optional) Query Tavily for extra public candidates if enabled.
 * 4. Give the model a STRICT schema + CANDIDATE_LINKS payload (full metadata).
 * 5. Force products to map to those candidates (by URL) when available.
 * 6. If no candidates, use MOCK_CATALOG with concrete URLs as fallback.
 *
 * Response (always JSON):
 * {
 *   brief: string,
 *   tips: string[],
 *   why: string[],
 *   products: {
 *     id: string;
 *     title: string;
 *     url: string | null;
 *     brand: string | null;
 *     category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory";
 *     price: number | null;
 *     currency: string;
 *     image: string | null;
 *   }[],
 *   total: { value: number | null; currency: string }
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

type Cand = {
  id: string;
  title: string;
  url: string;
  brand?: string | null;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
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
    "USER PROFILE (use this to tailor the plan strictly)",
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ?? "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    "HARD REQUIREMENT: Your brief MUST reference the user's last message and these preferences.",
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

/* ---------------- Provider-backed candidates (primary) ---------------- */

/**
 * Use absolute URL (Edge-safe).
 * Reads from /api/products/search which already merges and ranks providers.
 * Expects `items` with Product shape from your affiliates/types.ts.
 */
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
        providers: ["awin", "rakuten", "amazon"],
      }),
    });

    if (!resp.ok) return [];

    const data = (await resp.json().catch(() => null)) as
      | { items?: Array<any> }
      | null;

    const items: any[] = Array.isArray(data?.items) ? data!.items : [];
    const seen = new Set<string>();
    const out: Cand[] = [];

    for (const it of items) {
      const title = typeof it.title === "string" ? it.title : "";
      const urlStr = typeof it.url === "string" ? it.url : "";
      if (!title || !urlStr) continue;

      let key: string;
      try {
        const u = new URL(urlStr);
        key = `${u.hostname.replace(/^www\./, "")}${u.pathname}`;
      } catch {
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);

      const brand =
        typeof it.brand === "string" && it.brand.trim() ? it.brand : null;
      const price =
        typeof it.price === "number" && Number.isFinite(it.price)
          ? it.price
          : null;
      const currency =
        typeof it.currency === "string" && it.currency.trim()
          ? it.currency
          : null;

      const image =
        typeof it.image === "string" && it.image.trim() ? it.image : null;

      // category: AWIN/Rakuten may expose via fit.category or attrs.category
      const catRaw =
        (it.fit && typeof it.fit.category === "string" && it.fit.category) ||
        (it.attrs && typeof it.attrs.category === "string" && it.attrs.category) ||
        null;

      out.push({
        id: String(it.id ?? key),
        title,
        url: urlStr,
        brand,
        category: catRaw,
        price,
        currency,
        image,
      });

      if (out.length >= 20) break;
    }

    return out;
  } catch {
    return [];
  }
}

/* ---------------- Tavily candidates (secondary/optional) ---------------- */

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
    .map((r, i) => ({
      id: `tavily-${i}`,
      title: typeof r?.title === "string" ? r.title : "",
      url: typeof r?.url === "string" ? r.url : "",
    }))
    .filter((x) => x.title && x.url)
    .slice(0, 12);
}

function candidatesBlock(cands: Cand[]) {
  if (!cands.length) return "CANDIDATE_LINKS: []";
  const payload = cands.map((c, i) => ({
    i,
    id: c.id,
    title: c.title,
    url: c.url,
    brand: c.brand ?? null,
    category: c.category ?? null,
    price: c.price ?? null,
    currency: c.currency ?? null,
    image: c.image ?? null,
  }));
  // Single-line JSON to keep prompt deterministic
  return `CANDIDATE_LINKS: ${JSON.stringify(payload)}`;
}

/* ----------------- Mock catalog (deterministic URLs) ------------------ */

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

function normalizeCategory(raw: string | null | undefined): UiProduct["category"] {
  if (!raw) return "Accessory";
  const v = raw.toLowerCase();
  if (v.includes("dress")) return "Dress";
  if (v.includes("coat") || v.includes("jacket") || v.includes("trench")) return "Outerwear";
  if (v.includes("shoe") || v.includes("boot") || v.includes("sneaker") || v.includes("heel"))
    return "Shoes";
  if (v.includes("bag")) return "Bag";
  if (v.includes("top") || v.includes("shirt") || v.includes("tee") || v.includes("blouse"))
    return "Top";
  if (v.includes("trouser") || v.includes("pant") || v.includes("jean") || v.includes("skirt"))
    return "Bottom";
  return "Accessory";
}

function productFromModel(x: unknown, fallbackCurrency: string): UiProduct | null {
  if (!isObj(x)) return null;

  const url = typeof x["url"] === "string" ? (x["url"] as string) : null;
  const brand =
    typeof x["brand"] === "string" && x["brand"].trim()
      ? (x["brand"] as string)
      : null;

  const catRaw =
    typeof x["category"] === "string" ? (x["category"] as string) : null;
  const category = normalizeCategory(catRaw);

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

    const queryString = [
      userText,
      preferences.styleKeywords,
      preferences.bodyType,
      preferences.country,
    ]
      .filter(Boolean)
      .join(" ");

    // 1) Collect candidates
    const providerCandPromise = providerCandidates(req.url, queryString, preferences);
    const tavilyCandPromise =
      ALLOW_WEB && process.env.TAVILY_API_KEY
        ? webSearchProducts(queryString)
        : Promise.resolve([] as Cand[]);

    const timeout = <T,>(ms: number, value: T) =>
      new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

    const [prov, tav] = await Promise.all([
      Promise.race([providerCandPromise, timeout<Cand[]>(4500, [])]),
      Promise.race([tavilyCandPromise, timeout<Cand[]>(3500, [])]),
    ]);

    // Merge; provider first
    const seen = new Set<string>();
    const merged: Cand[] = [];
    for (const src of [prov, tav]) {
      for (const c of src) {
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
      if (merged.length >= 20) break;
    }

    const hasCandidates = merged.length > 0;

    // 2) System prompt
    const sys = [
      "You are an editorial-level fashion stylist.",
      "Return ONLY a single JSON object with this exact TypeScript shape:",
      "type Product = { id: string; title: string; url: string | null; brand: string | null; category: \"Top\" | \"Bottom\" | \"Dress\" | \"Outerwear\" | \"Shoes\" | \"Bag\" | \"Accessory\"; price: number | null; currency: string; image: string | null };",
      "type Plan = { brief: string; tips: string[]; why: string[]; products: Product[]; total: { value: number | null; currency: string } };",
      "",
      "GROUNDING RULES:",
      "- If CANDIDATE_LINKS is not empty:",
      "  * Every product you output MUST correspond to one of those candidates (match by url).",
      "  * Copy its title, url, brand, price, currency, and image exactly when present.",
      "- If CANDIDATE_LINKS is empty:",
      "  * Describe the outfit and item TYPES; the system will attach concrete links.",
      "- Always include AT LEAST 4 products spanning key categories (Outerwear/Top/Bottom/Shoes/Bag).",
      "- Use the user's muse, body type, budget, country/weather, and style keywords to justify each choice.",
      "- No markdown, no commentary, no extra keys.",
      "",
      prefsBlock(preferences),
      "",
      candidatesBlock(merged),
    ].join("\n");

    const currency = currencyFor(preferences);
    let plan: PlanJson | null = null;

    if (HAS_KEY) {
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: 0.45,
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

    // 3) Fallback / enforcement

    if (!plan) {
      plan = {
        brief:
          `Tailored to “${userText}”. Capsule-leaning pieces matching your muse while respecting your stated constraints.`,
        tips: [
          "Lock your palette to 2–3 tones for instant cohesion.",
          "Balance volume: slim base with a structured or relaxed top layer, not both oversized.",
        ],
        why: [
          "Silhouettes echo the muse without feeling like costume.",
          "Each piece can rotate across multiple outfits for higher value per wear.",
        ],
        products: [],
        total: { value: null, currency },
      };
    }

    if (!hasCandidates) {
      // No real links: use concrete mock catalog for reliability.
      plan.products = ensureMinimumProducts([], 4, currency);
    } else {
      // We have grounded candidates: ensure we still show enough items.
      plan.products = ensureMinimumProducts(plan.products, 4, currency);
    }

    // Compute total if prices exist
    const sum = plan.products.reduce(
      (acc, p) => (p.price != null ? acc + p.price : acc),
      0
    );
    const anyPrice = plan.products.some((p) => p.price != null);
    plan.total = { value: anyPrice ? Math.round(sum) : null, currency };

    return new Response(JSON.stringify(plan), { headers });
  } catch {
    const currency = "EUR";
    const fallback: PlanJson = {
      brief: "Quick starter outfit (safe fallback).",
      tips: [
        "Use monochrome layers to look cohesive.",
        "Anchor each look with one sharp, structured piece.",
      ],
      why: [
        "Clean lines lengthen the silhouette.",
        "Controlled palette keeps everything mixable and elevated.",
      ],
      products: ensureMinimumProducts([], 4, currency),
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}

