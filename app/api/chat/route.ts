// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Chat → JSON stylist plan with guaranteed, linkable products.
 *
 * Behaviour:
 * - Uses /api/products/search (AWIN-backed) to fetch ranked candidates.
 * - Feeds candidates + user prefs into OpenAI with a strict JSON schema.
 * - Forces the brief to mention the actual request + preferences.
 * - Only falls back to a small mock catalog if NO products are returned.
 *
 * Response JSON:
 * {
 *   brief: string;
 *   tips: string[];
 *   why: string[];
 *   products: {
 *     id: string;
 *     title: string;
 *     url: string | null;
 *     brand: string | null;
 *     category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory";
 *     price: number | null;
 *     currency: string;
 *     image: string | null;
 *   }[];
 *   total: { value: number | null; currency: string };
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
    "USER PROFILE (tailor the look STRICTLY to this):",
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget (soft band): ${p.budget ?? "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    "",
    "Your brief MUST:",
    "- Explicitly reference the user's last message (muse + occasion).",
    "- Explicitly reflect these preferences (body type, budget, climate/country when present).",
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
 * Hits our internal /api/products/search to retrieve ranked products from AWIN, etc.
 * Uses ABSOLUTE URL (Edge requirement).
 *
 * For now we only pass ["awin"] so behaviour matches what you actually have set up.
 * You can add "rakuten" | "amazon" here later once wired.
 */
async function providerCandidates(
  baseUrl: string,
  query: string,
  prefs: Prefs
): Promise<Cand[]> {
  try {
    const resp = await fetch(new URL("/api/products/search", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit: 24,
        perProvider: 12,
        country: prefs.country,
        prefs,
        providers: ["awin"],
      }),
    });

    if (!resp.ok) return [];

    const data = (await resp.json().catch(() => null)) as
      | { items?: Array<{ title?: unknown; url?: unknown }> }
      | null;

    const items = Array.isArray(data?.items) ? data!.items : [];
    const seen = new Set<string>();
    const out: Cand[] = [];

    for (const it of items) {
      const title = typeof (it as any).title === "string" ? (it as any).title : "";
      const url = typeof (it as any).url === "string" ? (it as any).url : "";
      if (!title || !url) continue;

      try {
        const u = new URL(url);
        const key = `${u.hostname.replace(/^www\./, "")}${u.pathname}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ title, url });
      } catch {
        // ignore malformed urls
      }

      if (out.length >= 20) break;
    }

    return out;
  } catch {
    return [];
  }
}

/* ---------------- Tavily candidates (optional, secondary) ---------------- */

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

function candidatesBlock(cands: Cand[]): string {
  if (!cands.length) {
    return [
      "CANDIDATE_LINKS: []",
      "If this list is empty, you MUST still output at least 4 products with realistic items,",
      "but set url: null for them (do NOT invent random store links).",
    ].join("\n");
  }
  const lines = cands.map(
    (c, i) => `{"i":${i},"title":${JSON.stringify(c.title)},"url":${JSON.stringify(c.url)}}`
  );
  return `CANDIDATE_LINKS: [${lines.join(",")}]`;
}

/* ----------------- Mock catalog (fallback only) ------------------ */

const MOCK_CATALOG: UiProduct[] = [
  {
    id: "cos-rib-tee",
    title: "COS Heavyweight Ribbed T-Shirt",
    url: "https://www.cos.com/",
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
    url: "https://www.arket.com/",
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
    url: "https://www.massimodutti.com/",
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
    url: "https://www.zara.com/",
    brand: "Zara",
    category: "Shoes",
    price: 99,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1517840901100-8179e982acb7?q=80&w=800&auto=format&fit=crop",
  },
];

function ensureMinimumProducts(
  current: UiProduct[],
  min: number,
  currency: string
): UiProduct[] {
  // IMPORTANT: only use mock catalog when we have zero items.
  if (current && current.length > 0) return current;
  const out: UiProduct[] = [];
  for (const p of MOCK_CATALOG) {
    if (out.length >= min) break;
    out.push({ ...p, currency });
  }
  return out;
}

/* ---------------- JSON coercion helpers ---------------- */

function productFromModel(x: unknown, fallbackCurrency: string): UiProduct | null {
  if (!isObj(x)) return null;

  const rawCat = asString(x["category"], "Accessory");
  const allowed: UiProduct["category"][] = [
    "Top",
    "Bottom",
    "Dress",
    "Outerwear",
    "Shoes",
    "Bag",
    "Accessory",
  ];
  const category = (allowed.includes(rawCat as any)
    ? rawCat
    : "Accessory") as UiProduct["category"];

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

  if (!brief && !products.length && !tips.length && !why.length) return null;

  return {
    brief,
    tips,
    why,
    products,
    total: { value: totalValue, currency: totalCurrency },
  };
}

/* ---------------- misc ---------------- */

function timeout<T>(ms: number, value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
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

    const currency = currencyFor(preferences);
    const baseUrl = req.nextUrl.origin;

    // Build a targeted search query
    const searchQuery =
      [
        userText,
        preferences.styleKeywords,
        preferences.bodyType,
        preferences.gender,
      ]
        .filter(Boolean)
        .join(" ") || userText;

    // 1) Fetch provider candidates (AWIN etc.) + optional Tavily, with timeouts
    const providerCandPromise = providerCandidates(baseUrl, searchQuery, preferences);
    const tavilyCandPromise =
      ALLOW_WEB && process.env.TAVILY_API_KEY
        ? webSearchProducts(searchQuery)
        : Promise.resolve([] as Cand[]);

    const [prov, tav] = await Promise.all([
      Promise.race([providerCandPromise, timeout<Cand[]>(4500, [])]),
      Promise.race([tavilyCandPromise, timeout<Cand[]>(3500, [])]),
    ]);

    // Merge + dedupe, provider links first
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
          // ignore bad url
        }
        if (merged.length >= 20) break;
      }
      if (merged.length >= 20) break;
    }

    // 2) System prompt
    const sys = [
      "You are an editorial-level fashion stylist.",
      "Return ONLY a single JSON object with this exact TypeScript shape:",
      "type Product = { id: string; title: string; url: string | null; brand: string | null; category: \"Top\" | \"Bottom\" | \"Dress\" | \"Outerwear\" | \"Shoes\" | \"Bag\" | \"Accessory\"; price: number | null; currency: string; image: string | null };",
      "type Plan = { brief: string; tips: string[]; why: string[]; products: Product[]; total: { value: number | null; currency: string } };",
      "",
      "HARD RULES:",
      "- Your brief MUST explicitly reference the user's last message (muse + occasion) AND the profile.",
      "- Products MUST align with that muse (silhouette, palette, vibe) and feel shop-ready.",
      "- Use URLs ONLY from CANDIDATE_LINKS when available (copy exactly). If none fit, set url: null.",
      "- Output at least 4 products that together form a head-to-toe look.",
      "- Use realistic prices; if unknown, use null. Keep currency consistent.",
      "- No markdown, no extra keys, no prose around the JSON.",
      "",
      prefsBlock(preferences),
      "",
      candidatesBlock(merged),
    ].join("\n");

    let plan: PlanJson | null = null;

    // 3) Call OpenAI
    if (HAS_KEY) {
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: 0.5,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            ...history.map((m) => ({
              role: m.role,
              content: contentToText(m.content),
            })),
            {
              role: "user",
              content:
                "Return the Plan JSON now, following the schema and rules exactly. No markdown.",
            },
          ],
        });

        const raw = completion.choices?.[0]?.message?.content || "{}";
        plan = coercePlan(raw, currency);
      } catch {
        plan = null;
      }
    }

    // 4) Fallback if model JSON unusable
    if (!plan) {
      plan = {
        brief: `Tailored to “${userText}”. A clean, modern look aligned with your notes, using capsule-friendly pieces.`,
        tips: [
          "Balance proportions to keep the line long.",
          "Repeat 2–3 key colors for cohesion.",
        ],
        why: [
          "Silhouette and palette stay close to your inspiration.",
          "Every item can be remixed into other outfits.",
        ],
        products: [],
        total: { value: null, currency },
      };
    }

    // 5) Only if no products at all: inject mock catalog
    plan.products = ensureMinimumProducts(plan.products, 4, currency);

    // 6) Compute total when we have any prices
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
      brief:
        "Safe fallback look. Something went wrong connecting to live products, so this is a neutral capsule starter.",
      tips: [
        "Use monochrome layers for an intentional feel.",
        "Add one structured piece to elevate basics.",
      ],
      why: [
        "Simple lines are forgiving across body types.",
        "A tight color story makes outfits feel elevated.",
      ],
      products: ensureMinimumProducts([], 4, currency),
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}
