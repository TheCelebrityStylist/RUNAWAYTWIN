// FILE: app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { encodeSSE } from "../../../lib/sse/reader";
import { searchProducts, fxConvert } from "../tools"; // ← change to "./tools" only if your tools file lives in app/api/chat/

export const runtime = "edge";

/* ──────────────────────────────────────────────────────────────
   OpenAI client (Edge-safe)
   ────────────────────────────────────────────────────────────── */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

type Preferences = {
  gender?: string;
  top?: string;
  bottom?: string;
  dress?: string;
  shoe?: string;
  bodyType?: string;
  budget?: string;
  country?: string;
  currency?: string;
  styleKeywords?: string;
};

type SearchArgs = {
  query?: string;
  country?: string;
  currency?: string;
  size?: string;
  color?: string;
  limit?: number;
};

type FxArgs = {
  amount?: number;
  from?: string;
  to?: string;
};

/* ──────────────────────────────────────────────────────────────
   Utils
   ────────────────────────────────────────────────────────────── */
function safeJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

// The SDK can return message.content as string OR an array of parts.
// Normalize to plain text so our tool calls always receive a string.
function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return (content as any[])
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.text && typeof part.text === "string") return part.text;
        if (part?.content && typeof part.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

async function send(writer: WritableStreamDefaultWriter, evt: any) {
  await writer.write(encodeSSE(evt));
}

/* ──────────────────────────────────────────────────────────────
   Route
   ────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const preferences: Preferences = body?.preferences || {};

  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    ...messages,
  ];

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    try {
      // First pass: let the model decide if it wants tools
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        stream: false,
        messages: baseMessages,
        tools: [
          {
            type: "function",
            function: {
              name: "search_products",
              description: "Search for fashion products across adapters and return normalized items.",
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
              },
            },
          },
          {
            type: "function",
            function: {
              name: "fx_convert",
              description: "Convert a price into another currency (static FX).",
              parameters: {
                type: "object",
                properties: {
                  amount: { type: "number" },
                  from: { type: "string" },
                  to: { type: "string" },
                },
              },
            },
          },
        ],
      });

      const assistantMsg = completion.choices[0].message;

      // Execute tool calls (fail-soft so the UI never shows a hard error)
      const toolResults: ChatMessage[] = [];
      const toolCalls = assistantMsg.tool_calls || [];

      for (const call of toolCalls) {
        await send(writer, { type: "tool_call", data: { id: call.id, name: call.function?.name } });

        let resultPayload: any = { ok: true };
        try {
          if (call.function?.name === "search_products") {
            const args = safeJSON<SearchArgs>(call.function.arguments, {});
            const lastUser = [...baseMessages].reverse().find((m) => m.role === "user");
            const fallback = contentToText(lastUser?.content);
            const q = (typeof args.query === "string" && args.query.trim().length > 0)
              ? args.query
              : fallback;

            const results = await searchProducts({
              query: q,
              country: args.country || preferences.country,
              currency:
                args.currency ||
                preferences.currency ||
                (preferences.country === "US" ? "USD" : "EUR"),
              size: args.size ?? null,
              color: args.color ?? null,
              limit: Math.min(6, Number(args.limit || 6)),
              preferEU: (preferences.country || "NL") !== "US",
            });

            resultPayload = { ok: true, results };
          } else if (call.function?.name === "fx_convert") {
            const args = safeJSON<FxArgs>(call.function.arguments, {});
            const amount = Number(args.amount || 0);
            const from = String(args.from || "EUR");
            const to = String(
              args.to ||
                preferences.currency ||
                (preferences.country === "US" ? "USD" : "EUR")
            );
            resultPayload = { ok: true, amount: fxConvert(amount, from, to), currency: to };
          } else {
            resultPayload = { ok: true, note: "unknown_tool_ignored" };
          }
        } catch (err: any) {
          console.warn("[RunwayTwin] tool execution error:", err?.message || err);
          resultPayload = { ok: true, results: [] }; // fail-soft
        }

        await send(writer, { type: "tool_result", data: { tool: call.function?.name, result: resultPayload } });

        // IMPORTANT: tool messages must be exactly { role: 'tool', content, tool_call_id }
        toolResults.push({
          role: "tool",
          content: JSON.stringify(resultPayload),
          tool_call_id: call.id,
        });
      }

      // Second pass: finalize with tool results; stream to client
      const finalStream = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        stream: true,
        messages: [...baseMessages, assistantMsg, ...toolResults],
      });

      for await (const chunk of finalStream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          await send(writer, { type: "assistant_draft_delta", data: content });
        }
      }

      await send(writer, { type: "assistant_draft_done" });
      await send(writer, { type: "done" });
    } catch (err: any) {
      console.error("[RunwayTwin] Chat error:", err);
      // graceful fallback: still close the stream properly
      await send(writer, { type: "error", data: { message: err?.message || "unknown" } });
      await send(writer, { type: "done" });
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
