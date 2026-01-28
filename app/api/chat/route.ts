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
      | { items?: Array<{ title?: unknown; url?: unknown }> }
      | null;
    const items = Array.isArray(data?.items) ? data!.items : [];

    const seen = new Set<string>();
    const out: Cand[] = [];
    for (const it of items) {
      const title = typeof it.title === "string" ? it.title : "";
      const urlStr = typeof it.url === "string" ? it.url : "";
      if (!title || !urlStr) continue;
      try {
        const u = new URL(urlStr);
        const key = `${u.hostname.replace(/^www\./, "")}${u.pathname}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ title, url: urlStr });
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

async function webSearchProducts(query: string): Promise<Cand[]> {
  if (!ALLOW_WEB || !process.env.TAVILY_API_KEY) return [];
  const booster =
    " site:(zara.com OR mango.com OR hm.com OR net-a-porter.com OR farfetch.com OR uniqlo.com OR cos.com OR arket.com OR massimodutti.com)";
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

const MOCK_CATALOG: UiProduct[] = [
  {
    id: "cos-rib-tee",
    title: "COS Heavyweight Ribbed T-Shirt",
    url: "https://www.cos.com/",
    brand: "COS",
    category: "Top",
    price: null,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1520975657287-04f0b1436f4b?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "arket-wide-trouser",
    title: "ARKET Wide Wool Trousers",
    url: "https://www.arket.com/",
    brand: "ARKET",
    category: "Bottom",
    price: null,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "massimo-trench",
    title: "Massimo Dutti Double-Breasted Trench",
    url: "https://www.massimodutti.com/",
    brand: "Massimo Dutti",
    category: "Outerwear",
    price: null,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1520975867597-0f643f1f1f47?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "zara-boots",
    title: "Zara Leather Ankle Boots",
    url: "https://www.zara.com/",
    brand: "Zara",
    category: "Shoes",
    price: null,
    currency: "EUR",
    image:
      "https://images.unsplash.com/photo-1528701800489-20be3c1ea2d3?q=80&w=800&auto=format&fit=crop",
  },
];

function ensureMinimumProducts(current: UiProduct[], min: number, currency: string): UiProduct[] {
  const out = [...current];
  if (out.length >= min) return out;
  for (const p of MOCK_CATALOG) {
    if (out.length >= min) break;
    out.push({ ...p, currency });
  }
  return out;
}

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
    typeof x["brand"] === "string" && (x["brand"] as string).trim() ? (x["brand"] as string) : null;

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
    typeof totalObj["currency"] === "string" ? (totalObj["currency"] as string) : fallbackCurrency;
  const totalValue = asNumberOrNull(totalObj["value"]);

  return { brief, tips, why, products, total: { value: totalValue, currency: totalCurrency } };
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
              providers: ["web"],
            }),
          }),
          timeout<Response>(4000, new Response(null, { status: 599 })),
        ]);

        if (!resp.ok) return;

        const data = (await resp.json().catch(() => null)) as
          | { items?: Array<{ title?: unknown; url?: unknown; image?: unknown; price?: unknown; currency?: unknown }> }
          | null;

        const firstItem = Array.isArray(data?.items) ? data!.items[0] : undefined;
        if (!firstItem) return;

        const urlStr = typeof firstItem.url === "string" ? firstItem.url : null;
        const imgStr = typeof firstItem.image === "string" ? firstItem.image : null;
        const priceNum =
          typeof firstItem.price === "number" && Number.isFinite(firstItem.price) ? firstItem.price : null;
        const curStr = typeof firstItem.currency === "string" ? firstItem.currency : p.currency;

        enriched[idx] = {
          ...p,
          url: p.url ?? urlStr,
          image: p.image ?? imgStr,
          price: p.price ?? priceNum,
          currency: curStr,
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

    const providerCandPromise = providerCandidates(req.url, queryString, preferences);
    const tavilyCandPromise =
      ALLOW_WEB && process.env.TAVILY_API_KEY ? webSearchProducts(queryString) : Promise.resolve([] as Cand[]);

    const [prov, tav] = await Promise.all([
      Promise.race([providerCandPromise, timeout<Cand[]>(4500, [])]),
      Promise.race([tavilyCandPromise, timeout<Cand[]>(3500, [])]),
    ]);

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
      candidatesBlock(merged),
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

    if (!plan) {
      plan = {
        brief: `Tailored to “${userText}”.`,
        tips: ["Use a cohesive palette.", "Balance structure with softness."],
        why: ["Clean proportions flatter more body types.", "Practical choices still read editorial."],
        products: [],
        total: { value: null, currency },
      };
    }

    // Ensure we have at least 4 items
    plan.products = ensureMinimumProducts(plan.products, 4, currency);

    // Backfill missing urls/images/prices using the web provider
    plan.products = await enrichMissingLinks(req.url, preferences, plan.products);

    const sum = plan.products.reduce((acc, p) => (p.price != null ? acc + p.price : acc), 0);
    const anyPrice = plan.products.some((p) => p.price != null);
    plan.total = { value: anyPrice ? Math.round(sum) : null, currency };

    return new Response(JSON.stringify(plan), { headers });
  } catch {
    const currency = "EUR";
    const fallback: PlanJson = {
      brief: "Quick starter outfit (safe fallback). Refresh to regenerate when connectivity recovers.",
      tips: ["Use monochrome layers to look cohesive.", "Add structure with tailored outerwear."],
      why: ["Clean lines lengthen the silhouette.", "Neutral palette feels intentional."],
      products: ensureMinimumProducts([], 4, currency),
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}
