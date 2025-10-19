import { NextRequest } from "next/server";
import { searchProducts as legacySearchProducts, type Product } from "../tools";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { runTool, toolSchemas } from "./tools";
import type { AdapterContext } from "./tools/types";
import { getDemoCatalog } from "./tools/adapters/demo";
import {
  normalizeChatPreferences,
  preferencesToSystem,
  currencyForPreferences,
  summarizePreferencesForBrief,
  preferEU,
  type NormalizedChatPreferences,
} from "@/lib/chat/prefs";
import { resolveModelCandidates, formatModelNotice } from "@/lib/chat/models";
import { buildFallbackCopy } from "@/lib/look/fallbackPlan";

export const runtime = "edge";

type Role = "system" | "user" | "assistant" | "tool";
type ChatMessage = {
  role: Role;
  content?: string | Array<{ type: string; text?: string; image_url?: { url: string } }> | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

type RawMessage = {
  role: Role;
  content: any;
};

type PendingToolCall = {
  id: string;
  name: string;
  arguments: string;
};

const ENCODER = new TextEncoder();

function send(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown
) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data ?? {})}\n\n`;
  controller.enqueue(ENCODER.encode(payload));
}

function contentToText(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (!chunk) return "";
        if (typeof chunk === "string") return chunk;
        if (typeof chunk?.text === "string") return chunk.text;
        if (typeof chunk?.content === "string") return chunk.content;
        if (chunk?.type === "image_url" && typeof chunk?.image_url?.url === "string") {
          return chunk.image_url.url;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  if (typeof content === "object") {
    if (typeof (content as any).text === "string") return (content as any).text;
    if (typeof (content as any).content === "string") return (content as any).content;
  }
  return "";
}

function lastUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      return contentToText(messages[i]?.content);
    }
  }
  return "";
}

function safeHost(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function bulletsFromProducts(products: Product[]): string {
  return products
    .map(
      (p) =>
        `- ${p.brand} — ${p.title} | category=${p.category ?? "unknown"} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? safeHost(p.url)} | ${p.url} | ${p.imageUrl ?? ""}`
    )
    .join("\n");
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(label));
    }, ms);
    promise
      .then((value) => {
        if (timer) clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        if (timer) clearTimeout(timer);
        reject(error);
      });
  });
}

async function loadProducts(
  ask: string,
  prefs: NormalizedChatPreferences,
  currency: string
): Promise<Product[]> {
  const query = [ask, prefs.styleKeywordsText]
    .filter(Boolean)
    .join(" | ")
    .trim() || "elevated minimal look: structured top, wide-leg trousers, trench, leather loafers";
  const country = prefs.country || (preferEU(prefs.country) ? "NL" : "US");

  try {
    const items = await withTimeout(
      legacySearchProducts({
        query,
        country,
        currency,
        limit: 10,
        budget: prefs.budgetValue,
        budgetMax: prefs.budgetValue,
        preferEU: preferEU(prefs.country),
      }),
      12_000,
      "product-search-timeout"
    );
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.warn("[RunwayTwin] product search failed", error);
    return [];
  }
}

const PRODUCT_SOFT_DEADLINE_MS = Number(process.env.PRODUCT_SOFT_DEADLINE_MS ?? "5000");

function demoProductsForCurrency(currency: string): Product[] {
  const normalized = currency.toUpperCase();
  const catalog = getDemoCatalog();
  const matches = catalog.filter((item) => (item.currency ?? "").toUpperCase() === normalized);
  const source = matches.length ? matches : catalog;
  return source.slice(0, 8);
}

async function gatherProducts(
  ask: string,
  prefs: NormalizedChatPreferences,
  currency: string
): Promise<Product[]> {
  const searchPromise = loadProducts(ask, prefs, currency);

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const fallbackPromise = new Promise<Product[]>((resolve) => {
    timeoutHandle = setTimeout(() => {
      resolve(demoProductsForCurrency(currency));
    }, PRODUCT_SOFT_DEADLINE_MS);
  });

  const first = await Promise.race([
    searchPromise.then((items) => (Array.isArray(items) && items.length ? items : [])),
    fallbackPromise,
  ]);

  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }

  if (first.length) {
    return first;
  }

  const final = await searchPromise;
  if (final.length) {
    return final;
  }

  return demoProductsForCurrency(currency);
}

function openAIToolDefinitions() {
  return toolSchemas.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema,
    },
  }));
}

type StreamCallbacks = {
  onTextDelta?: (text: string) => void;
  onToolCall?: (call: PendingToolCall) => void;
};

async function streamChatCompletion(
  messages: ChatMessage[],
  model: string,
  apiKey: string,
  callbacks: StreamCallbacks
): Promise<{ text: string; toolCalls: PendingToolCall[] }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.45,
      messages,
      tools: openAIToolDefinitions(),
      tool_choice: "auto",
    }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI ${response.status}: ${text.slice(0, 160)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const toolCalls: PendingToolCall[] = [];
  const announced = new Set<number>();
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const block = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const lines = block.split(/\n/);
      for (const raw of lines) {
        if (!raw.startsWith("data:")) continue;
        const data = raw.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let json: any;
        try {
          json = JSON.parse(data);
        } catch {
          continue;
        }
        const choices = json?.choices;
        if (!Array.isArray(choices)) continue;
        for (const choice of choices) {
          const delta = choice?.delta;
          if (!delta) continue;
          if (Array.isArray(delta.content)) {
            for (const part of delta.content) {
              const text = part?.text ?? part?.content ?? "";
              if (typeof text === "string" && text) {
                fullText += text;
                callbacks.onTextDelta?.(text);
              }
            }
          }
          if (typeof delta.content === "string") {
            fullText += delta.content;
            callbacks.onTextDelta?.(delta.content);
          }
          if (Array.isArray(delta.tool_calls)) {
            for (const toolCall of delta.tool_calls) {
              const index: number = toolCall?.index ?? 0;
              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: toolCall?.id || `tool_${index}_${Date.now()}`,
                  name: "",
                  arguments: "",
                };
              }
              if (toolCall?.id) toolCalls[index]!.id = toolCall.id;
              const fn = toolCall?.function;
              if (fn?.name) {
                toolCalls[index]!.name = fn.name;
                if (!announced.has(index) && fn.name) {
                  announced.add(index);
                  callbacks.onToolCall?.(toolCalls[index]!);
                }
              }
              if (typeof fn?.arguments === "string" && fn.arguments) {
                toolCalls[index]!.arguments += fn.arguments;
              }
            }
          }
        }
      }
      separator = buffer.indexOf("\n\n");
    }
  }

  return { text: fullText, toolCalls: toolCalls.filter(Boolean) };
}

async function openaiComplete(
  messages: ChatMessage[],
  model: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, temperature: 0.45, messages }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI ${response.status}: ${text.slice(0, 160)}`);
  }

  const json = await response.json().catch(() => ({}));
  const message = json?.choices?.[0]?.message;
  if (typeof message?.content === "string") return message.content;
  if (Array.isArray(message?.content)) {
    return message.content.map((part: any) => part?.text ?? part?.content ?? "").filter(Boolean).join("");
  }
  return "";
}

