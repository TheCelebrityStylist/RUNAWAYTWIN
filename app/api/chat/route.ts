import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas } from "./tools";
import { web_search, open_url_extract, catalog_search } from "./serverTools";

// Run on the edge for speed
export const runtime = "edge";

type ChatMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  // tool call id for "tool" role messages
  tool_call_id?: string;
  // name for "tool" role (not required, but handy to keep)
  name?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessages: ChatMsg[] = Array.isArray(body?.messages)
      ? body.messages
      : [];

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY missing" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build the message list: system + user provided messages
    const messages: any[] = [
      { role: "system", content: STYLIST_SYSTEM_PROMPT },
      ...userMessages,
    ];

    // First pass: allow the model to request tools
    const first = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: toolSchemas,
      tool_choice: "auto",
      temperature: 0.6,
    });

    const firstMsg = first.choices?.[0]?.message;
    if (!firstMsg) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    messages.push(firstMsg);

    // Handle tool calls (if any)
    if (Array.isArray(firstMsg.tool_calls) && firstMsg.tool_calls.length > 0) {
      for (const call of firstMsg.tool_calls) {
        const name = call.function?.name;
        let args: any = {};

        try {
          args = call.function?.arguments
            ? JSON.parse(call.function.arguments)
            : {};
        } catch {
          args = {};
        }

        let result: any;

        try {
          if (name === "web_search") {
            // expects: { query: string, num?: number }
            result = await web_search(args.query, args.num ?? 5);
          } else if (name === "open_url_extract") {
            // expects: { url: string }
            result = await open_url_extract(args.url);
          } else if (name === "catalog_search") {
            // expects: { query: string, budget?: string }
            result = await catalog_search(args.query, args.budget ?? "");
          } else {
            result = { error: `Unknown tool: ${name}` };
          }
        } catch (e: any) {
          result = { error: String(e?.message || e) };
        }

        // Feed the tool result back to the model
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name,
          content: JSON.stringify(result),
        });
      }

      // Second pass: final assistant response with tool results in context
      const second = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.6,
      });

      const finalMsg = second.choices?.[0]?.message;
      if (!finalMsg) {
        return NextResponse.json(
          { error: "No final response from model" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        role: "assistant",
        content: finalMsg.content ?? "",
      });
    }

    // No tools needed – return the first turn response
    return NextResponse.json({
      role: "assistant",
      content: firstMsg.content ?? "",
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: String(err?.message || err || "Unknown error") },
      { status: 500 }
    );
  }
}
