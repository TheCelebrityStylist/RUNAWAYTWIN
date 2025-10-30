// FILE: app/api/say/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const HAS_KEY = Boolean(process.env.OPENAI_API_KEY);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string | unknown[] };

function contentToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return (c as unknown[])
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object") {
          const o = p as Record<string, unknown>;
          const t =
            (o.text as string | undefined) ??
            (o.content as string | undefined) ??
            (o.value as string | undefined);
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

export async function POST(req: NextRequest) {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });

  try {
    if (!(req.headers.get("content-type") || "").includes("application/json")) {
      return new Response("Expected application/json body.", { status: 415, headers });
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
    };
    const history: ChatMessage[] = Array.isArray(body?.messages) ? body!.messages! : [];

    const sys =
      "You are a warm, concise fashion stylist. When the user is just chatting, respond in 1–2 short sentences and, if natural, ask one polite follow-up about their style or upcoming plans. Do not output lists, markdown headings, or JSON unless explicitly asked.";

    if (!HAS_KEY) {
      return new Response("Hi! I’m good — excited to style your next look. What occasion are you dressing for?", {
        headers,
      });
    }

    const completion = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: sys },
        ...history.map((m) => ({ role: m.role, content: contentToText(m.content) })),
      ],
    });

    const text = completion.choices?.[0]?.message?.content?.trim() || "Hey! What are we dressing for?";
    return new Response(text, { headers });
  } catch (err: unknown) {
    return new Response("Quick hello! What are we styling today?", { headers });
  }
}
