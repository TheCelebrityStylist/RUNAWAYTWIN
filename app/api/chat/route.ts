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
function lastUserText(msgs: ChatMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") {
      const c = msgs[i].content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) return c.map((p) => (typeof p === "string" ? p : p?.text ?? p?.content ?? "")).join(" ");
    }
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
   Web Search (Tavily) — optional live product candidates
   ======================================= */
async function webSearchProducts(query: string) {
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
  return Array.isArray(data?.results)
    ? data.results.slice(0, 8).map((r: any, i: number) => `• [LINK ${i + 1}] ${r.title || ""} — ${r.url || ""}`)
    : [];
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
    const history = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : [];
    const preferences: Prefs = (body?.preferences || {}) as Prefs;

    const userText = lastUserText(history);
    if (!userText) {
      return new Response("Please tell me your body type, occasion, or celebrity inspiration.", { status: 400, headers });
    }

    // Web candidates
    let candidates: string[] = [];
    if (ALLOW_WEB && process.env.TAVILY_API_KEY) {
      const q = [userText, preferences.styleKeywords, preferences.bodyType].filter(Boolean).join(" ");
      candidates = await Promise.race([
        webSearchProducts(q),
        new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
    }

    // Build messages
    const messages: ChatMessage[] = [
      { role: "system", content: STYLIST_SYSTEM_PROMPT },
      { role: "system", content: prefsToSystem(preferences) },
    ];
    if (candidates.length) {
      messages.push({
        role: "system",
        content: `CANDIDATE LINKS (use links exactly as-is, never invent):\n${candidates.join("\n")}`,
      });
    }
    messages.push(...history);
    messages.push({ role: "user", content: userText });

    // Model call
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
      `I couldn’t finish styling this look. Please retry.\n\n(${String(err?.message || err)})`,
      { status: 500, headers }
    );
  }
}
