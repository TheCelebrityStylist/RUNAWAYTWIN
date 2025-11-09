// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Chat → JSON stylist plan with affiliate-ready products.
 *
 * Key decisions:
 * - Only uses your own /api/products/search endpoint for candidates.
 *   That endpoint is backed by AWIN (and later others) + your link wrapper.
 * - NO generic web search, NO Instagram, NO random blogs.
 * - Strict JSON schema via response_format: json_object.
 * - Graceful fallback with mock products so UI never breaks.
 *
 * Response shape:
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

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ================= helpers ================= */

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
    "USER PROFILE (use this to tailor the plan strictly):",
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ?? "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    "HARD REQUIREMENT: Brief MUST reference the user's last message and these preferences.",
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

/* ============ Provider-backed candidates only ============ */
/**
 * Calls internal /api/products/search using an absolute URL.
 * That route already talks to AWIN and wraps links.
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
        providers: ["awin"], // focus on AWIN for now
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
      const url = typeof it.url === "string" ? it.url : "";
      if (!title || !url) continue;
      try {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./, "");
        // Hard filter: only keep real merchant / affiliate domains, skip socials
        if (
          host.includes("instagram.com") ||
          host.includes("facebook.com") ||
          host.includes("tiktok.com") ||
          host.includes("youtube.com") ||
          host.includes("x.com") ||
          host.includes("twitter.com")
        ) {
          continue;
        }
        const key = `${host}${u.pathname}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ title, url });
      } catch {
        // ignore bad URL
      }
      if (out.length >= 24) break;
    }

    return out;
  } catch {
    return [];
  }
}

function candidatesBlock(cands: Cand[]) {
  if (!cands.length) return "CANDIDATE_LINKS: []";
  const lines = cands.map(
    (c, i) => `{"i":${i},"title":${JSON.stringify(c.title)},"url":${JSON.stringify(c.url)}}`
  );
  return `CANDIDATE_LINKS: [${lines.join(",")}]`;
}

/* ----------------- Mock catalog (safe fallback) ------------------ */
const MOCK_CATALOG: UiProduct[] = [
  {
    id: "mock-blazer",
    title: "Tailored Black Blazer",
    url: null,
    brand: "Example",
    category: "Outerwear",
    price: 120,
    currency: "EUR",
    image: null,
  },
  {
    id: "mock-trouser",
    title: "High-Waisted Trousers",
    url: null,
    brand: "Example",
    category: "Bottom",
    price: 80,
    currency: "EUR",
    image: null,
  },
  {
    id: "mock-shirt",
    title: "Crisp White Shirt",
    url: null,
    brand: "Example",
    category: "Top",
    price: 50,
    currency: "EUR",
    image: null,
  },
  {
    id: "mock-shoes",
    title: "Minimal Leather Loafers",
    url: null,
    brand: "Example",
    category: "Shoes",
    price: 90,
    currency: "EUR",
    image: null,
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

/* ================= route ================= */
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

    // Provider candidates only (AWIN etc.)
    const providerCandPromise = providerCandidates(req.url, queryString, preferences);

    const timeout = <T,>(ms: number, value: T) =>
      new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

    const prov = await Promise.race([providerCandPromise, timeout<Cand[]>(5000, [])]);

    const merged = prov; // already filtered + de-duped

    const sys = [
      "You are an editorial-level fashion stylist.",
      "Return ONLY a single JSON object with this exact TypeScript shape:",
      "type Product = { id: string; title: string; url: string | null; brand: string | null; category: \"Top\" | \"Bottom\" | \"Dress\" | \"Outerwear\" | \"Shoes\" | \"Bag\" | \"Accessory\"; price: number | null; currency: string; image: string | null };",
      "type Plan = { brief: string; tips: string[]; why: string[]; products: Product[]; total: { value: number | null; currency: string } };",
      "",
      "HARD RULES:",
      "- Your `brief` MUST explicitly mention the user's last message and key preferences (body type, budget, country/weather if provided).",
      "- Choose product URLs ONLY from CANDIDATE_LINKS. If none fit, set url: null rather than inventing.",
      "- Include AT LEAST 4 products covering a coherent full look (Outerwear/Top/Bottom/Shoes/Bag or similar).",
      "- If price is unknown from the candidate, use null; never fabricate.",
      "- Never output markdown, text outside JSON, or extra keys.",
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

    if (!plan) {
      plan = {
        brief:
          `Tailored to “${userText}”. Clean, capsule-leaning look that respects your stated preferences and uses reliable retailers.`,
        tips: [
          "Keep your color story tight (2–3 tones) so each piece recombines.",
          "Anchor trend pieces with classic tailoring so looks age well.",
        ],
        why: [
          "Proportions chosen to lengthen the line and balance your frame.",
          "Texture mix keeps it elevated without feeling over-styled.",
        ],
        products: [],
        total: { value: null, currency },
      };
    }

    plan.products = ensureMinimumProducts(plan.products, 4, currency);

    const sum = plan.products.reduce((acc, p) => (p.price != null ? acc + p.price : acc), 0);
    const anyPrice = plan.products.some((p) => p.price != null);
    plan.total = { value: anyPrice ? Math.round(sum) : null, currency };

    return new Response(JSON.stringify(plan), { headers });
  } catch {
    const currency = "EUR";
    const fallback: PlanJson = {
      brief:
        "Quick starter outfit (safe fallback). Try again when connectivity stabilizes.",
      tips: [
        "Use monochrome layers to look cohesive.",
        "Lean on one strong outerwear piece to tie looks together.",
      ],
      why: [
        "Simple lines and a tight palette make outfits remixable.",
        "Balanced proportions avoid cutting the body at awkward points.",
      ],
      products: ensureMinimumProducts([], 4, currency),
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}

