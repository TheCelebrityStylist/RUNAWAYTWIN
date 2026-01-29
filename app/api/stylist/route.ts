import OpenAI from "openai";
import { NextResponse } from "next/server";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function POST(req: Request) {
  try {
    const { message, prefs } = await req.json();

    const systemPrompt = `
You are RunwayTwin — an AI celebrity stylist. Your tone: confident, editorial, concise.
Given: a muse (celebrity) + occasion + preferences.
Return: a shoppable outfit idea (top, bottom, shoes, accessory), including a short reasoning (fit, palette, texture).

User prefs:
${JSON.stringify(prefs, null, 2)}
`;

    if (!client) {
      const fallback = "Mock reply: Add a sleek blazer, straight-leg trousers, and minimalist sneakers.";
      return NextResponse.json({ reply: fallback }, { status: 200 });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "No reply generated.";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ reply: "Error styling this look." }, { status: 500 });
  }
}
