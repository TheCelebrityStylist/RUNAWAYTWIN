// app/api/chat/route.ts
export const runtime = "edge";
// If you're deploying on Vercel Edge and want global availability,
// you can optionally pin a region, but it's not required.
// export const preferredRegion = "iad1";

import type { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas, createToolDispatcher } from "./tools";
import type { ToolName } from "./tools";
import { awinAdapter } from "./tools/adapters/awinAdapter";
import { webAdapter } from "./tools/adapters/webAdapter";
import { demoAdapter } from "./tools/adapters/demoAdapter";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const dispatcher = createToolDispatcher([awinAdapter, webAdapter, demoAdapter]);
const { runTool } = dispatcher;

const isToolName = (value: string): value is ToolName =>
  toolSchemas.some((tool) => tool.name === value);

/** ---------- Utilities ---------- */

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string | any }
  | { role: "tool"; tool_call_id: string; content: string };

type ToolCallDelta = {
  id?: string;
  function?: { name?: string; arguments?: string };
  type?: "function";
  index?: number;
};

function sse(event: string, data: unknown) {
  return `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
}

function safeJSON(s: string) {
  try {
    return JSON.parse(s || "{}");
  } catch {
    return {};
  }
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

  const sizeStr = Object.entries(sizes || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

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

/** Quick “optimistic” draft that uses tools + prefs so the UI replies instantly. */
async function optimisticDraft(preferences: any, userText: string) {
  const country = preferences?.country || "NL";

  const currencyPref = (preferences?.currency || "EUR").toUpperCase();
  const ctx = { preferences };
  const search = (query: string) =>
    runTool(
      "retailer_search",
      { query, country, limit: 3 },
      ctx
    );

  // Pull a few quick items using the adapters in order (affiliate → web → demo).
  const [topR, trouR, coatR, shoeR, bagR, accR] = await Promise.all([
    search("ivory rib long-sleeve top women"),
    search("charcoal tapered wool trousers women"),
    search("black tailored coat women"),
    search("black leather ankle boots women"),
    search("black leather shoulder bag women"),
    search("gold hoop earrings"),
  ] as const);

  const pick = (r: any) =>
    (r?.items || []).find((item: any) => item?.url || item?.link) || null;

  const top = pick(topR);
  const trou = pick(trouR);
  const coat = pick(coatR);
  const shoe = pick(shoeR);
  const bag = pick(bagR);
  const acc = pick(accR);

  const money = (value?: number, currency?: string) => {
    if (!Number.isFinite(value)) return "";
    const code = (currency || currencyPref || "EUR").toUpperCase();
    const symbol = code === "EUR" ? "€" : code === "USD" ? "$" : code === "GBP" ? "£" : `${code} `;
    return `${symbol}${Math.round(Number(value))}`;
  };

  const formatPrice = (item: any) =>
    money(Number(item?.price), typeof item?.currency === "string" ? item.currency : undefined);

  const total = [top, trou, coat, shoe, bag].reduce(
    (sum, item) => sum + (Number(item?.price) || 0),
    0
  );
  const totalCurrency =
    top?.currency ||
    trou?.currency ||
    coat?.currency ||
    shoe?.currency ||
    bag?.currency ||
    currencyPref;

  const describe = (label: string, item: any) => {
    if (!item) return null;
    const name =
      [item.brand, item.title].filter(Boolean).join(" ").trim() || "Product";
    const details = [formatPrice(item), item?.retailer].filter(Boolean).join(", ");
    const link = item?.link || item?.url;
    return `- ${label} — ${name}${details ? ` (${details})` : ""}${link ? ` · ${link}` : ""}`;
  };

  const concept = `Editorial minimalism with celebrity-level polish — clean lines, elongated silhouette, and a controlled monochrome palette.`;

  const bodyType = (preferences?.bodyType || "your frame")
    .replace(/(^\w|\s\w)/g, (m: string) => m.toUpperCase());

  const bullets: string[] = [];
  bullets.push(`Stylist POV: ${concept}`);
  bullets.push(``);
  bullets.push(`Outfit:`);
  [
    describe("Top", top),
    describe("Trousers", trou),
    describe("Outerwear", coat),
    describe("Shoes", shoe),
    describe("Bag", bag),
    describe("Accessories", acc),
  ]
    .filter(Boolean)
    .forEach((line) => bullets.push(line!));

  bullets.push(``);
  bullets.push(`Why it flatters:`);
  bullets.push(`- ${bodyType}: high-rise trouser lengthens the leg; fitted rib balances the coat; pointed boot extends the line.`);
  bullets.push(`- Fabric mix: wool + polished leather reads formal without glare in flash photos.`);
  bullets.push(``);
  const savings = money(80, totalCurrency);
  bullets.push(`Budget & Total: ~${money(total, totalCurrency)} (swap coat for Arket to save ~${savings || "€80"}).`);
  bullets.push(``);
  bullets.push(`Capsule & Tips:`);
  bullets.push(`- Remix the rib top with denim + the coat; or the trousers with a silk camisole and pumps.`);
  bullets.push(`- Tailor trouser hem to skim boot shaft; a soft brown liner + clear gloss keeps it modern.`);
  bullets.push(``);
  bullets.push(`(You said: “${userText || "Outfit request"}”)`);

  return bullets.join("\n");
}

/** Low-level OpenAI streaming helper (REST + SSE) */
async function* openaiStream(body: any, apiKey: string) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`OpenAI HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    carry += chunk;
    while (true) {
      const idx = carry.indexOf("\n\n");
      if (idx === -1) break;
      const raw = carry.slice(0, idx);
      carry = carry.slice(idx + 2);
      const lines = raw.split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          yield { done: true };
          return;
        }
        try {
          yield JSON.parse(data);
        } catch {
          // ignore keep-alives
        }
      }
    }
  }
}

