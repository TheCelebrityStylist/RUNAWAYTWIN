import { NextRequest } from "next/server";
import { searchProducts, type Product } from "../tools";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";

export const runtime = "edge";

type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string | any };

type Prefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budget?: number | string;
  country?: string;
  currency?: string;
  styleKeywords?: string;
  heightCm?: number;
  weightKg?: number;
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
        if (typeof chunk?.image_url?.url === "string") return chunk.image_url.url;
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  if (typeof content === "object" && content) {
    if (typeof (content as any).text === "string") return (content as any).text;
    if (typeof (content as any).content === "string") return (content as any).content;
  }
  return "";
}

function lastUserText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      return contentToText(messages[i].content);
    }
  }
  return "";
}

function curFor(preferences: Prefs): string {
  if (preferences.currency) return preferences.currency.toUpperCase();
  const country = (preferences.country || "").toUpperCase();
  if (country === "US") return "USD";
  if (country === "UK" || country === "GB") return "GBP";
  if (country === "CA") return "CAD";
  if (country === "AU") return "AUD";
  if (country === "JP") return "JPY";
  return "EUR";
}

function prefsToSystem(p: Prefs): string {
  const cur = curFor(p);
  return [
    `User Profile`,
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ? `${p.budget} ${cur}` : "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    `Always tailor silhouette (rise, drape, neckline, hem, fabrication, proportion) to flatter body type. Respect budget.`,
  ].join("\n");
}

