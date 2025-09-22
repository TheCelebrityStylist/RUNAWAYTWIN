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
type ChatMessage = { role: Role; content: string };

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
   Utils
   ======================================= */
function contentToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return (c as any[])
      .map((p) => (typeof p === "string" ? p : p?.text ?? p?.content ?? ""))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function lastUserText(msgs: ChatMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") return contentToText(msgs[i].content);
  }
  return "";
}

function curFor(p: Prefs) {
  return p.currency || (p.country === "US" ? "USD" : "EUR");
}

function prefsToSystem(p: Prefs) {
  const cur = curFor(p);
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
  let t = txt.replace(/\n{3,}/g, "\n\n").replace(/^\s*[-•]\s*$/gm, "");
  // Normalize accidental headings to bold labels
  t = t.replace(
    /^\s*\d+\.\s*([A-Z][^\n]{0,60}?):?\s*$(?=\n(?:\s*[-•]|\s*$|\s*#{1,6}\s))/gmi,
    (_m, h) => `**${String(h).trim()}:**`
  );
  t = t.replace(/^#{2,6}\s+/gm, "");
  return t;
}

/* =======================================
   Web Search (Tavily) for Product Candidates
   - We only pass titles + URLs; model instructed to ONLY use these links.
   ======================================= */
async function webSearchProducts(query: string) {
  if (!ALLOW_WEB || !process.env.TAVILY_API_KEY) return [];

  // Steer toward retailers with decent JSON-LD / stable PDPs
  const booster =
    " site:(zara.com OR mango.com OR hm.com OR net-a-porter.com OR matchesfashion.com OR farfetch.com OR gap.com OR uniqlo.com OR cos.com OR arket.com OR massimodutti.com OR lev i.com)";
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
  const items = Array.isArray(data?.results) ? data.results : [];
  return items
    .slice(0, 8)
    .map((r: any) => ({
      title: r?.title || "",
      url: r?.url || "",
      snippet: r?.content || r?.snippet || "",
    }))
    .filter((x) => x.title && x.url);
}

function webCandidatesBlock(cands: Array<{ title: string; url: string; snippet: string }>) {
  if (!cands.length) return "CANDIDATE LINKS: (none found)";
  const lines = cands.map(
    (c, i) => `• [LINK ${i + 1}] ${c.title} — ${c.url}`
  );
  return `CANDIDATE LINKS (use links as-is; do not invent URLs):\n${lines.join("\n")}`;
}

/* =======================================
   System Framing for Stylist
   ======================================= */
const SYSTEM_STYLIST_RULES =
  [
    "You are 'The Ultimate Celebrity Stylist AI': warm, premium, aspirational, concise, never repetitive.",
    "When you have body type + occasion (or enough info), deliver a complete outfit with: Top, Bottom (or Dress), Outerwear, Shoes, Bag, 1–2 Accessories.",
    "For each item include: Brand + Exact Item, Price + currency (if provided), Retailer, Link (from CANDIDATE LINKS only), and Image if present in text.",
    "Explain exactly why each flatters the body type (rise, drape, neckline, hem, silhouette, fabrication, proportion).",
    "Respect budget; show total; add 'Save' alternates if total exceeds budget.",
    "Always include alternates for shoes and outerwear with links.",
    "Add 'Capsule & Tips' (2–3 remix ideas + 2 succinct tips).",
    "NEVER invent links. Use only the URLs provided under CANDIDATE LINKS. If none match, say so briefly and offer closest suggestions without a fake link.",
    "Close every response with: 'Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎'.",
  ].join(" ");

function buildMessages(history: ChatMessage[], prefs: Prefs, webCandsText: string): ChatMessage[] {
  const msgs: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    { role: "system", content: SYSTEM_STYLIST_RULES },
    { role: "system", content: prefsToSystem(prefs) },
  ];
  if (webCandsText) {
    msgs.push({ role: "system", content: webCandsText });
  }
  // Preserve user/assistant history as-is
  msgs.push(...history);
  const last = lastUserText(history);
  if (last) msgs.push({ role: "user", content: last });
  return msgs;
}

/* =======================================
   Body parsing
   ======================================= */
async function parseBody(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const history = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];
  const preferences: Prefs = (body?.preferences || {}) as Prefs;
  return { history, preferences };
}

/* =======================================
   ROUTE
   ======================================= */
export async function POST(req: NextRequest) {
  const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8" });

  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response("Server is missing OPENAI_API_KEY.", { status: 500, headers });
    }

    const { history, preferences } = await parseBody(req);
    const userText = lastUserText(history);
    if (!userText) {
      return new Response("Please tell me the occasion, body type, and any muse you love.", { status: 400, headers });
    }

    // Optional web candidates (non-blocking but with a hard timeout)
    let candidates: Array<{ title: string; url: string; snippet: string }> = [];
    if (ALLOW_WEB && process.env.TAVILY_API_KEY) {
      const q = [
        userText,
        preferences.styleKeywords,
        preferences.bodyType,
        preferences.country,
      ]
        .filter(Boolean)
        .join(" ");

      const webP = webSearchProducts(q);
      candidates = await Promise.race([
        webP,
        new Promise<typeof candidates>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
    }

    const messages = buildMessages(history, preferences, webCandidatesBlock(candidates));

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.6,
      stream: false,
    });

    let text = completion?.choices?.[0]?.message?.content || "";
    text = sanitizeAnswer(text);

    return new Response(text, { headers });
  } catch (err: any) {
    return new Response(
      `I hit a hiccup preparing your look. Quick retry usually fixes it.\n\n(${String(err?.message || err)})`,
      { status: 500, headers }
    );
  }
}
