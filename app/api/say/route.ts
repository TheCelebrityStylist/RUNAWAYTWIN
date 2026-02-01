// FILE: app/api/say/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const apiKey = process.env.OPENAI_API_KEY;
const HAS_KEY = Boolean(apiKey);
const client = apiKey ? new OpenAI({ apiKey }) : null;

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
      "You are RunwayTwin, a professional personal stylist. Not an AI. Not a shopping assistant. Not a product recommender. Respond in 2–4 short, warm sentences, and if natural ask one polite follow-up about their style or upcoming plans. Keep it conversational and human. Do not output lists, markdown headings, or JSON unless explicitly asked.";

    if (!HAS_KEY) {
      return new Response(
        "Hi — I’m good, and I’m glad you’re here. Tell me what you’re dressing for and how you want to feel in it.",
        { headers }
      );
    }

    if (!client) {
      return new Response(
        "Hi — I’m good, and I’m glad you’re here. Tell me what you’re dressing for and how you want to feel in it.",
        { headers }
      );
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
