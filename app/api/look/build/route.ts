// FILE: app/api/look/build/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";
import type { Prefs } from "@/lib/types";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

type SlimItem = {
  id?: string | null;
  title: string;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
  url: string;
  retailer?: string | null;
};

function prefsBlock(p?: Prefs) {
  if (!p) return "User preferences: (not provided)";
  const sizes = p.sizes
    ? Object.entries(p.sizes)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
    : "-";
  const kw = p.keywords?.length ? p.keywords.join(", ") : "-";
  const budget = p.budget ?? "-";
  return [
    "User preferences:",
    `- Gender: ${p.gender ?? "-"}`,
    `- Body type: ${p.bodyType ?? "-"}`,
    `- Sizes: ${sizes}`,
    `- Budget: ${budget}`,
    `- Country: ${p.country ?? "-"}`,
    `- Keywords: ${kw}`,
  ].join("\n");
}

function itemsBlock(items: SlimItem[]) {
  const lines = items.map((it, i) => {
    const price =
      typeof it.price === "number" && it.currency ? `${it.currency} ${it.price}` : "—";
    const brand = it.brand ?? "";
    const shop = it.retailer ?? "";
    return `#${i + 1}: ${brand ? brand + " — " : ""}${it.title} | ${price} | ${shop} | ${it.url}`;
  });
  return `CANDIDATE PIECES (use links exactly as given):\n${lines.join("\n")}`;
}

const SYSTEM = `You are RunwayTwin, a senior fashion stylist. 
Goal: Build a cohesive outfit using ONLY the provided candidate pieces and links. Do not invent URLs.
Rules:
- Respect body type, sizes, and budget.
- Explain "Why it Flatters" with silhouette, proportion, rise, neckline, drape, hem.
- Provide 2 alternates from the list if suitable pieces exist.
- If something critical is missing, say so and suggest the closest options from the list (no new links).
Output format (plain text, no Markdown headings):
Outfit:
- Top: <brand> — <title> | <price> | <retailer> | <url>
- Bottom: ...
- Outerwear: ...
- Shoes: ...
- Bag: ...

Why it Flatters:
- …

Alternates:
- <category>: <brand> — <title> | <price> | <retailer> | <url>
- <category>: <brand> — <title> | <price> | <retailer> | <url>
`;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response("Missing OPENAI_API_KEY", { status: 500 });
    }
    const body = (await req.json()) as {
      items?: SlimItem[];
      prefs?: Prefs;
      note?: string; // occasion or extra instruction
    };

    const items = Array.isArray(body?.items) ? body.items.filter((i) => i?.url) : [];
    if (!items.length) {
      return new Response("No items provided.", { status: 400 });
    }

    const userNote = (body?.note || "").trim();
    const messages = [
      { role: "system" as const, content: SYSTEM },
      { role: "system" as const, content: prefsBlock(body?.prefs) },
      { role: "system" as const, content: itemsBlock(items) },
      {
        role: "user" as const,
        content:
          userNote ||
          "Using the pieces above, assemble a complete look suitable for day-to-night smart casual.",
      },
    ];

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages,
    });

    const text = res.choices?.[0]?.message?.content?.trim() || "";
    return new Response(text || "I couldn't compose a look this time.", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    return new Response(String((err as Error)?.message || err), { status: 500 });
  }
}
