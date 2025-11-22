// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const HAS_KEY = Boolean(process.env.OPENAI_API_KEY);

/* =======================================================================
   Types
   ======================================================================= */

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

/* =======================================================================
   Basic helpers
   ======================================================================= */

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

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function asString(x: unknown, def = ""): string {
  return typeof x === "string" ? x : def;
}
function asNumberOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
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
  ].join("\n");
}

/* =======================================================================
   Call /api/products/search → AWIN / Rakuten / Amazon products
   ======================================================================= */

type SearchApiProduct = {
  id: string;
  title: string;
  brand?: string | null;
  url?: string;
  image?: string | null;
  price?: number | null;
  currency?: string | null;
  fit?: {
    category?: string | null;
    gender?: string | null;
    sizes?: string[] | null;
  } | null;
};

async function fetchProviderProducts(
  req: NextRequest,
  query: string,
  prefs: Prefs
): Promise<UiProduct[]> {
  // Build absolute URL to /api/products/search for edge runtime
  const base = new URL(req.url);
  const searchUrl = new URL("/api/products/search", base.origin);

  try {
    const resp = await fetch(searchUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        limit: 40,
        perProvider: 12,
        country: prefs.country,
        prefs,
        // You can narrow this if you want, e.g. ["awin"]
        providers: ["awin", "amazon", "rakuten"],
      }),
    });

    if (!resp.ok) {
      return [];
    }

    const data = (await resp.json().catch(() => ({}))) as {
      ok?: boolean;
      items?: SearchApiProduct[];
    };

    const items = Array.isArray(data.items) ? data.items : [];
    const cur = currencyFor(prefs);

    const mapped: UiProduct[] = items
      .map((p): UiProduct | null => {
        const id = asString(p.id, "").trim();
        const title = asString(p.title, "").trim();
        if (!id || !title) return null;

        const url = typeof p.url === "string" && p.url.trim() ? p.url.trim() : null;
        const brand =
          typeof p.brand === "string" && p.brand.trim() ? p.brand.trim() : null;
        const image =
          typeof p.image === "string" && p.image.trim() ? p.image.trim() : null;

        const rawCat =
          (p.fit?.category || "").toString().toLowerCase().trim() || "accessory";

        let category: UiCategory = "Accessory";
        if (rawCat.includes("coat") || rawCat.includes("jacket") || rawCat.includes("outer"))
          category = "Outerwear";
        else if (rawCat.includes("dress")) category = "Dress";
        else if (
          rawCat.includes("trousers") ||
          rawCat.includes("pants") ||
          rawCat.includes("jeans") ||
          rawCat.includes("skirt") ||
          rawCat.includes("bottom")
        )
          category = "Bottom";
        else if (
          rawCat.includes("top") ||
          rawCat.includes("shirt") ||
          rawCat.includes("blouse") ||
          rawCat.includes("tee") ||
          rawCat.includes("t-shirt") ||
          rawCat.includes("sweater") ||
          rawCat.includes("knit")
        )
          category = "Top";
        else if (
          rawCat.includes("shoe") ||
          rawCat.includes("boot") ||
          rawCat.includes("sneaker") ||
          rawCat.includes("loafer") ||
          rawCat.includes("heel")
        )
          category = "Shoes";
        else if (rawCat.includes("bag")) category = "Bag";

        const price =
          typeof p.price === "number"
            ? p.price
            : typeof p.price === "string"
            ? Number(p.price.replace(",", "."))
            : null;

        const currency =
          typeof p.currency === "string" && p.currency.trim()
            ? p.currency.trim()
            : cur;

        return {
          id,
          title,
          url,
          brand,
          image,
          price: Number.isFinite(price as number) ? (price as number) : null,
          currency,
          category,
        };
      })
      .filter((x): x is UiProduct => !!x);

    return mapped;
  } catch {
    return [];
  }
}

/* =======================================================================
   JSON coercion for model output
   ======================================================================= */

