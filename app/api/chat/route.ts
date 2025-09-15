// app/api/chat/route.ts
import OpenAI from "openai";
import type { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas, runTool } from "./tools";

export const runtime = "edge";

const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
// NOTE: We always define a variable `client` of type OpenAI so TS never sees `null`,
// and we ONLY use it in the HAS_OPENAI branch at runtime.
const client: OpenAI = HAS_OPENAI
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  // @ts-expect-error – assigned only to satisfy type; never used unless HAS_OPENAI is true
  : null;

type ToolCallDelta = {
  id?: string;
  function?: { name?: string; arguments?: string };
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
    height = "",
    weight = "",
  } = prefs || {};

  const sizeStr = Object.entries(sizes || {}).map(([k, v]) => `${k}: ${v}`).join(", ");

  return [
    `### USER PROFILE`,
    `Gender: ${gender}`,
    `Sizes: ${sizeStr || "n/a"}`,
    `Body type: ${bodyType || "n/a"}`,
    `Height/Weight (optional): ${[height, weight].filter(Boolean).join(" / ") || "n/a"}`,
    `Budget: ${budget || "n/a"} (respect this; show per-item + total)`,
    `Country: ${country || "n/a"} (prefer local/EU/US stock & sizing)`,
    `Style keywords: ${styleKeywords.join(", ") || "n/a"}`,
    ``,
    `### HARD OUTPUT RULES`,
    `• Complete look: top, bottom OR dress/jumpsuit, outerwear (if seasonally relevant), shoes, bag, 1–2 accessories.`,
    `• EACH item => Brand + Exact Item, Price + currency, Retailer, Link (from tools only).`,
    `• Explain *why it flatters* this body type (rise, drape, neckline, silhouette, proportions, fabrication).`,
    `• Respect budget; show total; include “save” alternatives if needed.`,
    `• Provide 1–2 alternates for shoes and outerwear (with links).`,
    `• Add “Capsule & Tips”: 2–3 remix ideas + two concise tips.`,
    `• If zero stock for a spec, say it and propose closest in-stock alternative (with links).`,
  ].join("\n");
}

function lastUserText(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      const textPart = m.content.find((p: any) => p?.type === "text");
      if (textPart?.text) return textPart.text;
    }
  }
  return "";
}

/** Deterministic, tool-backed demo output (used when no API key or on upstream errors). */
async function demoResponse(preferences: any, userText: string) {
  const country = preferences?.country || "NL";
  const results = {
    top: await runTool("retailer_search", { query: "ivory rib long-sleeve top women", country, limit: 6 }),
    bottom: await runTool("retailer_search", { query: "charcoal tapered wool trousers women", country, limit: 6 }),
    outer: await runTool("retailer_search", { query: "black tailored coat women", country, limit: 6 }),
    shoes: await runTool("retailer_search", { query: "black leather ankle boots women", country, limit: 6 }),
    bag: await runTool("retailer_search", { query: "black leather shoulder bag women", country, limit: 6 }),
    acc1: await runTool("retailer_search", { query: "gold hoop earrings", country, limit: 6 }),
  } as any;

  function pick(o: any, fallback: string) {
    return o?.items?.[0] || { brand: "RunwayTwin", title: fallback, price: 120, currency: "EUR", retailer: "Demo", url: "https://example.com" };
  }

  const top = pick(results.top, "Rib Knit");
  const bottom = pick(results.bottom, "Wool Trouser");
  const outer = pick(results.outer, "Tailored Coat");
  const shoes = pick(results.shoes, "Leather Boot");
  const bag = pick(results.bag, "Leather Shoulder Bag");
  const acc = pick(results.acc1, "Gold Hoop Earrings");

  const total = [top, bottom, outer, shoes, bag].reduce((s, x) => s + (Number(x.price) || 0), 0);
  const euro = (n: number) => `€${Math.round(n)}`;

  const concept = `Sculpted minimalism with Zendaya’s sharp proportions — elongated lines, clean monochrome, and a controlled sheen.`;

  const outfitLines = [
    `- Top — ${top.brand} ${top.title} (${euro(top.price)}, ${top.retailer}) · ${top.url}`,
    `- Trousers — ${bottom.brand} ${bottom.title} (${euro(bottom.price)}, ${bottom.retailer}) · ${bottom.url}`,
    `- Outerwear — ${outer.brand} ${outer.title} (${euro(outer.price)}, ${outer.retailer}) · ${outer.url}`,
    `- Shoes — ${shoes.brand} ${shoes.title} (${euro(shoes.price)}, ${shoes.retailer}) · ${shoes.url}`,
    `- Bag — ${bag.brand} ${bag.title} (${euro(bag.price)}, ${bag.retailer}) · ${bag.url}`,
    `- Accessories — ${acc.brand} ${acc.title} (${euro(acc.price || 45)}, ${acc.retailer}) · ${acc.url}`,
  ].join("\n");

  const bodyType = (preferences?.bodyType || "your frame")
    .replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase());

  const text =
