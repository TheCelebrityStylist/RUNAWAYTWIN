// app/api/chat/route.ts
import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas, runTool } from "./tools";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type ToolCallDelta = {
  id?: string;
  function?: { name?: string; arguments?: string };
};

type ToolCallFull = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

function safeJSON(s: string) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}

function sseChunk(event: string, data: unknown) {
  return `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
}

function prefsToSystem(prefs: any) {
  const {
    gender = "unspecified",
    sizes = {},
    bodyType = "",
    budget = "",
    country = "",
    styleKeywords = [],
    height = "",
    weight = "",
  } = prefs || {};

  const sizeStr = Object.entries(sizes || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return [
    `### USER PROFILE`,
    `Gender: ${gender}`,
    `Sizes: ${sizeStr || "n/a"}`,
    `Body type: ${bodyType || "n/a"}`,
    `Height/Weight (optional): ${[height, weight].filter(Boolean).join(" / ") || "n/a"}`,
    `Budget: ${budget || "n/a"} (respect this across the look; include per-item prices + total)`,
    `Country: ${country || "n/a"}  (prefer local/EU/US stock & sizing)`,
    `Style keywords: ${styleKeywords.join(", ") || "n/a"}`,
    ``,
    `### HARD OUTPUT RULES`,
    `• Always deliver a complete head-to-toe look: top, bottom OR dress/jumpsuit, outerwear (if seasonally relevant), shoes, bag, 1–2 accessories.`,
    `• EACH item must have: Brand + Exact Item Name, Price with currency, Retailer name, and a working Link returned by tools (never invent URLs).`,
    `• Explain why each item flatters this body type: rise, drape, neckline, silhouette, hem length, proportions, fabrication.`,
    `• Respect budget. Show a) primary total and b) “save” alternative if the primary exceeds budget.`,
    `• Provide 1–2 alternates for shoes and outerwear (with links).`,
    `• Include a short “Capsule & Tips” section: how to remix 2–3 ways + 2 concise styling tips (fit/care/occasion upgrades).`,
    `• If tools find zero stock for a requested spec, say it transparently and offer the closest in-stock alternative (with links).`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const { messages = [], preferences } = body || {};

  // Base message stack: persona + user profile + conversation history
  let msgStack: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    { role: "system", content: prefsToSystem(preferences) },
    ...(Array.isArray(messages) ? messages : []),
  ];

  // Strongly type tool definitions for the SDK ("function" literal)
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = (toolSchemas || []).map((fn) => ({
    type: "function",
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.schema,
    },
  }));

  // Build a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const keepAlive = setInterval(() => {
        controller.enqueue(sseChunk("ping", { t: Date.now() }));
      }, 15000);

      async function runOnce(
        msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        emitDraft: boolean
      ): Promise<void> {
        // Primary streaming turn
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: msgs,
          tools,
          tool_choice: "auto",
          stream: true,
        });

        let accText = "";
        // Accumulate tool calls by ID (since they arrive in deltas)
        const toolCallsMap: Record<string, { name: string; arguments: string }> = {};

        for await (const part of completion) {
          const choice = part.choices?.[0];
          if (!choice) continue;

          // Text deltas
          const deltaText = (choice.delta?.content as string) || "";
          if (deltaText) {
            accText += deltaText;
            controller.enqueue(
              sseChunk(emitDraft ? "assistant_draft_delta" : "assistant_delta", { text: deltaText })
            );
          }

          // Tool call deltas
          const tcs = choice.delta?.tool_calls as ToolCallDelta[] | undefined;
          if (tcs?.length) {
            for (const d of tcs) {
              if (!d) continue;
              const id = d.id!;
              const name = d.function?.name || toolCallsMap[id]?.name || "unknown";
              const argsChunk = d.function?.arguments || "";
              toolCallsMap[id] = {
                name,
                arguments: (toolCallsMap[id]?.arguments || "") + argsChunk,
              };
            }
          }

          if (choice.finish_reason) break;
        }

        if (emitDraft) {
          controller.enqueue(sseChunk("assistant_draft_done", { text: accText }));
        }

        // If there were tool calls, execute them and recurse once more
        const calls = Object.entries(toolCallsMap);
        if (calls.length) {
          const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

          for (const [id, { name, arguments: argStr }] of calls) {
            const args = safeJSON(argStr);
            controller.enqueue(sseChunk("tool_call", { id, name, args }));
            try {
              const result = await runTool(name, args, { preferences });
              controller.enqueue(sseChunk("tool_result", { id, ok: true, result }));
              toolResults.push({
                role: "tool",
                tool_call_id: id,
                content: JSON.stringify(result),
              } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
            } catch (err: any) {
              const error = err?.message || "Tool error";
              controller.enqueue(sseChunk("tool_result", { id, ok: false, error }));
              toolResults.push({
                role: "tool",
                tool_call_id: id,
                content: JSON.stringify({ error }),
              } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
            }
          }

          // Append the assistant stub + tool results and rerun (no draft this time)
          msgStack.push(
            { role: "assistant", content: "" } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam,
            ...toolResults
          );
          return runOnce(msgStack, false);
        }

        // Critique pass (non-stream) to tighten to our rubric
        const critique = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            ...msgStack,
            { role: "assistant", content: accText },
            {
              role: "system",
              content: [
                "Refine the assistant answer with these checks:",
                "1) Each item has brand + exact name, price, retailer, and a tool-derived link.",
                "2) Body-type reasons are explicit (proportions, rise, neckline, hem, fabric).",
                "3) Respect budget; include total and a save option if needed.",
                "4) Provide alternates for shoes + outerwear (with links).",
                "5) Add 'Capsule & Tips' (2–3 outfit remixes + 2 succinct tips).",
                "6) Remove filler; be specific; never invent links.",
              ].join("\n"),
            },
          ],
        });

        const finalText = critique.choices?.[0]?.message?.content || accText;
        controller.enqueue(sseChunk("assistant_final", { text: finalText }));
      }

      try {
        await runOnce(msgStack, true);
        controller.enqueue(sseChunk("done", {}));
      } catch (err: any) {
        controller.enqueue(sseChunk("error", { message: err?.message || "Oops something went wrong." }));
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
