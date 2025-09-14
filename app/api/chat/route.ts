import { NextRequest } from "next/server";
import OpenAI from "openai";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas } from "./tools";
import { web_search, open_url_extract, catalog_search } from "./serverTools";

export const runtime = "edge";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = process.env.NEXT_PUBLIC_CHAT_MODEL || "gpt-4o-mini";

export async function POST(req: NextRequest) {
  const { messages, profile } = await req.json();
  // profile: optional user profile object (region, sizes, etc)

  const system = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    profile ? { role: "system", content: `User profile JSON:\n${JSON.stringify(profile)}` } : null
  ].filter(Boolean);

  // Tool loop with streaming to client
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      async function send(chunk: string) {
        controller.enqueue(encoder.encode(chunk));
      }

      let toolState: any[] = [];
      let chat = [...system, ...messages];

      while (true) {
        const resp = await client.chat.completions.create({
          model: MODEL,
          messages: chat as any,
          tools: toolSchemas as any,
          stream: false,
          temperature: 0.6,
        });

        const choice = resp.choices[0];
        const toolCall = choice.message.tool_calls?.[0];

        if (toolCall) {
          // Call the tool server-side
          const { name, arguments: argStr } = toolCall.function!;
          const args = argStr ? JSON.parse(argStr) : {};

          let result: any;
          try {
            if (name === "web_search") result = await web_search(args);
            else if (name === "open_url_extract") result = await open_url_extract(args);
            else if (name === "catalog_search") result = await catalog_search(args);
            else result = { error: `Unknown tool: ${name}` };
          } catch (e: any) {
            result = { error: String(e?.message || e) };
          }

          // Add tool result back into the chat
          chat = [
            ...chat,
            { role: "assistant", tool_calls: [toolCall] } as any,
            { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) } as any,
          ];
          toolState.push({ name, args, result });
          continue;
        }

        // No tool requested → final message
        const text = choice.message.content || "";
        // Simple SSE-like stream: send final text at once (you can upgrade to proper chunk streaming later)
        await send(text);
        controller.close();
        break;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
