// FILE: app/api/look/build/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/* ========================= Types (keep in sync-ish) ========================= */
type Product = {
  id?: string | null;
  title: string;
  brand?: string | null;
  price?: number | null;
  currency?: string | null;
  image?: string | null;
  url: string;
  retailer?: string | null;
};

type Prefs = {
  gender?: "female" | "male";
  bodyType?: string;
  budget?: string; // e.g., "€150–€300"
  country?: string; // ISO-2
  keywords?: string[];
  sizes?: { top?: string; bottom?: string; dress?: string; shoe?: string };
};

type BuildBody = {
  items: Product[];
  prefs?: Prefs;
  note?: string;
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ================================ Helpers ================================== */
function sanitizeText(s: string): string {
  return (s || "")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function euroOrCur(cur?: string | null): string {
  if (!cur) return "EUR";
  const up = cur.toUpperCase();
  if (["EUR", "USD", "GBP", "JPY"].includes(up)) return up;
  return "EUR";
}

function prefsBlock(p?: Prefs): string {
  if (!p) return "No explicit preferences provided.";
  const size = p.sizes
    ? Object.entries(p.sizes)
        .filter(([, v]) => !!v)
        .map(([k, v]) => `${k}:${v}`)
        .join(", ")
    : "-";
  const kw = (p.keywords ?? []).join(", ") || "-";
  return [
    `Gender: ${p.gender ?? "-"}`,
    `Body Type: ${p.bodyType ?? "-"}`,
    `Budget: ${p.budget ?? "-"}`,
    `Country: ${p.country ?? "-"}`,
    `Sizes: ${size}`,
    `Keywords: ${kw}`,
  ].join("\n");
}

function itemsBlock(items: Product[]): string {
  if (!items.length) return "(no items selected)";
  return items
    .map((it, i) => {
      const cur = euroOrCur(it.currency);
      const price = typeof it.price === "number" ? `${Math.round(it.price)} ${cur}` : "?";
      const brand = it.brand ?? "";
      const retailer = it.retailer ?? "";
      return `${i + 1}. ${it.title}${
        brand ? ` • ${brand}` : ""
      } • ${price} • ${retailer} • ${it.url}`;
    })
    .join("\n");
}

function fallbackPlan(items: Product[], prefs?: Prefs, note?: string): string {
  const cur = (prefs?.country ?? "NL") === "US" ? "USD" : "EUR";
  const budgetLine = prefs?.budget ? `Budget focus: ${prefs.budget}.` : "Budget: align per piece.";
  const body = prefs?.bodyType ?? "any";
  const kws = (prefs?.keywords ?? []).join(", ") || "clean, cohesive";
  const shoes =
    items.find((i) => /boot|sandal|loafer|sneaker|heel|pump/i.test(i.title)) ??
    items[3] ??
    items[0];

  return sanitizeText(
    `Styled Outfit — Quick Plan (Fallback)

Brief:
- Body type: ${body}. ${budgetLine}
- Keywords: ${kws}.
- Note: ${note || "-"}

Core Pieces:
- Top: pick the most refined knit/shirt from your board (slim-to-regular fit).
- Bottom: choose the trouser/denim that balances rise and leg width for ${body}.
- Outer: lightweight blazer or clean bomber for structure and proportion.
- Shoes: ${shoes?.title || "clean sneaker or pointed flat"}.
- Bag/Accent: one piece only to keep cohesion.

How to Wear:
1. Keep the palette to 2–3 tones from the board to look intentional.
2. Hem bottoms to your shoe height; avoid break for sharpness.
3. Front-tuck knits/shirts to define the waist and elongate the leg.
4. Scale accessories (earrings/bracelet) to the outerwear volume.

Capsule Remix:
- Swap the top with a fine-knit turtleneck in winter.
- Replace blazer with a cropped jacket to balance longer bottoms.
- Weekend version: tee + clean sneakers.

Shopping Order (by impact):
1) Bottom that fits perfectly (rise/inseam before anything else)
2) Outer layer that sets the vibe (blazer/bomber)
3) Shoes that lock the silhouette
4) Top that supports the palette

Estimated Total: depends on chosen pieces • ${cur}
(Use the board prices; stay under your stated band per piece.)
`
  );
}

/* ================================== Route ================================== */
export async function POST(req: NextRequest) {
  const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8" });

  try {
    const body = (await req.json().catch(() => ({}))) as BuildBody;
    const items = Array.isArray(body.items) ? body.items.slice(0, 24) : [];
    const prefs = body.prefs;
    const note = typeof body.note === "string" ? body.note : "";

    if (!items.length) {
      return new Response(
        "Add a few items to your board first, then click “Build Outfit.”",
        { status: 400, headers }
      );
    }

    // If no key → deterministic fallback
    if (!process.env.OPENAI_API_KEY) {
      return new Response(fallbackPlan(items, prefs, note), { headers });
    }

    const system = sanitizeText(
      `You are RunwayTwin — a precise, editorial-grade stylist.
- Never invent product links or prices; only comment on what's provided.
- Respect body type, budget band, and sizes. Focus on silhouette: rise, drape, neckline, hem.
- Output clean, helpful prose (no markdown headings), with these sections:
Outfit, Why it flatters, Styling notes, Capsule remix, Estimated total (if possible).`
    );

    const userMsg = sanitizeText(
      `USER PREFS
${prefsBlock(prefs)}

NOTE
${note || "-"}

CANDIDATE ITEMS (title • brand? • price? • retailer • url)
${itemsBlock(items)}

TASK
Select a cohesive head-to-toe outfit from the items above (or propose the best combo if categories are missing).
- Keep budget realistic from given prices; do not guess retailers beyond the list.
- Explain why the silhouette flatters the stated body type, including rise/hem/neckline and proportions.
- Provide 2–3 remix tips for a capsule wardrobe.
Return plain text (no markdown headings).`
    );

    let text = "";
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.5,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      });
      text = completion?.choices?.[0]?.message?.content ?? "";
    } catch (e) {
      text = "";
    }

    if (!text.trim()) {
      text = fallbackPlan(items, prefs, note);
    }

    return new Response(sanitizeText(text), { headers });
  } catch (err: unknown) {
    const msg =
      "Couldn’t compose the look right now. Here’s a quick fallback you can use:\n\n" +
      fallbackPlan([], undefined, undefined) +
      "\n\n(" +
      String((err as Error)?.message || err) +
      ")";
    return new Response(msg, { headers });
  }
}
