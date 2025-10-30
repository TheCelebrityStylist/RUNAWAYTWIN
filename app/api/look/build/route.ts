// FILE: app/api/look/build/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * Build a cohesive outfit plan from a user's Lookboard selection.
 *
 * INPUT (application/json):
 * {
 *   items: Array<{
 *     id: string;
 *     title: string;
 *     url: string;
 *     brand: string;
 *     price?: number;
 *     currency: string;
 *     image: string;
 *     retailer: string;
 *   }>;
 *   prefs?: {
 *     gender?: "female" | "male" | "other";
 *     bodyType?: string;
 *     budget?: string;
 *     country?: string;
 *     keywords?: string[];
 *     sizes?: { top?: string; bottom?: string; dress?: string; shoe?: string };
 *   };
 *   note?: string; // optional occasion / vibe
 * }
 *
 * OUTPUT:
 * - text/markdown; clean sections, bullet points, and links.
 */

type Product = {
  id: string;
  title: string;
  url: string;
  brand: string;
  price?: number;
  currency: string;
  image: string;
  retailer: string;
};

type Prefs = {
  gender?: "female" | "male" | "other";
  bodyType?: string;
  budget?: string;
  country?: string;
  keywords?: string[];
  sizes?: { top?: string; bottom?: string; dress?: string; shoe?: string };
};

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const HAS_KEY = Boolean(process.env.OPENAI_API_KEY);
const client = HAS_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/* ------------------------- helpers -------------------------- */
function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function asString(x: unknown, def = ""): string {
  return typeof x === "string" ? x : def;
}
function asNumber(x: unknown): number | undefined {
  return typeof x === "number" && Number.isFinite(x) ? x : undefined;
}
function coerceProduct(x: unknown): Product | null {
  if (!isObj(x)) return null;
  const title = asString(x["title"], "Item");
  const id = asString(x["id"]) || asString(x["url"]) || `${title}-${crypto.randomUUID()}`;
  const url = asString(x["url"], "");
  const brand = asString(x["brand"], "");
  const price = asNumber(x["price"]);
  const currency = asString(x["currency"], "EUR");
  const image = asString(x["image"], "");
  const retailer = asString(x["retailer"], "");
  return { id, title, url, brand, price, currency, image, retailer };
}
function sanitizeList(items: unknown[]): Product[] {
  const out: Product[] = [];
  for (const it of items) {
    const p = coerceProduct(it);
    if (p) out.push(p);
  }
  return out.slice(0, 24); // cap to keep prompt lean
}
function sumPrices(items: Product[]) {
  let total = 0;
  let has = false;
  for (const p of items) {
    if (typeof p.price === "number") {
      total += p.price;
      has = true;
    }
  }
  return { has, total: Math.round(total) };
}
function prefsBlock(p?: Prefs) {
  if (!p) return "No explicit preferences.";
  const sizes = p.sizes || {};
  const kws = (p.keywords || []).join(", ");
  return [
    `Gender: ${p.gender ?? "-"}`,
    `Body type: ${p.bodyType ?? "-"}`,
    `Budget: ${p.budget ?? "-"}`,
    `Country: ${p.country ?? "-"}`,
    `Keywords: ${kws || "-"}`,
    `Sizes: top=${sizes.top ?? "-"}, bottom=${sizes.bottom ?? "-"}, dress=${sizes.dress ?? "-"}, shoe=${sizes.shoe ?? "-"}`,
  ].join("\n");
}
function itemsBlock(items: Product[]) {
  return items
    .map(
      (p, i) =>
        `- [${i + 1}] ${p.title} — ${p.brand || "—"} | ${
          typeof p.price === "number" ? `${p.currency} ${p.price}` : "?"
        } | ${p.retailer || "retailer"} | ${p.url || "(no link)"}`
    )
    .join("\n");
}
function fallbackMarkdown(items: Product[], prefs?: Prefs, note?: string) {
  const { has, total } = sumPrices(items);
  const lines: string[] = [];
  lines.push(`**Outfit plan from your Lookboard**`);
  if (note) lines.push(`_Brief_: ${note}`);
  lines.push("");
  lines.push("### Why this works");
  lines.push("- Cohesive palette and proportion keep the silhouette clean.");
  lines.push("- Mix of structure (tailoring) and ease (knit/denim) suits many occasions.");
  lines.push("");
  lines.push("### Your items");
  for (const p of items) {
    lines.push(
      `- **${p.title}** (${p.brand || "—"}) — ${
        typeof p.price === "number" ? `${p.currency} ${p.price}` : "?"
      } ${p.url ? `→ [link](${p.url})` : "(no link)"}`
    );
  }
  if (has) {
    lines.push("");
    lines.push(`**Estimated total:** ~${items[0]?.currency || "EUR"} ${total}`);
  }
  lines.push("");
  lines.push("### Fit & styling tips");
  lines.push("- Keep hems tuned to shoe height to lengthen the line.");
  lines.push("- Add a fine belt or tuck to define the waist if desired.");
  lines.push("- Layer a light knit under outerwear for swing weather.");
  lines.push("");
  lines.push("### Preferences summary");
  lines.push(prefsBlock(prefs));
  return lines.join("\n");
}

/* --------------------------- route --------------------------- */
export async function POST(req: NextRequest) {
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
    "Cache-Control": "no-store",
  });

  try {
    if (!(req.headers.get("content-type") || "").includes("application/json")) {
      return new Response("_Bad request_: expected JSON body.", { status: 415, headers });
    }

    const body = (await req.json().catch(() => ({}))) as {
      items?: unknown[];
      prefs?: Prefs;
      note?: string;
    };

    const items = sanitizeList(Array.isArray(body.items) ? body.items : []);
    const prefs = body.prefs;
    const note = asString(body.note);

    if (!items.length) {
      return new Response(
        "Add a few items to your board first, then try building the outfit again.",
        { status: 400, headers }
      );
    }

    if (!HAS_KEY || !client) {
      return new Response(fallbackMarkdown(items, prefs, note), { headers });
    }

    const sys = [
      "You are an elite fashion stylist.",
      "Compose a concise, **shoppable** outfit plan using ONLY the provided items.",
      "Write clean Markdown with these sections (if content exists):",
      "1) A one-sentence **headline** describing the look.",
      "2) **Why it works** — 2–4 bullets tied to proportion, palette, and occasion.",
      "3) **Shopping list** — bullet each item as: Title (Brand) — Price [link]. If no link, write (no link).",
      "4) **Fit & styling tips** — 3–6 bullets tailored to the preferences/body type.",
      "5) **Total** — if multiple items include prices, show an estimated total.",
      "",
      "Keep it capsule-friendly, modern, and wearable.",
      "Never invent items. Never add retailers or links not in the list.",
      "",
      "USER PREFERENCES:",
      prefsBlock(prefs),
      "",
      note ? `OCCASION NOTE: ${note}` : "OCCASION NOTE: (none)",
      "",
      "ITEMS:",
      itemsBlock(items),
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: sys },
        {
          role: "user",
          content:
            "Return the outfit plan now as Markdown only. Keep it tight, premium, and practical.",
        },
      ],
    });

    const md =
      completion.choices?.[0]?.message?.content?.trim() ||
      fallbackMarkdown(items, prefs, note);

    return new Response(md, { headers });
  } catch (err) {
    return new Response(
      `${fallbackMarkdown(
        [],
        undefined,
        "Quick fallback — regenerate after a moment."
      )}\n\n<!-- ${String((err as Error)?.message || err)} -->`,
      { headers, status: 200 }
    );
  }
}

