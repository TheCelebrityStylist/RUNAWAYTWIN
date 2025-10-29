// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";
import { searchCatalog } from "@/lib/catalog/mock";

/** JSON types returned to the client */
type GenProduct = {
  id: string;
  title: string;
  brand: string;
  category: "top" | "bottom" | "outerwear" | "dress" | "shoes" | "bag" | "accessory";
  price: number;
  currency: "EUR" | "USD" | "GBP";
  image: string;
  url: string;
  retailer: string;
  notes: string;
};
type GenResponse = {
  brief: string;
  why: string;
  tips: string[];
  products: GenProduct[];
  total: { value: number; currency: "EUR" | "USD" | "GBP" };
};

type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string | unknown[] };
type Prefs = {
  gender?: string;
  bodyType?: string;
  budget?: number | string;
  country?: string;
  currency?: string;
  styleKeywords?: string;
  sizes?: { top?: string; bottom?: string; dress?: string; shoe?: string };
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const HAS_KEY = Boolean(process.env.OPENAI_API_KEY);
const ALLOW_WEB = (process.env.ALLOW_WEB || "true").toLowerCase() !== "false";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------------- helpers ---------------- */
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
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i]?.role === "user") return contentToText(msgs[i].content);
  return "";
}
function currencyFor(p: Prefs): "EUR" | "USD" | "GBP" {
  if (p.currency === "USD" || p.country?.toUpperCase() === "US") return "USD";
  if (p.currency === "GBP" || p.country?.toUpperCase() === "UK") return "GBP";
  return "EUR";
}
function parseBudget(b?: number | string): number | undefined {
  if (typeof b === "number") return b;
  if (!b) return undefined;
  const s = String(b).toLowerCase();
  const num = Number(s.replace(/[^\d.]/g, ""));
  if (Number.isFinite(num) && num > 0) return num;
  if (s.includes("high-street")) return 300;
  if (s.includes("mid")) return 600;
  if (s.includes("luxury")) return 1800;
  return undefined;
}

/* ---------------- optional Tavily candidates (for future enhancement) ---------------- */
type Cand = { title: string; url: string };
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
      max_results: 8,
      include_answer: false,
      include_raw_content: false,
    }),
  }).catch(() => null);
  if (!resp || !resp.ok) return [];
  const data = (await resp.json().catch(() => ({}))) as {
    results?: Array<{ title?: unknown; url?: unknown }>;
  };
  const raw = Array.isArray(data.results) ? data.results : [];
  return raw
    .map((r) => ({ title: String(r?.title ?? ""), url: String(r?.url ?? "") }))
    .filter((x) => x.title && x.url)
    .slice(0, 8);
}

/* ---------------- synthesize products (mock or model) ---------------- */
function synthesizeFromCatalog(
  userText: string,
  prefs: Prefs,
  cur: "EUR" | "USD" | "GBP"
): GenResponse {
  const gender =
    prefs.gender === "female" || prefs.gender === "male" ? (prefs.gender as "female" | "male") : "unisex";
  const budgetMax = parseBudget(prefs.budget) || (cur === "USD" ? 600 : 500);
  const kws = (prefs.styleKeywords || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const matches = searchCatalog({
    q: userText,
    gender,
    budgetMax,
    keywords: kws,
  });

  // choose 4–6 diverse categories
  const chosen = [];
  const usedCats = new Set<string>();
  for (const p of matches) {
    const cat = p.categories[0];
    if (!usedCats.has(cat)) {
      chosen.push(p);
      usedCats.add(cat);
    }
    if (chosen.length >= 6) break;
  }
  if (!chosen.length) chosen.push(...matches.slice(0, 4));

  const total = chosen.reduce((s, p) => s + p.price, 0);

  return {
    brief: userText,
    why:
      "Balanced proportions with weather-aware layers. Pieces are capsule-friendly and respect the stated budget band.",
    tips: [
      "Keep a tight palette (2–3 tones) for cohesion.",
      "Tailor trouser hems to shoe height.",
      "Use thin thermals for warmth without bulk.",
    ],
    products: chosen.map((p) => ({
      id: p.id,
      title: p.title,
      brand: p.brand,
      category: p.categories[0],
      price: p.price,
      currency: p.currency || cur,
      image: p.image,
      url: p.url,
      retailer: p.retailer,
      notes: "True-to-size; easy to mix & match.",
    })),
    total: { value: total, currency: cur },
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

    const cur = currencyFor(preferences);

    // If no OPENAI key, or as a fast, deterministic path -> catalog synthesis.
    if (!HAS_KEY) {
      const json = synthesizeFromCatalog(userText, preferences, cur);
      return new Response(JSON.stringify(json), { headers });
    }

    // Optional: get a few candidates to flash in the prompt (not strictly required now).
    let cands: Cand[] = [];
    if (ALLOW_WEB && process.env.TAVILY_API_KEY) {
      const q = [userText, preferences.styleKeywords, preferences.bodyType, preferences.country]
        .filter(Boolean)
        .join(" ");
      cands = await Promise.race([
        webSearchProducts(q),
        new Promise<Cand[]>((resolve) => setTimeout(() => resolve([]), 4000)),
      ]);
    }

    // Ask the model for JSON. If it fails, fallback to catalog.
    let parsed: GenResponse | null = null;
    try {
      const sys = [
        "You are an editorial-level fashion stylist that outputs STRICT JSON only.",
        "Return a JSON object with keys: brief, why, tips (string[]), products (array), total {value, currency}.",
        "Each product must include: id, title, brand, category, price, currency, image, url, retailer, notes.",
        "Use user's country/currency and budget. Prefer capsule-friendly picks.",
        cands.length
          ? `You may consider these candidate links (do not invent): ${cands
              .map((c, i) => `[${i + 1}] ${c.title} — ${c.url}`)
              .join(" | ")}`
          : "",
      ]
        .join("\n")
        .trim();

      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userText },
          {
            role: "user",
            content: JSON.stringify({
              country: preferences.country ?? null,
              currency: cur,
              budget: preferences.budget ?? null,
              bodyType: preferences.bodyType ?? null,
              keywords: preferences.styleKeywords ?? null,
            }),
          },
        ],
      });

      const raw = completion.choices?.[0]?.message?.content || "{}";
      parsed = JSON.parse(raw) as GenResponse;

      // Guard rails
      if (
        !parsed ||
        !Array.isArray(parsed.products) ||
        parsed.products.length === 0 ||
        typeof parsed.total?.value !== "number"
      ) {
        parsed = null;
      }
    } catch {
      parsed = null;
    }

    if (!parsed) parsed = synthesizeFromCatalog(userText, preferences, cur);

    // Normalize currency just in case
    parsed.products = parsed.products.map((p) => ({
      ...p,
      currency: (p.currency || cur) as GenProduct["currency"],
    }));
    parsed.total = { value: parsed.total.value, currency: parsed.total.currency || cur };

    return new Response(JSON.stringify(parsed), { headers });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: String(err) }), { headers });
  }
}