/** ---------- Route ---------- */

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const { messages = [], preferences } = payload || {};
  const userText = lastUserText(messages);

  const baseMsgs: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    { role: "system", content: prefsToSystem(preferences) },
    ...(Array.isArray(messages) ? messages : []),
  ];

  const tools = (toolSchemas || []).map((fn) => ({
    type: "function",
    function: { name: fn.name, description: fn.description, parameters: fn.schema },
  }));

  const stream = new ReadableStream({
    async start(controller) {
      // initial liveness
      controller.enqueue(sse("ready", { ok: true }));
      const pinger = setInterval(() => controller.enqueue(sse("ping", { t: Date.now() })), 15000);
      const end = (ok = true) => {
        try { controller.enqueue(sse("done", { ok })); } catch {}
        clearInterval(pinger);
        controller.close();
      };

      // 0) **Optimistic draft** — reply instantly using our local generator + tools
      let optimisticText = "";
      try {
        const draft = await optimisticDraft(preferences, userText);
        optimisticText = draft || "";
        for (const chunk of draft.match(/.{1,220}/g) || []) {
          controller.enqueue(sse("assistant_draft_delta", { text: chunk }));
        }
        controller.enqueue(sse("assistant_draft_done", {}));
      } catch {
        // even if this fails, continue to model path
      }

      // 1) **Model path** — try OpenAI; if anything fails, finalize with the optimistic draft already sent
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        // no key → finalize with draft only
        // (The optimistic draft already streamed. We still send a final event to satisfy the UI.)
        controller.enqueue(sse("assistant_final", { text: optimisticText }));
        end(true);
        return;
      }

      const toolCalls: Record<string, { name: string; arguments: string }> = {};
      let accText = "";

      try {
        // 1st hop: stream draft + collect tool calls
        for await (const evt of openaiStream({
          model: "gpt-4o-mini",
          temperature: 0.7,
          stream: true,
          tool_choice: "auto",
          tools,
          messages: baseMsgs,
        }, openaiKey)) {
          const choice = (evt as any).choices?.[0];
          if (!choice) continue;

          const delta = choice.delta || {};

          if (typeof delta.content === "string" && delta.content) {
            accText += delta.content;
            controller.enqueue(sse("assistant_delta", { text: delta.content }));
          }

          const tcs = delta.tool_calls as ToolCallDelta[] | undefined;
          if (tcs?.length) {
            for (const d of tcs) {
              const id = d.id!;
              const name = d.function?.name || toolCalls[id]?.name || "unknown";
              const argsChunk = d.function?.arguments || "";
              toolCalls[id] = {
                name,
                arguments: (toolCalls[id]?.arguments || "") + argsChunk,
              };
            }
          }

          if (choice.finish_reason) break;
        }
      } catch {
        // model failed; finalize with whatever we already drafted
        controller.enqueue(sse("assistant_final", { text: accText || optimisticText || "" }));
        end(false);
        return;
      }

      // tools?
      const entries = Object.entries(toolCalls);
      if (entries.length) {
        const toolMsgs: ChatMessage[] = [];

        for (const [id, { name, arguments: argStr }] of entries) {
          const args = safeJSON(argStr);
          controller.enqueue(sse("tool_call", { id, name, args }));
          try {
            const toolName: ToolName = isToolName(name) ? name : "retailer_search";
            const result = await runTool(toolName, args, { preferences });
            controller.enqueue(sse("tool_result", { id, ok: true, result }));
            toolMsgs.push({ role: "tool", tool_call_id: id, content: JSON.stringify(result) });
          } catch (err: any) {
            controller.enqueue(sse("tool_result", { id, ok: false, error: err?.message || "Tool error" }));
            toolMsgs.push({ role: "tool", tool_call_id: id, content: JSON.stringify({ error: "Tool error" }) });
          }
        }

        // 2nd hop: non-stream final w/ tool results + critique rules
        try {
          const res = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              temperature: 0.4,
              stream: false,
              messages: [
                ...baseMsgs,
                { role: "assistant", content: accText },
                ...toolMsgs,
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
            }),
          });
          const json = await res.json();
          const finalText = json?.choices?.[0]?.message?.content || accText || "";
          controller.enqueue(sse("assistant_final", { text: finalText }));
          end(true);
          return;
        } catch {
          controller.enqueue(sse("assistant_final", { text: accText || optimisticText || "" }));
          end(false);
          return;
        }
      }

      // No tool calls → finalize with streamed model text (or empty if none)
      controller.enqueue(sse("assistant_final", { text: accText || optimisticText || "" }));
      end(true);
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

