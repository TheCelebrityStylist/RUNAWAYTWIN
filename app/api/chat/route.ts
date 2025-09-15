// app/api/chat/route.ts
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas, runTool } from "./tools";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ---------- Types ----------
type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type Msg = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// ---------- Tunables ----------
const MODEL = "gpt-4o-mini";
const TEMPERATURE_MAIN = 0.6;
const TEMPERATURE_VERIFY = 0.3;
const MAX_HOPS = 6;                // number of tool/think loops
const MAX_HISTORY = 14;            // keep recent messages light for latency
const OPENAI_RETRIES = 2;          // extra tries on transient OpenAI errors
const TOOL_TIMEOUT_MS = 14_000;    // per-tool hard guard
const SSE_HEARTBEAT_MS = 20_000;   // keep proxies happy

// ---------- Utils ----------
function safeJSON(s: string) {
  try {
    return JSON.parse(String(s || "{}"));
  } catch {
    return {};
  }
}

// lightweight character clipping to avoid very long payloads
function clipMessages(messages: Msg[], max = MAX_HISTORY) {
  const sys = messages.filter((m) => m.role === "system");
  const nonSys = messages.filter((m) => m.role !== "system");
  const clipped = nonSys.slice(-max);
  // Avoid stacking multi-MB tool payloads: trim tool content if huge
  const softened = clipped.map((m) =>
    (m as any).role === "tool" && typeof m.content === "string" && m.content.length > 8000
      ? { ...m, content: (m.content as string).slice(0, 8000) + "\n…[truncated]" }
      : m
  );
  return [...sys, ...softened];
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetries<T>(fn: () => Promise<T>, tries = OPENAI_RETRIES) {
  let lastErr: any;
  for (let i = 0; i <= tries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const code = e?.status || e?.code || e?.response?.status;
      // only retry on plausible transient errors
      if (i < tries && [408, 409, 429, 500, 502, 503, 504].includes(Number(code) || 0)) {
        await sleep(300 * (i + 1) + Math.floor(Math.random() * 200));
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

function toolTimeout<T>(p: Promise<T>, ms: number) {
  let t: any;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error(`Tool timed out after ${ms}ms`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

function normalizeUserHints(raw: any): string | null {
  // Optional: pull quick preferences if your UI sends them alongside messages
  // Expect shape like { country, top, bottom, shoe, bodyType, budgetTier }
  if (!raw || typeof raw !== "object") return null;
  const bits: string[] = [];
  if (raw.country) bits.push(`region: ${raw.country}`);
  if (raw.top) bits.push(`top: ${raw.top}`);
  if (raw.bottom) bits.push(`bottom: ${raw.bottom}`);
  if (raw.shoe) bits.push(`shoe EU: ${raw.shoe}`);
  if (raw.bodyType) bits.push(`body: ${raw.bodyType}`);
  if (raw.budgetTier) bits.push(`budget: ${raw.budgetTier}`);
  if (!bits.length) return null;
  return `User-Preferences: ${bits.join(" · ")}. Use as soft constraints.`;
}

// ---------- Route ----------
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
  }

  const body = await req.json();
  const userHints = normalizeUserHints(body?.prefs);
  const userLocale = req.headers.get("x-vercel-ip-country") || "EU";

  let messages: Msg[] = [
    {
      role: "system",
      content: [
        STYLIST_SYSTEM_PROMPT,
        "",
        // add small guard + tone inline (keeps your original prompt intact)
        "RULES:",
        "- Be a warm, editor-level celebrity stylist. No generic filler.",
        "- If user asked for working links or real products, prefer tools.",
        "- Keep totals on-budget; recommend 3–6 items max unless asked.",
        "- If a request is unsafe or uncertain, say so briefly and pivot.",
        `- Region hint: ${userLocale}.`,
      ].join("\n"),
    },
  ];

  if (userHints) {
    messages.push({ role: "system", content: userHints });
  }

  const clientMsgs: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
  messages.push(...clientMsgs);

  // Wrap tool schemas for OpenAI
  const tools = toolSchemas.map((fn) => ({ type: "function" as const, function: fn }));

  const encoder = new TextEncoder();
  let heartbeat: any;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown, event = "message") => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`));
      };

      // Heartbeat to keep CDN/proxies from closing SSE
      heartbeat = setInterval(() => send({ t: Date.now() }, "heartbeat"), SSE_HEARTBEAT_MS);
      send({ ok: true, note: "chat-stream-open" }, "open");

      try {
        let usedAnyTool = false;

        // tool loop
        for (let hop = 0; hop < MAX_HOPS; hop++) {
          messages = clipMessages(messages);

          const completion = await withRetries(() =>
            openai.chat.completions.create({
              model: MODEL,
              temperature: TEMPERATURE_MAIN,
              tool_choice: "auto",
              tools,
              response_format: { type: "text" },
              messages,
            })
          );

          const choice = completion.choices?.[0];
          const msg = choice?.message;

          // Stream any assistant draft text (thought/partial answer)
          if (msg?.content?.trim()) {
            send({ type: "assistant-draft", content: msg.content });
          }

          // record assistant step
          messages.push({
            role: "assistant",
            content: msg?.content ?? "",
            tool_calls: (msg?.tool_calls || []) as any,
          });

          const toolCalls = (msg?.tool_calls || []) as ToolCall[];

          // No tool calls → finalize with critique pass
          if (!toolCalls.length) {
            const verify = await withRetries(() =>
              openai.chat.completions.create({
                model: MODEL,
                temperature: TEMPERATURE_VERIFY,
                messages: [
                  ...messages,
                  {
                    role: "system",
                    content:
                      [
                        "VERIFICATION PASS:",
                        "- Remove generic filler; keep it concise, luxe, and actionable.",
                        "- Ensure items form a cohesive outfit and match body/budget/region hints.",
                        "- If real products were fetched via tools, append a 'Sources' list (1–3 clean links).",
                        "- Use short bullets; include total if user asked.",
                      ].join("\n"),
                  },
                ],
              })
            );

            const finalText =
              verify.choices?.[0]?.message?.content?.trim() ||
              msg?.content?.trim() ||
              "I’m here. Tell me your muse + occasion + budget and I’ll style you.";

            send({ type: "final", content: finalText, usedTools: usedAnyTool }, "final");
            break;
          }

          // Execute tool calls (dedupe by name+args to avoid accidental loops)
          const seen = new Set<string>();
          for (const call of toolCalls) {
            const args = safeJSON(call.function.arguments);
            const sig = `${call.function.name}:${JSON.stringify(args)}`;
            if (seen.has(sig)) continue;
            seen.add(sig);

            send({ type: "tool-start", name: call.function.name, args }, "tool-start");

            let result: unknown;
            try {
              usedAnyTool = true;
              result = await toolTimeout(runTool(call.function.name, args), TOOL_TIMEOUT_MS);
            } catch (e: any) {
              result = { error: e?.message || String(e) };
            }

            send({ type: "tool-result", name: call.function.name, result }, "tool-result");

            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            } as OpenAI.Chat.Completions.ChatCompletionToolMessageParam);
          }

          // If this was the last hop, attempt a concise closing answer
          if (hop === MAX_HOPS - 1) {
            const close = await withRetries(() =>
              openai.chat.completions.create({
                model: MODEL,
                temperature: TEMPERATURE_VERIFY,
                messages: [
                  ...messages,
                  {
                    role: "system",
                    content:
                      "MAX_HOPS_REACHED: Summarize the look succinctly with items and links if available.",
                  },
                ],
              })
            );
            const text =
              close.choices?.[0]?.message?.content?.trim() ||
              "Here’s a concise summary of your look based on the latest results.";
            send({ type: "final", content: text, usedTools: usedAnyTool }, "final");
            break;
          }
        }
      } catch (e: any) {
        // graceful error payload
        send(
          {
            type: "error",
            message:
              e?.message ||
              "Something went wrong while styling. Tell me your muse + occasion + budget and I’ll retry.",
          },
          "error"
        );
      } finally {
        clearInterval(heartbeat);
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
