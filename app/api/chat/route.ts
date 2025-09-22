// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";

/* =======================================
   CONFIG
   ======================================= */
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const ALLOW_WEB = (process.env.ALLOW_WEB || "true").toLowerCase() !== "false";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* =======================================
   Types
   ======================================= */
type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string | any[] };

type Prefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budget?: number;
  country?: string;
  currency?: string;
  styleKeywords?: string;
  heightCm?: number;
  weightKg?: number;
};

/* =======================================
   Helpers
   ======================================= */
function contentToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return (c as any[])
      .map((p) =>
        typeof p === "string"
          ? p
          : (p && (p.text ?? p.content ?? p.value)) || ""
      )
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
  return p.currency || (p.country === "US" ? "USD" : "EUR");
}

function prefsToSystem(p: Prefs) {
  const cur = currencyFor(p);
  return [
    `User Profile`,
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ? `${p.budget} ${cur}` : "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    `Always tailor silhouette (rise, drape, neckline, hem, fabrication, proportion) to flatter body type. Respect budget.`,
  ].join("\n");
}

function sanitizeAnswer(txt: string) {
  if (!txt) return "";
  return txt
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[-•]\s*$/gm, "")
    .replace(/^#{2,6}\s+/gm, "");
}

/* =======================================
   Tavily web candidates (real links only)
   ======================================= */
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
  const data = await resp.json().catch(() => ({}));
  const arr = Array.isArray(data?.results) ? data.results : [];
  return arr
    .slice(0, 8)
    .map((r: any) => ({ title: r?.title || "", url: r?.url || "" }))
    .filter((x) => x.title && x.url);
}

function candidatesBlock(cands: Cand[]) {
  if (!cands.length) return "";
  const lines = cands.map((c, i) => `• [LINK ${i + 1}] ${c.title} — ${c.url}`);
  return `CANDIDATE LINKS (use links exactly as-is; do not invent URLs):\n${lines.join("\n")}`;
}

/* =======================================
   Fallback answer (never invents links)
   ======================================= */
function brandFromTitle(t: string) {
  // crude brand guess: first 1–2 words before a dash or pipe
  const h = t.split(/[–—\-|\u2013\u2014]/)[0].trim();
  return h.split(/\s+/).slice(0, 2).join(" ");
}

function retailerFromUrl(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function fallbackFromCandidates(cands: Cand[], prefs: Prefs, userText: string): string {
  const cur = currencyFor(prefs);
  const budget = prefs.budget ? `${prefs.budget} ${cur}` : `-`;
  const pick = (i: number) => (cands[i] ? cands[i] : null);

  const top = pick(0);
  const bottom = pick(1);
  const outer = pick(2);
  const shoes = pick(3);
  const bag = pick(4);

  const line = (cat: string, c: Cand | null) =>
    c
      ? `- ${cat}: ${brandFromTitle(c.title)} — ${c.title} | ? ${cur} | ${retailerFromUrl(c.url)} | ${c.url}`
      : `- ${cat}: (closest match not linked)`;

  const alShoes = pick(5);
  const alOuter = pick(6);

  const alLine = (cat: string, c: Cand | null) =>
    c
      ? `- ${cat}: ${brandFromTitle(c.title)} — ${c.title} | ? ${cur} | ${retailerFromUrl(c.url)} | ${c.url}`
      : `- ${cat}: (no alternate link)`;

  return sanitizeAnswer(
`Outfit:
${line("Top", top)}
${line("Bottom", bottom)}
${line("Outerwear", outer)}
${line("Shoes", shoes)}
${line("Bag", bag)}

Alternates:
${alLine("Shoes", alShoes)}
${alLine("Outerwear", alOuter)}

Why it Flatters:
- Proportions and fabrication are chosen to complement ${prefs.bodyType || "the body"} and the request: ${userText}.
- Focus on neckline, rise, hem, and drape to balance lines and elongate.

Budget:
- Total: ? ${cur} (Budget: ${budget})

Capsule & Tips:
- Remix: Swap the top with a fine-knit turtleneck for colder days.
- Remix: Dress up with a silk camisole and heels.
- Remix: Weekend version with white tee + clean sneakers.
- Tip: Keep hems tailored to your shoe height for clean lines.
- Tip: Stick to 2–3 tones to look intentional.
`)
}

/* =======================================
   ROUTE
   ======================================= */
export async function POST(req: NextRequest) {
  const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8" });

  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response("Missing OPENAI_API_KEY.", { status: 500, headers });
    }

    const body = await req.json().catch(() => ({}));
    const history: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const preferences: Prefs = (body?.preferences || {}) as Prefs;

    const userText = lastUserText(history);
    if (!userText) {
      return new Response(
        "Tell me your occasion, body type, budget, and any celebrity muse. I’ll style a full look.",
        { status: 400, headers }
      );
    }

    // Fetch candidates with a hard timeout so we never hang
    let cands: Cand[] = [];
    if (ALLOW_WEB && process.env.TAVILY_API_KEY) {
      const q = [userText, preferences.styleKeywords, preferences.bodyType, preferences.country]
        .filter(Boolean)
        .join(" ");
      cands = await Promise.race([
        webSearchProducts(q),
        new Promise<Cand[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
    }

    const messages: ChatMessage[] = [
      { role: "system", content: STYLIST_SYSTEM_PROMPT },
      { role: "system", content: prefsToSystem(preferences) },
    ];

    const cblock = candidatesBlock(cands);
    if (cblock) messages.push({ role: "system", content: cblock });

    // keep convo; repeat latest user at end
    messages.push(...history);
    messages.push({ role: "user", content: userText });

    // Ensure strings only go to OpenAI
    const strMessages = messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : contentToText(m.content),
    }));

    let text = "";
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages: strMessages,
        temperature: 0.6,
        stream: false,
      });
      text = completion?.choices?.[0]?.message?.content || "";
    } catch (err) {
      // swallow here; we’ll fall back below
      text = "";
    }

    if (!text.trim()) {
      // Fallback: deterministic, link-safe draft built from Tavily (never invents URLs)
      text = fallbackFromCandidates(cands, preferences, userText);
    }

    return new Response(sanitizeAnswer(text), { headers });
  } catch (err: any) {
    // Last-resort safe message (still 200 so the UI renders text)
    const msg = `I hit a hiccup finishing the look. Here’s a quick starter you can use right now.\n\n(${String(
      err?.message || err
    )})`;
    return new Response(msg, { headers });
  }
}
