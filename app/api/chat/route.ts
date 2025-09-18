// FILE: app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { encodeSSE } from "../../../lib/sse/reader"; // ✅ path check
import { searchProducts, fxConvert } from "./tools";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// =============== Types ===============
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

// =============== Helpers ===============
function safeJSON<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function send(ctrl: TransformStreamDefaultController, msg: any) {
  ctrl.enqueue(encodeSSE(msg));
}

// =============== Route Handler ===============
export async function POST(req: NextRequest) {
  const body = await req.json();
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const preferences: Preferences = body?.preferences || {};

  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    ...messages,
  ];

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    const ctrl = {
      enqueue: (chunk: any) => writer.write(chunk),
      close: () => writer.close(),
    };

    try {
      // === Initial model call ===
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: false,
        messages: baseMessages,
        tools: [
          {
            type: "function",
            function: {
              name: "search_products",
              description: "Search for fashion products across adapters",
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
              description: "Convert a price into another currency",
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

      // === Execute tool calls (fail-soft) ===
      const toolResults: ChatMessage[] = [];
      const toolCalls = assistantMsg.tool_calls || [];

      for (const call of toolCalls) {
        send(ctrl, {
          type: "tool_call",
          data: { id: call.id, name: call.function?.name },
        });

        let resultPayload: any = { ok: true };
        try {
          if (call.function?.name === "search_products") {
            const args = safeJSON<SearchArgs>(call.function.arguments, {});
            const fallbackUser =
              [...baseMessages].reverse().find((m) => m.role === "user")
                ?.content || "";
            const q = args.query ? String(args.query) : fallbackUser;

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
            const out = fxConvert(amount, from, to);
            resultPayload = { ok: true, amount: out, currency: to };
          } else {
            resultPayload = { ok: true, note: "unknown_tool_ignored" };
          }
        } catch (err: any) {
          console.warn("[RunwayTwin] tool execution error:", err?.message || err);
          resultPayload = { ok: true, results: [] };
        }

        send(ctrl, {
          type: "tool_result",
          data: { tool: call.function?.name, result: resultPayload },
        });

        toolResults.push({
          role: "tool",
          name: call.function?.name,
          tool_call_id: call.id,
          content: JSON.stringify(resultPayload),
        });
      }

      // === Follow-up call with tool results ===
      const finalCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [...baseMessages, assistantMsg, ...toolResults],
      });

      for await (const chunk of finalCompletion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          send(ctrl, { type: "chat", data: content });
        }
      }
    } catch (err: any) {
      console.error("[RunwayTwin] Chat error:", err);
      send(ctrl, { type: "error", data: { message: err?.message || "unknown" } });
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
