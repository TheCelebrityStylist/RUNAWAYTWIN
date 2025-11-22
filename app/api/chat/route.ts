// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Chat → JSON stylist plan backed by real-time products.
 *
 * Flow:
 * 1) Call /api/products/search with user query + preferences → live catalog.
 * 2) Send catalog + profile to OpenAI → it returns productIds + explanation.
 * 3) Map productIds back to catalog to build final PlanJson for the UI.
 *
 * Always returns:
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

type UiCategory =
  | "Top"
  | "Bottom"
  | "Dress"
  | "Outerwear"
  | "Shoes"
  | "Bag"
  | "Accessory";

type UiProduct = {
  id: string;
  title: string;
  url: string | null;
  brand: string | null;
  category: UiCategory;
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
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Budget: ${p.budget ?? "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
  ].join("\n");
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asNumberOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/* ----------------- Mock catalog (only as last resort) ------------------ */

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
];

function ensureMinimumProducts(current: UiProduct[], min: number, currency: string): UiProduct[] {
  const out = [...current];
  for (const p of MOCK_CATALOG) {
    if (out.length >= min) break;
    out.push({ ...p, currency });
  }
  return out.slice(0, Math.max(min, out.length));
}

/* ------------- Types for /api/products/search response ------------------ */

type SearchProduct = {
  id: string;
  title: string;
  brand?: string | null;
  retailer?: string | null;
  url?: string | null;
  image?: string | null;
  price?: number | null;
  currency?: string | null;
  fit?: {
    gender?: string | null;
    category?: string | null;
    sizes?: string[] | null;
  } | null;
};

type SearchResponse = {
  ok?: boolean;
  items?: SearchProduct[];
};

/* -------- Map generic search product → UI product for the stylist -------- */

function normalizeCategory(raw?: string | null): UiCategory {
  if (!raw) return "Accessory";
  const s = raw.toLowerCase();

  if (s.includes("coat") || s.includes("jacket") || s.includes("trench") || s.includes("outer"))
    return "Outerwear";
  if (s.includes("dress")) return "Dress";
  if (
    s.includes("jean") ||
    s.includes("trouser") ||
    s.includes("pant") ||
    s.includes("skirt") ||
    s.includes("short")
  )
    return "Bottom";
  if (s.includes("shoe") || s.includes("boot") || s.includes("sandal") || s.includes("heel"))
    return "Shoes";
  if (s.includes("bag") || s.includes("tote") || s.includes("clutch")) return "Bag";
  if (
    s.includes("shirt") ||
    s.includes("top") ||
    s.includes("tee") ||
    s.includes("t-shirt") ||
    s.includes("blouse") ||
    s.includes("sweater") ||
    s.includes("jumper") ||
    s.includes("knit")
  )
    return "Top";

  return "Accessory";
}

function toUiProduct(p: SearchProduct, currencyFallback: string): UiProduct {
  const currency = (p.currency || currencyFallback || "EUR") as string;
  const cat = normalizeCategory(p.fit?.category ?? null);

  return {
    id: p.id,
    title: p.title || "Item",
    url: p.url || null,
    brand: p.brand ?? null,
    category: cat,
    price: typeof p.price === "number" ? p.price : null,
    currency,
    image: p.image ?? null,
  };
}

/* ---------------- Model JSON parsing (ids only) ----------------- */

type ModelPlan = {
  brief: string;
  tips: string[];
  why: string[];
  productIds: string[];
};