function productFromModel(x: unknown, fallbackCurrency: string): UiProduct | null {
  if (!isObj(x)) return null;

  const allowed = new Set<UiCategory>([
    "Top",
    "Bottom",
    "Dress",
    "Outerwear",
    "Shoes",
    "Bag",
    "Accessory",
  ]);

  const rawCat = asString(x["category"], "Accessory") as UiCategory;
  const category = allowed.has(rawCat) ? rawCat : "Accessory";

  const url = typeof x["url"] === "string" ? (x["url"] as string) : null;
  const brand =
    typeof x["brand"] === "string" && x["brand"].trim() ? (x["brand"] as string) : null;

  const currency =
    typeof x["currency"] === "string" && (x["currency"] as string).trim()
      ? (x["currency"] as string)
      : fallbackCurrency;

  return {
    id: asString(x["id"], "item"),
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

/* =======================================================================
   Route
   ======================================================================= */

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

    // -------------------------------------------------------------------
    // 1) Fetch real products from your providers (AWIN / etc.)
    // -------------------------------------------------------------------
    const queryString = [userText, preferences.styleKeywords, preferences.bodyType]
      .filter(Boolean)
      .join(" ");

    const providerProducts = await fetchProviderProducts(req, queryString, preferences);

    // If nothing comes back, we still continue – model will create a text-only plan.
    // The UI will then show items with `url: null` ("No link").
    const productsJsonForModel = JSON.stringify(
      providerProducts.map((p) => ({
        id: p.id,
        title: p.title,
        brand: p.brand,
        url: p.url,
        image: p.image,
        price: p.price,
        currency: p.currency,
        category: p.category,
      }))
    );

    // -------------------------------------------------------------------
    // 2) Ask the model to build the plan, strictly reusing those products
    // -------------------------------------------------------------------
    let plan: PlanJson | null = null;

    if (HAS_KEY) {
      const sys = [
        "You are an editorial-level fashion stylist.",
        "You receive a JSON array called PRODUCTS. Each element is:",
        "{ id, title, brand, url, image, price, currency, category }.",
        "",
        "Your job:",
        "- Read the user's request and the USER PROFILE.",
        "- Select 4–8 items from PRODUCTS that best fit the brief AND the body type, budget, country/weather.",
        "- You may re-label the category if it makes more sense (Top/Bottom/Dress/Outerwear/Shoes/Bag/Accessory),",
        "  but you MUST copy `id` and `url` exactly from PRODUCTS for any chosen item.",
        "- If PRODUCTS is empty, still return a Plan JSON with an empty products array (do NOT invent fake shop URLs).",
        "",
        "Return ONLY a single JSON object with this exact TypeScript shape:",
        "type Product = { id: string; title: string; url: string | null; brand: string | null; category: \"Top\" | \"Bottom\" | \"Dress\" | \"Outerwear\" | \"Shoes\" | \"Bag\" | \"Accessory\"; price: number | null; currency: string; image: string | null };",
        "type Plan = { brief: string; tips: string[]; why: string[]; products: Product[]; total: { value: number | null; currency: string } };",
        "",
        "Hard rules:",
        "- NEVER invent new shopping URLs. Only use urls that already exist in PRODUCTS; otherwise set url: null.",
        "- brief MUST explicitly mention the user's last message and the key preferences (body type, budget, climate).",
        "- tips should be short, practical bullet points.",
        "- why should explain why these particular pieces work for this user.",
        "",
        prefsBlock(preferences),
        "",
        `PRODUCTS = ${productsJsonForModel}`,
      ].join("\n");

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

    // -------------------------------------------------------------------
    // 3) Fallback if model failed: simple, deterministic plan
    // -------------------------------------------------------------------
    if (!plan) {
      const picks = providerProducts.slice(0, 4);
      const sum = picks.reduce((acc, p) => (p.price != null ? acc + p.price : acc), 0);
      const anyPrice = picks.some((p) => p.price != null);

      plan = {
        brief:
          `Simple fallback outfit for “${userText}”. Based on your preferences and the first products returned by our partners.`,
        tips: [
          "Use one statement piece and keep the rest minimal.",
          "Balance volume: if the top is relaxed, choose a neater bottom (and vice versa).",
        ],
        why: [
          "These pieces are easy to mix and match in a real wardrobe.",
          "They respect your rough budget and context while staying wearable.",
        ],
        products: picks,
        total: { value: anyPrice ? Math.round(sum) : null, currency },
      };
    }

    // -------------------------------------------------------------------
    // 4) Ensure at least 4 products if we actually have that many
    //    (but do NOT inject fake COS/Zara placeholders anymore)
    // -------------------------------------------------------------------
    if (plan.products.length === 0 && providerProducts.length > 0) {
      plan.products = providerProducts.slice(0, 4);
    } else if (plan.products.length < 4 && providerProducts.length > 0) {
      const existingIds = new Set(plan.products.map((p) => p.id));
      for (const p of providerProducts) {
        if (plan.products.length >= 4) break;
        if (!existingIds.has(p.id)) {
          plan.products.push(p);
          existingIds.add(p.id);
        }
      }
    }

    // Recalculate total if needed
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
        "Technical error – showing a minimal fallback suggestion. Refresh to try again.",
      tips: ["Keep your colour palette simple.", "Use one structured piece to polish the look."],
      why: ["Even a basic outfit feels intentional if the proportions are right."],
      products: [],
      total: { value: null, currency },
    };
    return new Response(JSON.stringify(fallback), { headers, status: 200 });
  }
}
