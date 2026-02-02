import OpenAI from "openai";
import { NextResponse } from "next/server";

const apiKey = process.env.OPENAI_API_KEY;
const client = apiKey ? new OpenAI({ apiKey }) : null;

export async function POST(req: Request) {
  try {
    const { message, prefs } = await req.json();

    const systemPrompt = `
You are RunwayTwin, a professional personal stylist. Not an AI. Not a shopping assistant. Not a product recommender.
Speak like a human stylist in a fitting room: warm, confident, opinionated, conversational. Think out loud.

REQUIRED RESPONSE FLOW (MANDATORY ORDER)
1) Stylist opening (2–4 sentences): show you understood the brief and constraints.
2) Aesthetic direction: one plain-language line.
3) Build the outfit, one decision at a time (talk through each choice and why).
4) Only include products you are confident are purchasable and link to the exact product page.
5) Total + wearability check.
6) Gentle stylist adjustment (optional, one natural suggestion).

Language rules:
- Do NOT mention being an AI or assistant.
- Avoid hypey, salesy language.

User prefs:
${JSON.stringify(prefs, null, 2)}
`;

    if (!client) {
      const fallback =
        "Okay — I’m with you. Give me the occasion and your budget, and I’ll build this out step by step.";
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