function compactToolResult(result: any) {
  if (!result) return result;
  if (Array.isArray(result?.items)) {
    return {
      ...result,
      items: result.items.slice(0, 6).map((item: Product) => ({
        brand: item.brand,
        title: item.title,
        price: item.price,
        currency: item.currency,
        retailer: item.retailer,
        url: item.url,
        imageUrl: item.imageUrl,
        source: item.source,
      })),
    };
  }
  return result;
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const rawMessages: RawMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const finalUser = body?.finalUser && typeof body.finalUser === "object" ? (body.finalUser as RawMessage) : null;
  const normalizedPrefs = normalizeChatPreferences(body?.preferences || {});

  const history: ChatMessage[] = rawMessages
    .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant"))
    .map((msg) => ({ role: msg.role, content: msg.content })) as ChatMessage[];

  const personaMessage: ChatMessage = {
    role: "system",
    content:
      `You are "The Ultimate Celebrity Stylist AI": warm, premium, aspirational, cinematic, relentlessly specific. ` +
      `Open with a concierge-calibre greeting and acknowledge the returning client if history exists. ` +
      `Never repeat questions once given. Detect celebrity muse, weather, and occasion cues automatically and adapt the palette, silhouette, and fabrication. ` +
      `Deliver a full outfit (Top, Bottom or Dress, Outerwear, Shoes, Bag, Accessories) with brand / exact item / price+currency / retailer / link / image (if available) and explicit body-type fit reasons. ` +
      `Always include alternates for shoes and outerwear with links; show total and 'Save' options if over budget; add 'Capsule & Tips' (3 remix ideas + 2 short tips). ` +
      `Close with: "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎".`,
  };

  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    personaMessage,
    { role: "system", content: preferencesToSystem(normalizedPrefs) },
    ...history,
  ];

  if (finalUser && finalUser.role === "user") {
    baseMessages.push({ role: "user", content: finalUser.content });
  }

  const ask = lastUserText(baseMessages);
  const currency = currencyForPreferences(normalizedPrefs);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      send(controller, "ready", { ok: true });
      const keepAlive = setInterval(() => send(controller, "ping", { t: Date.now() }), 15_000);

      const productPromise = gatherProducts(ask, normalizedPrefs, currency);
      let resolvedProducts: Product[] = [];

      try {
        const greet = "Hi! I’m your celebrity stylist—assembling a head-to-toe look with linked pieces and fit intel.";
        const briefParts = summarizePreferencesForBrief(normalizedPrefs, ask);
        const brief = briefParts.length
          ? `Brief: ${briefParts.join(" • ")}`
          : "Share body type, occasion, and any muse (e.g., “Zendaya for a gallery opening”).";
        send(controller, "assistant_draft_delta", { text: `${greet}\n` });
        send(controller, "assistant_draft_delta", { text: `${brief}\n\n` });

        resolvedProducts = await productPromise;
        if (resolvedProducts.length) {
          const preview = resolvedProducts
            .slice(0, 3)
            .map((p) => `• ${p.brand} ${p.title} (${p.currency || currency} ${p.price ?? "—"})`)
            .join("\n");
          send(controller, "assistant_draft_delta", { text: `Found options:\n${preview}\n\n` });
        } else {
          send(controller, "assistant_draft_delta", { text: "Still scouting boutiques…\n\n" });
        }
        send(controller, "assistant_draft_done", { ok: true });

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
        const modelCandidates = resolveModelCandidates();

        if (!OPENAI_API_KEY) {
          const fallback = buildFallbackCopy(resolvedProducts, currency, ask, normalizedPrefs);
          send(controller, "assistant_final", { text: fallback });
          send(controller, "done", { ok: false, reason: "missing-openai" });
          return;
        }

        const productBlock = `Candidate Products:\n${bulletsFromProducts(resolvedProducts.slice(0, 10))}`;
        const rules = [
          "Use ONLY the Candidate Products for URLs. Do not invent links.",
          "Return: Top, Bottom (or Dress), Outerwear, Shoes, Accessories, Bag, 2 jewellery accents.",
          "For every item include brand, exact item name, price + currency, retailer, link, and image URL if provided.",
          "Explain why each selection flatters the user's body type with couture-level detail (rise, drape, neckline, hem, fabrication, proportion, styling move).",
          "Respect the budget; compute the total; if over budget provide clearly labelled 'Save' alternates with links.",
          "Always include alternates for shoes and outerwear with links and pricing.",
          "Add 'Capsule & Tips' with 3 remix ideas and 2 micro styling tips tied to the user's profile.",
          "Add a 'How to wear it' micro paragraph summarising the vibe in 2 sentences.",
          "Tone: cinematic, editorial, precise, never generic.",
          "Close with the upsell line verbatim.",
        ].join(" ");

        const adapterContext: AdapterContext = { preferences: normalizedPrefs };

        const firstPassMessages: ChatMessage[] = [
          ...baseMessages,
          { role: "system", content: rules },
          { role: "system", content: productBlock },
        ];

        let activeModel = "";
        let firstPass: { text: string; toolCalls: PendingToolCall[] } | null = null;
        let firstError: unknown = null;
        let nonStreamRecovery: { text: string; model: string } | null = null;

        for (let idx = 0; idx < modelCandidates.length; idx++) {
          const candidate = modelCandidates[idx]!;
          try {
            const streamed = await withTimeout(
              streamChatCompletion(firstPassMessages, candidate, OPENAI_API_KEY, {
                onTextDelta: (text) => {
                  send(controller, "assistant_delta", { text });
                },
                onToolCall: (call) => {
                  send(controller, "tool_call", {
                    id: call.id,
                    name: call.name,
                  });
                },
              }),
              45_000,
              `openai-stream-timeout-${candidate}`
            );
            firstPass = streamed;
            activeModel = candidate;
            break;
          } catch (error) {
            firstError = error;
            console.error(`[RunwayTwin] streaming model ${candidate} failed`, error);
            const nextModel = modelCandidates[idx + 1];
            if (nextModel) {
              send(controller, "notice", {
                text: formatModelNotice(nextModel),
              });
            }
          }
        }

        if (!firstPass) {
          const recoveryModels = [
            ...modelCandidates,
            "gpt-4o-mini",
            "gpt-4o-mini-2024-07-18",
          ].filter((model, index, array) => model && array.indexOf(model) === index);

          for (const candidate of recoveryModels) {
            try {
              const text = await withTimeout(
                openaiComplete(firstPassMessages, candidate, OPENAI_API_KEY),
                35_000,
                `openai-recovery-timeout-${candidate}`
              );
              if (typeof text === "string" && text.trim()) {
                nonStreamRecovery = { text: text.trim(), model: candidate };
                activeModel = candidate;
                break;
              }
            } catch (error) {
              console.error(`[RunwayTwin] recovery model ${candidate} failed`, error);
            }
          }

          if (nonStreamRecovery) {
            send(controller, "assistant_final", { text: nonStreamRecovery.text });
            send(controller, "done", { ok: true, model: nonStreamRecovery.model, via: "non-stream" });
            return;
          }

          throw (firstError as Error) ?? new Error("openai-stream-failed");
        }

        let finalText = firstPass.text.trim();
        const toolCalls = firstPass.toolCalls;
        let followUpMessages: ChatMessage[] | null = null;

        const assistantToolMessage: ChatMessage | null = toolCalls.length
          ? {
              role: "assistant",
              tool_calls: toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: { name: call.name, arguments: call.arguments },
              })),
            }
          : null;

        if (toolCalls.length) {
          const toolResults: ChatMessage[] = [];
          for (const call of toolCalls) {
            try {
              const args = call.arguments ? JSON.parse(call.arguments) : {};
              const result = await runTool(call.name, args, adapterContext);
              const compact = compactToolResult(result);
              send(controller, "tool_result", { id: call.id, name: call.name, ok: true, result: compact });
              toolResults.push({
                role: "tool",
                tool_call_id: call.id,
                name: call.name,
                content: JSON.stringify(compact ?? { ok: false }),
              });
            } catch (error: any) {
              console.error("tool execution failed", error);
              const message = { error: error?.message || "tool error" };
              send(controller, "tool_result", { id: call.id, name: call.name, ok: false, error: message });
              toolResults.push({
                role: "tool",
                tool_call_id: call.id,
                name: call.name,
                content: JSON.stringify(message),
              });
            }
          }

          const secondPassMessages: ChatMessage[] = [
            ...firstPassMessages,
            assistantToolMessage!,
            ...toolResults,
          ];
          followUpMessages = secondPassMessages;

          let refinedText: string | null = null;
          let refineError: unknown = null;
          const secondPassModels = [
            activeModel,
            ...modelCandidates.filter((model) => model !== activeModel),
          ];

          for (let idx = 0; idx < secondPassModels.length; idx++) {
            const candidate = secondPassModels[idx]!;
            try {
              refinedText = await withTimeout(
                openaiComplete(secondPassMessages, candidate, OPENAI_API_KEY),
                20_000,
                `openai-second-pass-timeout-${candidate}`
              );
              activeModel = candidate;
              break;
            } catch (error) {
              refineError = error;
              console.error(`[RunwayTwin] second-pass model ${candidate} failed`, error);
              if (idx < secondPassModels.length - 1) {
                send(controller, "notice", {
                  text: formatModelNotice(secondPassModels[idx + 1]),
                });
              }
            }
          }

          if (typeof refinedText === "string" && refinedText.trim()) {
            finalText = refinedText;
          } else if (refineError) {
            console.error("[RunwayTwin] second pass exhausted", refineError);
          }
        }

        if (!finalText || !finalText.trim()) {
          const refinementMessages = followUpMessages ?? firstPassMessages;
          let refinedText: string | null = null;
          let refineError: unknown = null;
          const refinementModels = [
            activeModel,
            ...modelCandidates.filter((model) => model && model !== activeModel),
          ].filter((model, index, array) => Boolean(model) && array.indexOf(model) === index);

          for (let idx = 0; idx < refinementModels.length; idx++) {
            const candidate = refinementModels[idx]!;
            try {
              refinedText = await withTimeout(
                openaiComplete(refinementMessages, candidate, OPENAI_API_KEY),
                20_000,
                `openai-refine-timeout-${candidate}`
              );
              activeModel = candidate;
              break;
            } catch (error) {
              refineError = error;
              console.error(`[RunwayTwin] refinement model ${candidate} failed`, error);
              if (idx < refinementModels.length - 1) {
                send(controller, "notice", {
                  text: formatModelNotice(refinementModels[idx + 1]),
                });
              }
            }
          }

          if (typeof refinedText === "string" && refinedText.trim()) {
            finalText = refinedText;
          } else {
            if (refineError) {
              console.error("[RunwayTwin] refinement exhausted", refineError);
            }
            finalText = buildFallbackCopy(resolvedProducts, currency, ask, normalizedPrefs);
          }
        }

        send(controller, "assistant_final", { text: finalText });
        send(controller, "done", { ok: true });
      } catch (error) {
        console.error("[RunwayTwin] route fatal", error);
        const safeProducts = resolvedProducts.length ? resolvedProducts : await productPromise.catch(() => []);
        const fallback = buildFallbackCopy(safeProducts, currency, ask, normalizedPrefs);
        send(controller, "notice", {
          text:
            "I refreshed your look with our curated wardrobe while reconnecting to live ateliers—here’s a polished plan you can shop now.",
        });
        send(controller, "assistant_final", { text: fallback });
        send(controller, "done", { ok: false });
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