`Stylist POV: ${concept}

Outfit:
${outfitLines}

Why it flatters:
- ${bodyType}: high-rise tailored trouser lengthens the leg; slim rib top defines the waist; long coat creates one sleek column.
- Proportion play: cropped sleeve or pushed cuffs highlight forearms; pointed boots extend the line under a straight hem.
- Fabric mix: wool + polished leather = formal without glare in photos.

Alternates:
- Shoes — Aeyde Ella Pump (≈€290, Zalando) · https://www.zalando.example/aeyde-ella
- Outerwear — Arket Double-Faced Coat (≈€260, Arket) · https://www.arket.example/dbl-coat

Budget & Total:
- Estimated total (primary items): ~${euro(total)}
- Save move: swap coat for Arket option; total drops by ~€80.

Capsule & Tips:
- Remix: pair the rib top with vintage denim and the coat; or style the trousers with a silk camisole and the pumps.
- Tip 1: hem trousers to skim the boot shaft for a continuous line.
- Tip 2: a soft brown eyeliner + clear gloss keeps the look modern, not too formal.

(You asked: “${userText || "Outfit request"}”)`;

  return text;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { messages = [], preferences } = body || {};
  const userText = lastUserText(messages);

  let msgStack: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    { role: "system", content: prefsToSystem(preferences) },
    ...(Array.isArray(messages) ? messages : []),
  ];

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = (toolSchemas || []).map((fn) => ({
    type: "function",
    function: { name: fn.name, description: fn.description, parameters: fn.schema },
  }));

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sseChunk("ready", { ok: true }));
      const ping = setInterval(() => controller.enqueue(sseChunk("ping", { t: Date.now() })), 15000);

      const finish = (ok = true) => {
        try { controller.enqueue(sseChunk("done", { ok })); } catch {}
        clearInterval(ping);
        controller.close();
      };

      // If no OpenAI key => deterministic demo
      if (!HAS_OPENAI) {
        const text = await demoResponse(preferences, userText);
        for (const chunk of text.match(/.{1,240}/g) || []) {
          controller.enqueue(sseChunk("assistant_draft_delta", { text: chunk }));
        }
        controller.enqueue(sseChunk("assistant_draft_done", {}));
        controller.enqueue(sseChunk("assistant_final", { text }));
        finish(true);
        return;
      }

      // Normal path (OpenAI available)
      async function runOnce(
        msgs: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        emitDraft: boolean
      ): Promise<void> {
        let accText = "";
        const toolCallsMap: Record<string, { name: string; arguments: string }> = {};

        let completion: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
        try {
          completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.7,
            messages: msgs,
            tools,
            tool_choice: "auto",
            stream: true,
          });
        } catch {
          const text = await demoResponse(preferences, userText);
          controller.enqueue(sseChunk("assistant_final", { text }));
          finish(false);
          return;
        }

        try {
          for await (const part of completion) {
            const choice = part.choices?.[0];
            if (!choice) continue;

            const deltaText = (choice.delta?.content as string) || "";
            if (deltaText) {
              accText += deltaText;
              controller.enqueue(sseChunk(emitDraft ? "assistant_draft_delta" : "assistant_delta", { text: deltaText }));
            }

            const tcs = choice.delta?.tool_calls as ToolCallDelta[] | undefined;
            if (tcs?.length) {
              for (const d of tcs) {
                if (!d) continue;
                const id = d.id!;
                const name = d.function?.name || toolCallsMap[id]?.name || "unknown";
                const argsChunk = d.function?.arguments || "";
                toolCallsMap[id] = { name, arguments: (toolCallsMap[id]?.arguments || "") + argsChunk };
              }
            }
            if (choice.finish_reason) break;
          }
        } catch {
          const text = await demoResponse(preferences, userText);
          controller.enqueue(sseChunk("assistant_final", { text }));
          finish(false);
          return;
        }

        if (emitDraft) controller.enqueue(sseChunk("assistant_draft_done", { text: accText }));

        const entries = Object.entries(toolCallsMap);
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
              toolResults.push({ role: "tool", tool_call_id: id, content: JSON.stringify({ error: "Tool error" }) } as any);
            }
          }
          msgStack.push({ role: "assistant", content: "" } as any, ...toolResults);
          return runOnce(msgStack, false);
        }

        // Critique pass (non-stream)
        let finalText = accText;
        try {
          const critique = await client.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.4,
            messages: [
              ...msgStack,
              { role: "assistant", content: accText },
              {
                role: "system",
                content: [
                  "Refine the assistant answer with these checks:",
                  "1) Each item has brand + exact name, price, retailer, tool-derived link.",
                  "2) Body-type reasons explicit (rise, neckline, hem, fabric).",
                  "3) Respect budget; include total and a save option if needed.",
                  "4) Alternates for shoes + outerwear.",
                  "5) 'Capsule & Tips' (2–3 remixes + 2 tips).",
                  "6) No invented links.",
                ].join("\n"),
              },
            ],
          });
          finalText = critique.choices?.[0]?.message?.content || accText;
        } catch {
          // keep accText
        }

        controller.enqueue(sseChunk("assistant_final", { text: finalText }));
      }

      try {
        await runOnce(msgStack, true);
      } finally {
        finish(true);
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
