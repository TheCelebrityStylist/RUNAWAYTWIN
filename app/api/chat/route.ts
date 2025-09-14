// /app/api/chat/route.ts
// Edge-ready chat endpoint with tool calling loop (OpenAI v4 SDK).

import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas, runTool } from "./tools";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Expecting { messages: Array<ChatCompletionMessageParam> }
    // where user/frontend keeps accumulating chat.
    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: STYLIST_SYSTEM_PROMPT },
      ...(Array.isArray(body?.messages) ? body.messages : []),
    ];

    // Wrap tools in OpenAI format
    const tools = toolSchemas.map((fn) => ({ type: "function" as const, function: fn }));

    // Tool-call loop: ask the model; if it requests tools, run them and feed results back.
    // Break when there's no new tool call.
    // (We cap the loop to protect against infinite ping-pong.)
    for (let step = 0; step < 4; step++) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.6,
        tool_choice: "auto",
        tools,
        messages,
      });

      const choice = completion.choices?.[0];
      const msg = choice?.message;

      if (!msg) {
        return NextResponse.json(
          { error: "No completion choices" },
          { status: 500 }
        );
      }

      // Add assistant message with potential tool_calls
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: msg.tool_calls as any,
      });

      const toolCalls = (msg.tool_calls || []) as ToolCall[];
      if (!toolCalls.length) {
        // Final answer
        return NextResponse.json({
          id: completion.id,
          created: completion.created,
          model: completion.model,
          message: msg, // assistant final message
        });
      }

      // Execute each tool, push a "tool" role message back
      for (const call of toolCalls) {
        try {
          const args = safeJSON(call.function.arguments);
          const result = await runTool(call.function.name, args);

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
        } catch (e: any) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: e?.message || String(e) }),
          } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
        }
      }

      // Loop will call the model again with the new tool messages.
    }

    return NextResponse.json({
      error: "Tool loop limit reached",
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

/** Parse JSON safely; returns {} on failure. */
function safeJSON(s: string) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
}
