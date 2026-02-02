// FILE: app/api/styleplan/route.ts
export const runtime = "nodejs";

import OpenAI from "openai";
import { NextRequest } from "next/server";
import type { StylePlan, SlotName } from "@/lib/style/types";

type Prefs = {
  gender?: string;
  bodyType?: string;
  budget?: string;
  country?: string;
  keywords?: string[];
  sizes?: { top?: string; bottom?: string; dress?: string; shoe?: string };
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const HAS_KEY = Boolean(process.env.OPENAI_API_KEY);
const client = HAS_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function parseBudget(input?: string): number {
  if (!input) return 400;
  const nums = Array.from(input.matchAll(/\d+(?:[.,]\d+)?/g)).map((m) =>
    Number(m[0].replace(",", "."))
  );
  if (!nums.length) return 400;
  const max = Math.max(...nums);
  return Number.isFinite(max) ? Math.max(150, max) : 400;
}

function defaultPlan(prompt: string, prefs: Prefs): StylePlan {
  const budget = parseBudget(prefs.budget);
  const currency = prefs.country?.toUpperCase() === "US" ? "USD" : "EUR";
  const slots: SlotName[] = ["anchor", "top", "bottom", "shoe", "accessory"];
  const lookId = crypto.randomUUID();
  return {
    look_id: lookId,
    aesthetic_read: "Clean, intentional minimalism with a polished line.",
    vibe_keywords: ["clean", "polished", "modern", "intentional"],
    required_slots: slots,
    per_slot: slots.map((slot) => ({
      slot,
      category: slot === "shoe" ? "Shoes" : slot === "accessory" ? "Accessory" : "Apparel",
      keywords: [slot, ...(prefs.keywords ?? [])].filter(Boolean),
      allowed_colors: ["black", "cream", "navy", "camel"],
      banned_materials: ["polyurethane"],
      min_price: Math.round(budget * 0.08),
      max_price: Math.round(budget * 0.35),
    })),
    budget_split: slots.map((slot) => ({
      slot,
      min: Math.round(budget * 0.08),
      max: Math.round(budget * 0.35),
    })),
    retailer_priority: prefs.country?.toUpperCase() === "US"
      ? ["COS", "Zara", "& Other Stories"]
      : ["COS", "& Other Stories", "Zara"],
    search_queries: slots.map((slot) => ({
      slot,
      query: `${prompt} ${slot}`.trim(),
    })),
    budget_total: budget,
    currency,
    allow_stretch: false,
    preferences: {
      gender: prefs.gender,
      body_type: prefs.bodyType,
      budget: prefs.budget,
      country: prefs.country,
      keywords: prefs.keywords,
      sizes: prefs.sizes,
      prompt,
    },
  };
}

export async function POST(req: NextRequest) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  if (!(req.headers.get("content-type") || "").includes("application/json")) {
    return new Response(JSON.stringify({ ok: false, error: "Expected application/json." }), {
      status: 415,
      headers,
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    prefs?: Prefs;
  };
  const prompt = (body.prompt || "").trim();
  const prefs = body.prefs || {};

  if (!prompt) {
    return new Response(JSON.stringify({ ok: false, error: "Missing prompt." }), {
      status: 400,
      headers,
    });
  }

  if (!HAS_KEY || !client) {
    const plan = defaultPlan(prompt, prefs);
    return new Response(JSON.stringify({ ok: true, plan }), { headers });
  }

  const sys = [
    "You are RunwayTwin, a professional personal stylist.",
    "Return ONLY valid JSON.",
    "Create a StylePlan object with this shape:",
    "{ aesthetic_read: string, vibe_keywords: string[], required_slots: string[], per_slot: { slot: string, category: string, keywords: string[], allowed_colors: string[], banned_materials: string[], min_price: number, max_price: number }[], budget_split: { slot: string, min: number, max: number }[], retailer_priority: string[], search_queries: { slot: string, query: string }[] }",
    "Rules:",
    "- No web calls, no scraping. Pure reasoning.",
    "- Respect the budget, body type, and region.",
    "- Slots should include anchor, top, bottom, shoe, accessory unless user asks for dress-only.",
    "- Keep keyword arrays short and concrete.",
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
          content: JSON.stringify({
            prompt,
            prefs,
            budget_total: parseBudget(prefs.budget),
            currency: prefs.country?.toUpperCase() === "US" ? "USD" : "EUR",
          }),
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Partial<StylePlan>;
    const lookId = crypto.randomUUID();
    const fallback = defaultPlan(prompt, prefs);
    const plan: StylePlan = {
      ...fallback,
      ...parsed,
      look_id: lookId,
      budget_total: parseBudget(prefs.budget),
      currency: prefs.country?.toUpperCase() === "US" ? "USD" : "EUR",
      allow_stretch: Boolean((parsed as any).allow_stretch ?? false),
      preferences: { ...fallback.preferences, prompt },
    };

    return new Response(JSON.stringify({ ok: true, plan }), { headers });
  } catch {
    const plan = defaultPlan(prompt, prefs);
    return new Response(JSON.stringify({ ok: true, plan }), { headers });
  }
}
