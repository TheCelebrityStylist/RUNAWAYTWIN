// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { encodeSSE } from "../../lib/sse/reader"; // path is correct for app/lib/sse/reader.ts
import { searchProducts, affiliateLink, fxConvert } from "./tools";

export const runtime = "edge";

/**
 * RunwayTwin — Edge SSE chat route
 *
 * Contract (always, never hangs):
 *   ready → assistant_draft_delta* → assistant_draft_done → (tool_call/tool_result)* → assistant_final → done
 *
 * Design notes:
 * - We stream an optimistic draft immediately (tool-guided; fast) so the UI never feels stuck.
 * - We collect tool_calls from the model's streamed deltas, run tools, and do a second non-stream pass for a crisp `assistant_final`.
 * - If OpenAI is unavailable/misconfigured, we still send the optimistic draft as `assistant_final` so the chat always shows something.
 * - The route runs on Vercel Edge; we only use `fetch` and avoid Node APIs.
 */

/* ============================================================
 * Types
 * ============================================================ */
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

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
};

/* ============================================================
 * Helpers
 * ============================================================ */
const te = new TextEncoder();
const push = (evt: any) => te.encode(encodeSSE(evt));

/** Convert user preferences to a compact system message the model can reliably use. */
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
    `These preferences MUST influence every recommendation, including silhouette, rise, drape, neckline, hems, fabrication, and budget math.`,
  ].join("\n");
}

/** Stream OpenAI deltas and accumulate tool_calls safely. */
async function streamOpenAI(
  messages: ChatMessage[],
  toolsSchema: any[],
  model: string,
  headers: Record<string, string>,
  signal: AbortSignal,
  onContentDelta: (text: string) => void
): Promise<{ toolCalls: any[]; content: string }> {
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
  const toolCallsMap: Record<string, { id: string; type: "function"; function: { name: string; arguments: string } }> =
    {};
  let full = "";
  let finished = false;

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = dec.decode(value, { stream: true });
    const lines = chunk.split(/\r?\n/);
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") {
        finished = true;
        break;
      }
      try {
        const obj = JSON.parse(payload);
        const delta = obj.choices?.[0]?.delta;
        if (!delta) continue;

        if (typeof delta.content === "string") {
          full += delta.content;
          onContentDelta(delta.content);
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const id = tc.id;
            if (!id) continue;
            if (!toolCallsMap[id]) {
              toolCallsMap[id] = { id, type: "function", function: { name: "", arguments: "" } };
            }
            if (tc.function?.name) toolCallsMap[id].function.name = tc.function.name;
            if (typeof tc.function?.arguments === "string") {
              toolCallsMap[id].function.arguments += tc.function.arguments;
            }
          }
        }
      } catch {
        // ignore malformed partial lines; keep streaming
      }
    }
  }

  return { content: full, toolCalls: Object.values(toolCallsMap) };
}

/* ============================================================
 * Tool Schemas (model-visible functions)
 * ============================================================ */
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
      description: "Convert a numeric price between currencies using a simple static table.",
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

/* ============================================================
 * Route
 * ============================================================ */