function safeHost(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function bulletsFromProducts(products: Product[]) {
  return products
    .map(
      (p) =>
        `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? safeHost(p.url)} | ${p.url} | ${p.imageUrl ?? ""}`
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

async function openaiComplete(messages: ChatMessage[], model: string, key: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, temperature: 0.5, messages }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OpenAI ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = await response.json().catch(() => ({}));
  return (json?.choices?.[0]?.message?.content as string) || "";
}

function fallbackCopy(products: Product[], currency: string, ask: string): string {
  if (!products.length) {
    return [
      "I’m scouting more boutiques for you — tap again and I’ll refresh with new finds in moments.",
      ask ? `Brief: “${ask}”` : "",
      "",
      "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lines = products.slice(0, 6).map((p) => {
    const label = [p.brand, p.title].filter(Boolean).join(" ");
    const price = p.price ? `${p.currency ?? currency} ${Math.round(p.price)}` : `${p.currency ?? currency} —`;
    return `- ${label} (${price}, ${p.retailer ?? safeHost(p.url)}) → ${p.url}`;
  });

  return [
    "Outfit scout:",
    ...lines,
    "",
    "Capsule & Tips:",
    "- Rotate the knit with tailored trousers for day-to-night polish.",
    "- Swap in sleek boots on cooler evenings for a statuesque line.",
    "- Tip: keep outerwear steamed so drape stays razor sharp.",
    "- Tip: mirror jewellery tones with hardware on your bag.",
    "",
    "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const rawMessages: any[] = Array.isArray(body?.messages) ? body.messages : [];
  const finalUser = body?.finalUser && typeof body.finalUser === "object" ? body.finalUser : null;
  const preferences: Prefs = (body?.preferences || {}) as Prefs;

  const history: ChatMessage[] = rawMessages
    .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant"))
    .map((msg) => ({ role: msg.role, content: msg.content }));

  const personaMessage: ChatMessage = {
    role: "system",
    content:
      `You are "The Ultimate Celebrity Stylist AI": warm, premium, aspirational, concise. ` +
      `Greet warmly. Never repeat questions once given. Detect celebrity muse and adapt style automatically. ` +
      `Deliver a full outfit (Top, Bottom or Dress, Outerwear, Shoes, Accessories) with brand / exact item / price+currency / retailer / link / image (if available) and explicit body-type fit reasons. ` +
      `Always include alternates for shoes and outerwear with links; show total and 'Save' options if over budget; add 'Capsule & Tips' (2–3 remix ideas + 2 short tips). ` +
      `Close with: "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎".`,
  };

  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    personaMessage,
    { role: "system", content: prefsToSystem(preferences) },
    ...history,
  ];

  if (finalUser && finalUser.role === "user") {
    baseMessages.push(finalUser as ChatMessage);
  }

  const ask = lastUserText(baseMessages);
  const currency = curFor(preferences);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      send(controller, "ready", { ok: true });
      const keepAlive = setInterval(() => send(controller, "ping", { t: Date.now() }), 15_000);

      try {
        const greet = "Hi! I’m your celebrity stylist—pulling a head-to-toe look with links and fit notes.";
        const brief =
          preferences.bodyType || preferences.styleKeywords || ask
            ? `Brief: ${[preferences.bodyType, preferences.styleKeywords, ask]
                .filter(Boolean)
                .join(" • ")}${
                preferences.budget ? ` • budget ~${preferences.budget} ${currency}` : ""
              }`
            : "Tell me body type + occasion + any muse (e.g., “Zendaya for a gallery opening”).";
        send(controller, "assistant_draft_delta", { text: `${greet}\n` });
        send(controller, "assistant_draft_delta", { text: `${brief}\n\n` });

        const query =
          [ask, preferences.styleKeywords].filter(Boolean).join(" | ").trim() ||
          "elevated minimal look: structured top, wide-leg trousers, trench, leather loafers";
        const country = preferences.country || "NL";

        let products: Product[] = [];
        try {
          products = await withTimeout(
            searchProducts({
              query,
              country,
              currency,
              limit: 10,
              budget: typeof preferences.budget === "number" ? preferences.budget : undefined,
              preferEU: country !== "US",
            }),
            16_000,
            "product-search-timeout"
          );
        } catch (error) {
          console.warn("[RunwayTwin] product search failed", error);
        }

        if (!products.length) {
          products = await searchProducts({
            query: "classic trench coat black loafers sleek tote neutral knit",
            country,
            currency,
            limit: 8,
            preferEU: country !== "US",
          }).catch(() => []);
        }

        if (products.length) {
          const preview = products
            .slice(0, 3)
            .map((p) => `• ${p.brand} ${p.title} (${p.currency || currency} ${p.price ?? "—"})`)
            .join("\n");
          send(controller, "assistant_draft_delta", { text: `Found options:\n${preview}\n\n` });
        } else {
          send(controller, "assistant_draft_delta", { text: "Still scouting boutiques…\n\n" });
        }

        send(controller, "assistant_draft_done", { ok: true });

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
        const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

        let finalText = "";
        try {
          if (!OPENAI_API_KEY) {
            throw new Error("Missing OPENAI_API_KEY");
          }

          const rules = [
            "Use ONLY the Candidate Products for URLs. Do not invent links.",
            "Return: Top, Bottom (or Dress), Outerwear, Shoes, Accessories.",
            "Explain why each flatters the user's body type (rise, drape, neckline, hem, silhouette, fabrication, proportion).",
            "Respect budget; show total; add 'Save' alternates if total exceeds budget.",
            "Always include alternates for shoes and outerwear with links.",
            "Add 'Capsule & Tips' (2–3 remix ideas + 2 succinct tips).",
            "Tone: premium, warm, punchy, never repetitive.",
            "Close with the upsell line verbatim.",
          ].join(" ");

          const productBlock = `Candidate Products:\n${bulletsFromProducts(products.slice(0, 10))}`;

          const finalizeMessages: ChatMessage[] = [
            ...baseMessages,
            { role: "system", content: rules },
            { role: "system", content: productBlock },
          ];

          finalText = await withTimeout(
            openaiComplete(finalizeMessages, MODEL, OPENAI_API_KEY),
            20_000,
            "openai-final-timeout"
          );
        } catch (error) {
          console.warn("[RunwayTwin] finalize failed", error);
          finalText = fallbackCopy(products, currency, ask);
        }

        if (!finalText || !finalText.trim()) {
          finalText = fallbackCopy(products, currency, ask);
        }

        send(controller, "assistant_final", { text: finalText });
        send(controller, "done", { ok: true });
      } catch (error) {
        console.error("[RunwayTwin] route fatal", error);
        send(controller, "assistant_final", {
          text:
            "I hit a hiccup preparing your look, but your brief is saved. Try again—I'll stream a fresh outfit with live links immediately.",
        });
        send(controller, "done", { ok: false });
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
    cancel() {
      // no-op
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