function parseModelPlan(content: string): ModelPlan | null {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }
  if (!isObj(raw)) return null;

  const brief = typeof raw["brief"] === "string" ? (raw["brief"] as string) : "";
  const tips = Array.isArray(raw["tips"])
    ? (raw["tips"] as unknown[]).filter((t) => typeof t === "string") as string[]
    : [];
  const why = Array.isArray(raw["why"])
    ? (raw["why"] as unknown[]).filter((t) => typeof t === "string") as string[]
    : [];
  const productIds = Array.isArray(raw["productIds"])
    ? (raw["productIds"] as unknown[]).filter((t) => typeof t === "string") as string[]
    : [];

  return { brief, tips, why, productIds };
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

    /* 1) Fetch live catalog from /api/products/search */

    const queryString = [userText, preferences.styleKeywords, preferences.bodyType, preferences.country]
      .filter(Boolean)
      .join(" ");

    const searchUrl = new URL("/api/products/search", req.url);
    const searchResp = await fetch(searchUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: queryString,
        limit: 40,
        perProvider: 12,
        country: preferences.country,
        prefs: preferences,
        providers: ["awin", "rakuten", "amazon"],
      }),
    }).catch(() => null);

    let catalog: UiProduct[] = [];

    if (searchResp && searchResp.ok) {
      const data = (await searchResp.json().catch(() => ({}))) as SearchResponse;
      const items = Array.isArray(data.items) ? data.items : [];
      catalog = items.map((p) => toUiProduct(p, currency)).filter((p) => !!p.id && !!p.title);
    }

    // If affiliate providers return nothing, we’ll at least give the user something.
    if (!catalog.length) {
      catalog = MOCK_CATALOG.map((p) => ({ ...p, currency }));
    }

    // Create a map for fast lookup by id
    const productMap = new Map<string, UiProduct>();
    for (const p of catalog) {
      productMap.set(p.id, p);
    }

    /* 2) Ask OpenAI to choose from this catalog + explain */

    let modelPlan: ModelPlan | null = null;

    if (HAS_KEY) {
      const catalogForModel = catalog.map((p) => ({
        id: p.id,
        title: p.title,
        brand: p.brand,
        category: p.category,
        price: p.price,
        currency: p.currency,
      }));

      const sys = [
        "You are an elite fashion stylist.",
        "You receive:",
        "1) A USER PROFILE and their last message (occasion, celebrity muse, vibe).",
        "2) A CATALOG of real products with IDs.",
        "",
        "You must choose the BEST combination of pieces for a complete look.",
        "",
        "Return ONLY JSON with this shape:",
        'type Plan = { brief: string; tips: string[]; why: string[]; productIds: string[] };',
        "",
        "Rules:",
        "- Use ONLY IDs from the catalog. Never invent new products or IDs.",
        "- Prefer pieces that match: body type, budget level, weather implied by country/season, and described aesthetic.",
        "- Aim for at least: outerwear OR dress/top+bottom, plus shoes, plus bag/accessory when possible.",
        "- `brief` = 2–4 sentences, very specific to the user’s scenario and body type.",
        "- `tips` = concrete styling tips (fit tweaks, layering, proportions, accessories).",
        "- `why` = explanation of why these particular pieces work together and flatter the user.",
      ].join("\n");

      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            {
              role: "user",
              content: [
                prefsBlock(preferences),
                "",
                "USER LAST MESSAGE:",
                userText,
                "",
                "CATALOG (only choose from these IDs):",
                JSON.stringify(catalogForModel),
              ].join("\n"),
            },
          ],
        });

        const raw = completion.choices?.[0]?.message?.content || "{}";
        modelPlan = parseModelPlan(raw);
      } catch {
        modelPlan = null;
      }
    }

    /* 3) Build final PlanJson for the UI */

    let selectedProducts: UiProduct[] = [];

    if (modelPlan && modelPlan.productIds.length) {
      const used = new Set<string>();
      for (const id of modelPlan.productIds) {
        const p = productMap.get(id);
        if (p && !used.has(p.id)) {
          used.add(p.id);
          selectedProducts.push(p);
        }
      }

      // If model chose very few items, top up with remaining catalog items
      if (selectedProducts.length < 4) {
        for (const p of catalog) {
          if (selectedProducts.length >= 4) break;
          if (!used.has(p.id)) {
            used.add(p.id);
            selectedProducts.push(p);
          }
        }
      }
    } else {
      // No model plan → simple heuristic: take first 4 catalog items
      selectedProducts = catalog.slice(0, 4);
    }

    // As a safety net, always have at least 4 products
    selectedProducts = ensureMinimumProducts(selectedProducts, 4, currency);

    // Brief/tips/why
    const brief =
      modelPlan?.brief ||
      `Outfit tailored to “${userText}”, balancing your preferences with versatile, re-wearable pieces.`;
    const tips =
      modelPlan?.tips && modelPlan.tips.length
        ? modelPlan.tips
        : [
            "Adjust hem lengths so trousers just skim the top of your shoes for the longest leg line.",
            "Use tone-on-tone layering to look intentional while staying comfortable.",
          ];
    const why =
      modelPlan?.why && modelPlan.why.length
        ? modelPlan.why
        : [
            "These pieces share a coherent color story and similar level of formality.",
            "Silhouette focuses on balance between upper and lower body to flatter most body types.",
          ];

    // Total price (if available)
    const sum = selectedProducts.reduce((acc, p) => (p.price != null ? acc + p.price : acc), 0);
    const anyPrice = selectedProducts.some((p) => p.price != null);
    const total = { value: anyPrice ? Math.round(sum) : null, currency };

    const plan: PlanJson = {
      brief,
      tips,
      why,
      products: selectedProducts,
      total,
    };

    return new Response(JSON.stringify(plan), { headers });
  } catch {
    const currency = "EUR";
    const fallback: PlanJson = {
      brief:
        "Quick starter outfit (safe fallback). Refresh to regenerate when connectivity or providers recover.",
      tips: ["Use monochrome layers to look cohesive.", "Add structure with tailored outerwear."],
      why: ["Clean lines lengthen the silhouette.", "Neutral palette feels intentional."],
      products: ensureMinimumProducts([], 4, currency),
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}