export async function POST(req: NextRequest) {
  // Defensive parse: ensure we always have the expected shape
  let bodyJson: any = {};
  try {
    bodyJson = await req.json();
  } catch {
    // ignored; we'll use defaults
  }
  const clientMessages = Array.isArray(bodyJson?.messages) ? (bodyJson.messages as ChatMessage[]) : [];
  const preferences: Prefs = (bodyJson?.preferences || {}) as Prefs;
  const imageUrl: string | undefined = typeof bodyJson?.imageUrl === "string" ? bodyJson.imageUrl : undefined;

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
      // keep-alive ping so proxies don't close the stream
      const keepAlive = setInterval(() => send({ type: "ping" }), 15000);

      // env
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
      const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID || "";
      const OPENAI_PROJECT_ID = process.env.OPENAI_PROJECT_ID || "";
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

      let optimisticDraftText = "";

      try {
        // 1) handshake
        send({ type: "ready" });

        // 2) Optimistic draft: do a fast product search using our adapters
        const lastUser = [...baseMessages].reverse().find((m) => m.role === "user")?.content || "";
        const style = preferences.styleKeywords ? ` ${preferences.styleKeywords}` : "";
        // small heuristic: take the most recent user text + style keywords
        const heuristicQuery = `${lastUser.slice(0, 160)}${style ? " | " + style : ""}`.trim();

        let draftLines: string[] = [];
        try {
          const picks = await searchProducts({
            query: heuristicQuery || "black wool coat women",
            country: (preferences.country as any) || "NL",
            currency: preferences.currency || (preferences.country === "US" ? "USD" : "EUR"),
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

            draftLines = [
              "Outfit:",
              ...heroLines,
              "Alternates:",
              "- Shoes: searching…",
              "- Outerwear: searching…",
            ];
          }
        } catch (e: any) {
          console.warn("[RunwayTwin] optimistic search failed:", e?.message);
          // fall through to static draft below
        }

        if (!draftLines.length) {
          // Static but realistic draft (EU-leaning)
          draftLines = [
            "Outfit:",
            "- Top: The Row — Wesler Merino T-Shirt | 590 EUR | Matches | https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt | ",
            "- Bottom: Levi's — 501 Original Straight | 110 EUR | Levi.com EU | https://www.levi.com/NL/en_NL/search?q=501 | ",
            "- Outerwear: Mango — Classic Cotton Trench | 119.99 EUR | Mango | https://shop.mango.com/nl/dames/jassen/trench-classic | ",
            "- Shoes: ZARA — Leather Penny Loafers | 69.95 EUR | ZARA | https://www.zara.com/nl/en/leather-penny-loafers-p0.html | ",
            "- Bag: A.P.C. — Grace Small Leather Bag | 520 EUR | A.P.C. | https://www.apcstore.com/en_eu/grace-small | ",
            "Alternates:",
            "- Shoes: Alexander Wang — Ava Slingback 75 | 495 EUR | Farfetch | https://www.farfetch.com/shopping/women/alexander-wang-ava-slingback-75-item-123.aspx | ",
            "- Outerwear: Agnona — Double-Face Cashmere Coat | 3200 EUR | SSENSE | https://www.ssense.com/en-eu/women/product/agnona/double-face-cashmere-coat/1234567 | ",
          ];
        }

        optimisticDraftText = draftLines.join("\n");
        for (const line of draftLines) {
          send({ type: "assistant_draft_delta", data: line + "\n" });
          // small cadence so UI sees multiple chunks (feels more "alive")
          // @ts-ignore
          await new Promise((r) => setTimeout(r, 8));
        }
        send({ type: "assistant_draft_done" });

        // 3) If missing key → finalize with optimistic draft (never leave the UI empty)
        if (!OPENAI_API_KEY) {
          console.warn("[RunwayTwin] Missing OPENAI_API_KEY — returning optimistic draft as final.");
          send({ type: "error", data: "Missing OPENAI_API_KEY on the server." });
          send({ type: "assistant_final", data: optimisticDraftText || "Temporary draft unavailable." });
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

        // 4) First pass: stream model deltas & accumulate tool calls
        let streamedText = "";
        let toolCalls: any[] = [];
        try {
          const { toolCalls: tc } = await streamOpenAI(
            baseMessages,
            toolSchemas,
            model,
            headers,
            new AbortController().signal,
            (delta) => {
              streamedText += delta;
              // surface to UI as extra draft deltas to keep the feeling of progress
              send({ type: "assistant_draft_delta", data: delta });
            }
          );
          toolCalls = tc || [];
        } catch (e: any) {
          console.warn("[RunwayTwin] OpenAI stream failed — using draft.", e?.message);
          send({ type: "error", data: "Upstream model stream failed; using draft." });
        }

        // Announce tool calls (UI/meta)
        if (toolCalls.length) {
          for (const call of toolCalls) {
            send({ type: "tool_call", data: { id: call.id, name: call.function?.name } });
          }
        }

        // 5) Execute tools (best-effort)
        const toolResults: ChatMessage[] = [];
        for (const call of toolCalls) {
          let resultPayload: any = null;
          try {
            if (call.function?.name === "search_products") {
              const args = JSON.parse(call.function.arguments || "{}");
              const results = await searchProducts({
                query: args.query || "",
                country: args.country,
                currency: args.currency,
                size: args.size,
                color: args.color,
                limit: Math.min(6, Number(args.limit || 6)),
                preferEU: (preferences.country || "NL") !== "US",
              });
              resultPayload = { ok: true, results };
            } else if (call.function?.name === "fx_convert") {
              const args = JSON.parse(call.function.arguments || "{}");
              const out = fxConvert(Number(args.amount), args.from, args.to);
              resultPayload = { ok: true, amount: out, currency: args.to };
            } else {
              resultPayload = { ok: false, error: "unknown_tool" };
            }
          } catch (err: any) {
            resultPayload = { ok: false, error: String(err?.message || err) };
          }
          send({ type: "tool_result", data: { tool: call.function?.name, result: resultPayload } });
          toolResults.push({
            role: "tool",
            content: JSON.stringify(resultPayload),
            name: call.function?.name,
            tool_call_id: call.id,
          });
        }

        // 6) Second pass (non-stream) → deterministic assistant_final
        let finalText = "";
        try {
          const body = { model, temperature: 0.4, messages: [...baseMessages, ...toolResults] };
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });
          const status = res.status;
          let data: any = null;
          try {
            data = await res.json();
          } catch {
            // ignore parse failure, will fallback
          }
          if (status >= 200 && status < 300) {
            finalText = data?.choices?.[0]?.message?.content || "";
          } else {
            console.warn("[OpenAI] finalization failed:", status, JSON.stringify(data).slice(0, 500));
            send({ type: "error", data: `Model finalization failed (${status}). Using draft.` });
          }
        } catch (err: any) {
          console.warn("[OpenAI] finalization exception:", err?.message);
          send({ type: "error", data: "Model finalization error; using draft." });
        }

        // If nothing came back, reuse the optimistic draft (critical for never-empty UI)
        if (!finalText || !finalText.trim()) finalText = optimisticDraftText || streamedText || "Outfit:\n- (draft unavailable)";

        // 7) Final + done
        send({ type: "assistant_final", data: finalText });
        send({ type: "done" });
      } catch (err: any) {
        const fallback = optimisticDraftText || "Outfit:\n- Top: — | — | — | —\n\n(An error occurred, but streaming remained responsive.)";
        console.error("[RunwayTwin] route fatal:", err?.message);
        send({ type: "error", data: String(err?.message || err) });
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
