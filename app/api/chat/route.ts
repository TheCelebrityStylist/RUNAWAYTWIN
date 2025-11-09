// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Chat → JSON stylist plan with provider-backed links.
 *
 * Inputs:
 *   - messages[]: chat history
 *   - preferences: styling + budget context
 *
 * Output (strict JSON):
 *   {
 *     brief: string,
 *     tips: string[],
 *     why: string[],
 *     products: Array<{
 *       id: string,
 *       title: string,
 *       url: string | null,
 *       brand: string | null,
 *       category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory",
 *       price: number | null,
 *       currency: string,
 *       image: string | null
 *     }>,
 *     total: { value: number | null, currency: string }
 *   }
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

/* ------------------------- basic helpers -------------------------- */

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
    "USER PROFILE (obey strictly in your choices)",
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ?? "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    "HARD: Your brief MUST reference the user's last message and these preferences.",
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

/* ---------------- Provider-backed candidates ONLY ---------------- */

/**
 * Call our own /api/products/search (AWIN/Rakuten/Amazon) to get ranked products.
 * Edge runtime requires ABSOLUTE URL.
 */
async function providerCandidates(
  baseUrl: string,
  query: string,
  prefs: Prefs
): Promise<Cand[]> {
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

    if (!resp.ok) {
      console.error("[chat] /api/products/search status", resp.status);
      return [];
    }

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
        // ignore bad url
      }
      if (out.length >= 20) break;
    }

    if (!out.length) {
      console.warn("[chat] providerCandidates: no items from /api/products/search");
    }

    return out;
  } catch (err) {
    console.error("[chat] providerCandidates error", err);
    return [];
  }
}

function candidatesBlock(cands: Cand[]) {
  if (!cands.length) return "CANDIDATE_LINKS: []";
  const lines = cands.map(
    (c, i) =>
      `{"i":${i},"title":${JSON.stringify(c.title)},"url":${JSON.stringify(
        c.url
      )}}`
  );
  return `CANDIDATE_LINKS: [${lines.join(",")}]`;
}

/* ----------------- Example fallback catalog ------------------ */

