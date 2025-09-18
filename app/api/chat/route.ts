// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { encodeSSE } from "../../../lib/sse/reader";
import { searchProducts, affiliateLink, fxConvert } from "../tools";

export const runtime = "edge";

/* ──────────────────────────────────────────────────────────────────────────
 * Types
 * ────────────────────────────────────────────────────────────────────────── */
type Prefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budget?: number;
  country?: string;
  styleKeywords?: string;
  heightCm?: number;
  weightKg?: number;
  currency?: string;
};

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  // important: include tool_calls on the assistant that requested tools
  tool_calls?: ToolCall[];
};

const te = new TextEncoder();
const push = (evt: any) => te.encode(encodeSSE(evt));

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */
function prefsToSystem(p: Prefs): string {
  const cur = p.currency || (p.country === "US" ? "USD" : "EUR");
  return [
    `User Profile:`,
    `- Gender: ${p.gender ?? "unspecified"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ? `${p.budget} ${cur}` : "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    `These preferences MUST influence silhouette, rise, drape, neckline, hem, fabrication, proportion, and budget math.`,
  ].join("\n");
}

function safeJSON<T = any>(text: string, fallback: T): T {
  try {
    // OpenAI sometimes streams partials; trim weird trailing commas/braces safely
    const cleaned = (text || "").trim()
      .replace(/\n/g, " ")
      .replace(/,(\s*[}\]])/g, "$1"); // remove trailing commas
    return JSON.parse(cleaned || "{}");
  } catch {
    return fallback;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * OpenAI stream (collect tool_calls + content)
 * ────────────────────────────────────────────────────────────────────────── */
async function streamOpenAI(
  messages: ChatMessage[],
  toolsSchema: any[],
  model: string,
  headers: Record<string, string>,
  signal: AbortSignal,
  onContentDelta: (text: string) => void
): Promise<{ assistantMsg: ChatMessage }> {
  const body = { model, stream: true, temperature: 0.6, messages, tools: toolsSchema, tool_choice: "auto" };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    console.warn("[OpenAI] stream error:", res.status, txt.slice(0, 500));
    throw new Error(`OpenAI stream error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();

  // accumulate content + tool call deltas
  const toolCalls: Record<string, ToolCall> = {};
  let content = "";
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    const chunk = dec.decode(value, { stream: true });

    for (const line of chunk.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") { done = true; break; }
      try {
        const obj = JSON.parse(payload);
        const delta = obj.choices?.[0]?.delta;
        if (!delta) continue;

        if (typeof delta.content === "string") {
          content += delta.content;
          onContentDelta(delta.content);
        }

        if (delta.tool_calls) {
          for (const part of delta.tool_calls) {
            const id = part.id || part.index?.toString() || crypto.randomUUID();
            if (!toolCalls[id]) toolCalls[id] = { id, type: "function", function: { name: "", arguments: "" } };
            if (part.function?.name) toolCalls[id].function.name = part.function.name;
            if (typeof part.function?.arguments === "string") {
              toolCalls[id].function.arguments += part.function.arguments;
            }
          }
        }
      } catch { /* ignore malformed SSE frame */ }
    }
  }

  const assistantMsg: ChatMessage = {
    role: "assistant",
    content,
    tool_calls: Object.values(toolCalls),
  };

  return { assistantMsg };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Tool schemas (names must match handlers below)
 * ────────────────────────────────────────────────────────────────────────── */
const toolSchemas = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search live retailers for a specific fashion item query. Return up to 6 normalized products.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          country: { type: "string" },
          currency: { type: "string" },
          size: { type: "string" },
          color: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fx_convert",
      description: "Convert a price to a target currency (static FX table).",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number" },
          from: { type: "string" },
          to: { type: "string" },
        },
        required: ["amount", "from", "to"],
      },
    },
  },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Route
 * ────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let body: any = {}; try { body = await req.json(); } catch {}

  const clientMessages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const preferences: Prefs = (body?.preferences || {}) as Prefs;
  const imageUrl: string | undefined = typeof body?.imageUrl === "string" ? body.imageUrl : undefined;

  const sysPrefs = prefsToSystem(preferences);
  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    { role: "system", content: sysPrefs },
    ...clientMessages,
  ];
  if (imageUrl) baseMessages.push({ role: "user", content: `Image provided for palette/fit context: ${imageUrl}` });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: any) => controller.enqueue(push(evt));
      const keepAlive = setInterval(() => send({ type: "ping" }), 15000);

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
      const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || "";
      const OPENAI_PROJECT_ID = process.env.OPENAI_PROJECT_ID || "";
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

      let optimisticDraft = "";

      try {
        send({ type: "ready" });

        /* ── Optimistic draft (adapter-led, immediate) ───────────────────── */
        const lastUser = [...baseMessages].reverse().find((m) => m.role === "user")?.content || "";
        const style = preferences.styleKeywords ? ` ${preferences.styleKeywords}` : "";
        const heuristicQuery = `${lastUser.slice(0, 160)}${style ? " | " + style : ""}`.trim();

        let draftLines: string[] = [];
        try {
          const cur = preferences.currency || (preferences.country === "US" ? "USD" : "EUR");
          const picks = await searchProducts({
            query: heuristicQuery || "black wool coat women",
            country: preferences.country || "NL",
            currency: cur,
            limit: 3,
            preferEU: (preferences.country || "NL") !== "US",
          });

          if (picks.length) {
            const heroLines = await Promise.all(
              picks.map(async (p) => {
                const link = await affiliateLink(p.url, p.retailer);
                const retailer = p.retailer ?? new URL(p.url).hostname;
                const priceStr = p.price != null ? `${p.price}` : "?";
                const ccy = p.currency ?? "";
                return `- Hero: ${p.brand} — ${p.title} | ${priceStr} ${ccy} | ${retailer} | ${link} | ${p.imageUrl ?? ""}`;
              })
            );
            draftLines = ["Outfit:", ...heroLines, "Alternates:", "- Shoes: searching…", "- Outerwear: searching…"];
          }
        } catch (e: any) {
          console.warn("[RunwayTwin] optimistic search failed:", e?.message);
        }

        if (!draftLines.length) {
          draftLines = [
            "Outfit:",
            "- Top: The Row — Wesler Merino T-Shirt | 590 EUR | Matches | https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt | ",
            "- Bottom: Levi's — 501 Original Straight | 110 EUR | Levi.com EU | https://www.levi.com/NL/en_NL/search?q=501 | ",
            "- Outerwear: Mango — Classic Cotton Trench | 119.99 EUR | Mango | https://shop.mango.com/nl/dames/jassen/trench-classic | ",
            "- Shoes: ZARA — Leather Penny Loafers | 69.95 EUR | ZARA | https://www.zara.com/nl/en/leather-penny-loafers-p0.html | ",
            "- Bag: A.P.C. — Grace Small Leather Bag | 520 EUR | A.P.C. | https://www.apcstore.com/en_eu/grace-small | ",
            "Alternates:",
            "- Shoes: Alexander Wang — Ava Slingback 75 | 495 EUR | Farfetch | https://www.farfetch.com/ | ",
            "- Outerwear: Agnona — Double-Face Cashmere Coat | 3200 EUR | SSENSE | https://www.ssense.com/ | ",
          ];
        }

        optimisticDraft = draftLines.join("\n");
        for (const line of draftLines) {
          send({ type: "assistant_draft_delta", data: line + "\n" });
          await new Promise((r) => setTimeout(r, 8));
        }
        send({ type: "assistant_draft_done" });

        if (!OPENAI_API_KEY) {
          console.warn("[RunwayTwin] Missing OPENAI_API_KEY — returning optimistic draft as final.");
          send({ type: "assistant_final", data: optimisticDraft || "Temporary draft unavailable." });
          send({ type: "done" });
          clearInterval(keepAlive);
          controller.close();
          return;
        }

        const headers: Record<string, string> = {
          "content-type": "application/json",
          authorization: `Bearer ${OPENAI_API_KEY}`,
        };
        if (OPENAI_ORG_ID) headers["OpenAI-Organization"] = OPENAI_ORG_ID;
        if (OPENAI_PROJECT_ID) headers["OpenAI-Project"] = OPENAI_PROJECT_ID;

        /* ── Streaming pass ─────────────────────────────────────────────── */
        let assistantMsg: ChatMessage = { role: "assistant", content: "" };
        try {
          const res = await streamOpenAI(
            baseMessages,
            toolSchemas,
            model,
            headers,
            new AbortController().signal,
            (delta) => send({ type: "assistant_draft_delta", data: delta })
          );
          assistantMsg = res.assistantMsg;
        } catch (e: any) {
          console.warn("[RunwayTwin] model stream failed; continuing with draft. Reason:", e?.message);
          // we will still finalize with the optimistic draft
          assistantMsg = { role: "assistant", content: "" };
        }

        /* ── Execute tool calls (fail-soft) ─────────────────────────────── */
        const toolResults: ChatMessage[] = [];
        const toolCalls = assistantMsg.tool_calls || [];

        for (const call of toolCalls) {
          send({ type: "tool_call", data: { id: call.id, name: call.function?.name } });

          let resultPayload: any = { ok: true };
          try {
            if (call.function?.name === "search_products") {
              const args = safeJSON(call.function.arguments, {});
              const q = (args.query as string) || [...baseMessages].reverse().find((m) => m.role === "user")?.content || "";
              const results = await searchProducts({
                query: q,
                country: args.country || preferences.country,
                currency: args.currency || preferences.currency || (preferences.country === "US" ? "USD" : "EUR"),
                size: args.size ?? null,
                color: args.color ?? null,
                limit: Math.min(6, Number(args.limit || 6)),
                preferEU: (preferences.country || "NL") !== "US",
              });
              resultPayload = { ok: true, results };
            } else if (call.function?.name === "fx_convert") {
              const args = safeJSON(call.function.arguments, {});
              const out = fxConvert(Number(args.amount || 0), String(args.from || "EUR"), String(args.to || "EUR"));
              resultPayload = { ok: true, amount: out, currency: args.to || "EUR" };
            } else {
              resultPayload = { ok: true, note: "unknown_tool_ignored" };
            }
          } catch (err: any) {
            // fail-soft: still ok=true with empty results so UI doesn't flash a scary error
            console.warn("[RunwayTwin] tool execution error:", err?.message || err);
            resultPayload = { ok: true, results: [] };
          }

          send({ type: "tool_result", data: { tool: call.function?.name, result: resultPayload } });

          toolResults.push({
            role: "tool",
            name: call.function?.name,
            tool_call_id: call.id,
            content: JSON.stringify(resultPayload),
          });
        }

        /* ── Finalization pass (non-stream; include assistant tool_calls!) ─ */
        let finalText = "";
        try {
          const finalizeBody = {
            model,
            temperature: 0.4,
            messages: [...baseMessages, assistantMsg, ...toolResults],
          };
          const resp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers,
            body: JSON.stringify(finalizeBody),
          });
          const status = resp.status;
          const data = await resp.json().catch(() => ({}));
          if (status >= 200 && status < 300) {
            finalText = data?.choices?.[0]?.message?.content || "";
          } else {
            console.warn("[OpenAI] finalization failed:", status, JSON.stringify(data).slice(0, 500));
          }
        } catch (err: any) {
          console.warn("[OpenAI] finalization exception:", err?.message);
        }

        if (!finalText || !finalText.trim()) {
          finalText = assistantMsg.content?.trim()
            ? assistantMsg.content
            : (optimisticDraft || "Outfit:\n- (draft unavailable)");
        }

        send({ type: "assistant_final", data: finalText });
        send({ type: "done" });
      } catch (err: any) {
        // absolute fallback — never leave the client hanging
        const fallback = optimisticDraft || "Outfit:\n- Top: — | — | — | —\n\n(Recovered from an unexpected error.)";
        console.error("[RunwayTwin] route fatal:", err?.message);
        // Don't spam user with hard error if we can still return a draft
        send({ type: "assistant_final", data: fallback });
        send({ type: "done" });
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
