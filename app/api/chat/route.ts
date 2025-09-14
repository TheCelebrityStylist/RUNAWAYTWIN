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

export async function POST(req: NextRequest) {
  const body = await req.json();
  let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    ...(Array.isArray(body?.messages) ? body.messages : []),
  ];

  // Wrap schemas for OpenAI
  const tools = toolSchemas.map((fn) => ({ type: "function" as const, function: fn }));

  // Server-Sent Events stream
  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: unknown) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        // tool loop (max 4 hops)
        for (let hop = 0; hop < 4; hop++) {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.6,
            tool_choice: "auto",
            tools,
            messages,
          });

          const choice = completion.choices?.[0];
          const msg = choice?.message;

          // Send assistant draft token block (useful when the model emits thoughts before tool calls)
          if (msg?.content) write({ type: "assistant-draft", content: msg.content });

          // Record this assistant step
          messages.push({
            role: "assistant",
            content: msg?.content ?? "",
            tool_calls: msg?.tool_calls as any,
          });

          const toolCalls = (msg?.tool_calls || []) as ToolCall[];
          if (!toolCalls.length) {
            // Self-critique pass: ask the model to sanity-check the final answer + add citations if we used tools
            const usedTools = messages.some((m) => (m as any).role === "tool");
            const refine = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              temperature: 0.3,
              messages: [
                ...messages,
                {
                  role: "system",
                  content:
                    "CRITIQUE PASS: If any advice is generic or contradictory, tighten it. If tools were used, append a short 'Sources' list with 1–3 links.",
                },
              ],
            });

            const finalText = refine.choices?.[0]?.message?.content ?? msg?.content ?? "";
            write({ type: "final", content: finalText, usedTools });
            break;
          }

          // Execute tools and feed results
          for (const call of toolCalls) {
            write({ type: "tool-start", name: call.function.name });
            let result: unknown;
            try {
              const args = safeJSON(call.function.arguments);
              result = await runTool(call.function.name, args);
            } catch (e: any) {
              result = { error: e?.message || String(e) };
            }
            write({ type: "tool-result", name: call.function.name, result });

            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
          }
        }
      } catch (e: any) {
        write({ type: "error", message: e?.message || String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