const MOCK_CATALOG: UiProduct[] = [
  {
    id: "example-blazer",
    title: "Tailored Black Blazer",
    url: null,
    brand: "Example",
    category: "Outerwear",
    price: 120,
    currency: "EUR",
    image: null,
  },
  {
    id: "example-trouser",
    title: "High-Waisted Trousers",
    url: null,
    brand: "Example",
    category: "Bottom",
    price: 80,
    currency: "EUR",
    image: null,
  },
  {
    id: "example-shirt",
    title: "Crisp White Shirt",
    url: null,
    brand: "Example",
    category: "Top",
    price: 50,
    currency: "EUR",
    image: null,
  },
  {
    id: "example-loafer",
    title: "Minimal Leather Loafers",
    url: null,
    brand: "Example",
    category: "Shoes",
    price: 90,
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

function productFromModel(
  x: unknown,
  fallbackCurrency: string
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
  const category = allowed.has(rawCat)
    ? (rawCat as UiProduct["category"])
    : "Accessory";

  const url =
    typeof x["url"] === "string" && x["url"].trim().length
      ? (x["url"] as string)
      : null;
  const brand =
    typeof x["brand"] === "string" && x["brand"].trim().length
      ? (x["brand"] as string)
      : null;

  const currency =
    typeof x["currency"] === "string" && x["currency"].trim().length
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
    image:
      typeof x["image"] === "string" && x["image"].trim().length
        ? (x["image"] as string)
        : null,
  };
}

function coercePlan(
  content: string,
  fallbackCurrency: string
): PlanJson | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    console.error("[chat] model did not return JSON");
    return null;
  }
  if (!isObj(raw)) return null;

  const brief = asString(raw["brief"], "");
  const tips = Array.isArray(raw["tips"])
    ? ((raw["tips"] as unknown[]).filter(
        (s) => typeof s === "string"
      ) as string[])
    : [];
  const why = Array.isArray(raw["why"])
    ? ((raw["why"] as unknown[]).filter(
        (s) => typeof s === "string"
      ) as string[])
    : [];

  const productsRaw = Array.isArray(raw["products"])
    ? (raw["products"] as unknown[])
    : [];
  const products = productsRaw
    .map((p) => productFromModel(p, fallbackCurrency))
    .filter((p): p is UiProduct => !!p);

  const totalObj = isObj(raw["total"])
    ? (raw["total"] as Record<string, unknown>)
    : {};
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
    if (
      !(req.headers.get("content-type") || "").includes("application/json")
    ) {
      return new Response(
        JSON.stringify({ error: "Expected application/json body." }),
        { status: 415, headers }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
      preferences?: Prefs;
    };

    const history: ChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];
    const preferences: Prefs = (body?.preferences || {}) as Prefs;

    const userText = lastUserText(history);
    if (!userText) {
      return new Response(
        JSON.stringify({
          error:
            "Tell me your occasion, body type, budget, and any muse. I’ll style a full look.",
        }),
        { status: 400, headers }
      );
    }

    const baseUrl =
      (req.nextUrl && req.nextUrl.origin) ||
      new URL(req.url).origin;

    const queryString = [
      userText,
      preferences.styleKeywords,
      preferences.bodyType,
      preferences.country,
    ]
      .filter(Boolean)
      .join(" ");

    // Provider-backed candidates only
    const cand = await providerCandidates(baseUrl, queryString, preferences);

    const sys = [
      "You are an editorial-level fashion stylist and merchandiser.",
      "Return ONLY a single JSON object with this exact TypeScript shape:",
      'type Product = { id: string; title: string; url: string | null; brand: string | null; category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory"; price: number | null; currency: string; image: string | null };',
      "type Plan = { brief: string; tips: string[]; why: string[]; products: Product[]; total: { value: number | null; currency: string } };",
      "",
      "RULES:",
      "- Your brief MUST explicitly reference the user's last message and the profile.",
      "- You may ONLY use URLs from CANDIDATE_LINKS. If no suitable URL, set url: null.",
      "- Include AT LEAST 4 products spanning key categories (Outerwear/Top/Bottom/Shoes/Bag).",
      "- If candidate list is empty, you may output products with url: null as styled examples.",
      "- Never output markdown or extra keys.",
      "",
      prefsBlock(preferences),
      "",
      candidatesBlock(cand),
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
            ...history.map((m) => ({
              role: m.role,
              content: contentToText(m.content),
            })),
            {
              role: "user",
              content:
                "Return the Plan JSON now. No commentary. No markdown.",
            },
          ],
        });
        const raw = completion.choices?.[0]?.message?.content || "{}";
        plan = coercePlan(raw, currency);
      } catch (err) {
        console.error("[chat] OpenAI error", err);
        plan = null;
      }
    }

    // Fallback: deterministic example so UI never breaks
    if (!plan) {
      plan = {
        brief:
          `Styled to “${userText}” using example products only. Connect more retailers via AWIN/Rakuten/Amazon to see live links.`,
        tips: [
          "Balance proportion with sharp tailoring and defined waist.",
          "Keep a coherent palette so pieces remix across looks.",
        ],
        why: [
          "Structure plus softness reads elevated and intentional.",
          "Clean lines photograph well and suit varied occasions.",
        ],
        products: [],
        total: { value: null, currency },
      };
    }

    // Ensure minimum cards; if providers worked, they already include urls.
    plan.products = ensureMinimumProducts(plan.products, 4, currency);

    // Compute total from priced items
    const sum = plan.products.reduce(
      (acc, p) => (p.price != null ? acc + p.price : acc),
      0
    );
    const anyPrice = plan.products.some((p) => p.price != null);
    plan.total = { value: anyPrice ? Math.round(sum) : null, currency };

    return new Response(JSON.stringify(plan), { headers });
  } catch (err) {
    console.error("[chat] Fatal error", err);

    const currency = "EUR";
    const fallback: PlanJson = {
      brief:
        "Safe fallback look. Connect retailers correctly to enable live product pulls.",
      tips: [
        "Use monochrome layers for coherence.",
        "Anchor outfits with one strong tailored piece.",
      ],
      why: [
        "Simple architecture keeps the look elevated.",
        "Neutral base maximizes re-wear.",
      ],
      products: ensureMinimumProducts([], 4, currency),
      total: { value: null, currency },
    };

    return new Response(JSON.stringify(fallback), {
      headers,
      status: 200,
    });
  }
}

