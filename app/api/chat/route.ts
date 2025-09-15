// app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas, runTool } from "./tools";

export const runtime = "edge";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

function safeJSON(s: string) {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
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
  } = prefs || {};
  const sizeStr = Object.entries(sizes || {}).map(([k, v]) => `${k}: ${v}`).join(", ");

  return [
    `### USER PROFILE`,
    `Gender: ${gender}`,
    `Sizes: ${sizeStr || "n/a"}`,
    `Body type: ${bodyType || "n/a"}`,
    `Budget: ${budget || "n/a"}`,
    `Country: ${country || "n/a"}  (prefer local stock & correct sizing)`,
    `Style keywords: ${styleKeywords.join(", ") || "n/a"}`,
    "",
    `### OUTPUT RULES (HARD)`,
    `• Always propose a head-to-toe look (top, bottom/dress, outerwear if relevant, shoes, bag, accessories).`,
    `• Links MUST come from tool results (retailer_search / stock_check / affiliate_link). Never invent URLs.`,
    `• Provide EU and/or US stock options depending on user's country.`,
    `• Body-type aware: explicitly explain why each item flatters.`,
    `• Respect budget: show price per item and total.`,
    `• Offer 1–2 alternates for key items and 1 capsule note.`,
    `• If tools return nothing for an item, say so and suggest the closest alternative (with links).`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages = [], preferences } = body || {};

  let msgStack: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    { role: "system", content: prefsToSystem(preferences) },
    ...(Array.isArray(messages) ? messages : []),
  ];

  const tools = (toolSchemas || []).map((fn: any) => ({
    type: "function",
    function: { name: fn.name, description: fn.description, parameters: fn.schema },
  }));

  const stream = new ReadableStream({
    async start(controller) {
      const ping = setInterval(() => {
        controller.enqueue(sseChunk("ping", { t: Date.now() }));
      }, 15000);

      async function doStream(
        msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        emitDraft: boolean
      ) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.7,
          messages: msgs,
          tools,
          tool_choice: "auto",
          stream: true,
        });

        let accText = "";
        let toolCalls: Record<string, { name: string; arguments: string }> = {};

        for await (const part of completion) {
          const choice = part.choices?.[0];
          if (!choice) continue;

          const deltaText = (choice.delta?.content as string) || "";
          if (deltaText) {
            accText += deltaText;
            controller.enqueue(
              sseChunk(emitDraft ? "assistant_draft_delta" : "assistant_delta", { text: deltaText })
            );
          }

          const tcs = choice.delta?.tool_calls;
          if (tcs && tcs.length) {
            for (const call of tcs) {
              const id = call.id!;
              const name = call.function?.name || toolCalls[id]?.name || "unknown";
              const argsChunk = call.function?.arguments || "";
              toolCalls[id] = { name, arguments: (toolCalls[id]?.arguments || "") + argsChunk };
            }
          }

          if (choice.finish_reason) break;
        }

        if (emitDraft) {
          controller.enqueue(sseChunk("assistant_draft_done", { text: accText }));
        }

        const entries = Object.entries(toolCalls);
        if (entries.length) {
          const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
          for (const [id, { name, arguments: argStr }] of entries) {
            const args = safeJSON(argStr);
            controller.enqueue(sseChunk("tool_call", { id, name, args }));
            try {
              const result = await runTool(name, args, { preferences });
              controller.enqueue(sseChunk("tool_result", { id, ok: true, result }));
              toolResults.push({ role: "tool", tool_call_id: id, content: JSON.stringify(result) } as any);
            } catch (err: any) {
              controller.enqueue(sseChunk("tool_result", { id, ok: false, error: err?.message || "Tool error" }));
              toolResults.push({
                role: "tool",
                tool_call_id: id,
                content: JSON.stringify({ error: err?.message || "Tool error" }),
              } as any);
            }
          }
          msgStack.push({ role: "assistant", content: "" } as any, ...toolResults);
          return doStream(msgStack, false);
        }

        // critique pass (non-stream)
        const critique = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.4,
          messages: [
            ...msgStack,
            { role: "assistant", content: accText },
            {
              role: "system",
              content: [
                "Critique and improve the assistant answer with these rules:",
                "• Every item needs: name, brand, price, retailer, working link (from tools), and why-it-flatters.",
                "• Align EU/US stock with user's country.",
                "• Respect budget; include estimated total and a budget-conscious variant if necessary.",
                "• Add 1–2 alternates for shoes and outerwear.",
                "• Add a short capsule note and 2 styling tips.",
                "• Be specific. No invented links.",
              ].join("\n"),
            },
          ],
        });

        const finalText = critique.choices?.[0]?.message?.content || accText;
        controller.enqueue(sseChunk("assistant_final", { text: finalText }));
      }

      try {
        await doStream(msgStack, true);
        controller.enqueue(sseChunk("done", {}));
      } catch (err: any) {
        controller.enqueue(sseChunk("error", { message: err?.message || "Oops something went wrong." }));
      } finally {
        clearInterval(ping);
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
