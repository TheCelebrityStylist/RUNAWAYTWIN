// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { searchProducts, fxConvert, Product } from "../tools";   // app/api/tools.ts
import { encodeSSE } from "../../lib/sse/reader";                 // app/lib/sse/reader.ts
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";

export const runtime = "edge";

/* ========================================================================
   Types (SDK-free for Edge)
   ======================================================================== */
type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string };

type Prefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budget?: number;
  country?: string;
  currency?: string;
  styleKeywords?: string;
  heightCm?: number;
  weightKg?: number;
};

const te = new TextEncoder();
const sse = (evt: any) => te.encode(encodeSSE(evt));

/* ========================================================================
   Helpers
   ======================================================================== */
function contentToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return (c as any[])
      .map((p) =>
        typeof p === "string"
          ? p
          : typeof p?.text === "string"
          ? p.text
          : typeof p?.content === "string"
          ? p.content
          : ""
      )
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function lastUserText(msgs: ChatMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") return contentToText(msgs[i].content);
  }
  return "";
}

function curFor(p: Prefs) {
  return p.currency || (p.country === "US" ? "USD" : "EUR");
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

function bulletsFromProducts(ps: Product[]) {
  return ps
    .map((p) => {
      let host = "";
      try { host = new URL(p.url).hostname; } catch {}
      return `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? host} | ${p.url} | ${p.imageUrl ?? ""}`;
    })
    .join("\n");
}

function msTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return new Promise<T>((resolve, reject) => {
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

/* ========================================================================
   OpenAI (REST, non-stream) – for FINAL compose
   ======================================================================== */
async function openaiComplete(messages: ChatMessage[], model: string, key: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json().catch(() => ({}));
  return (j?.choices?.[0]?.message?.content as string) || "";
}

/* ========================================================================
   Route – SSE: ready → (draft streaming) → final → done
   ======================================================================== */
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const clientMessages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const preferences: Prefs = (body?.preferences || {}) as Prefs;

  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    {
      role: "system",
      content:
        `You are "The Ultimate Celebrity Stylist AI" — warm, premium, aspirational, concise, never repetitive. ` +
        `Greet warmly, never re-ask once given. When you have enough info, give a complete outfit with brand/item/price/retailer/link/image and fit notes. ` +
        `Always add alternates for shoes + outerwear, budget total + 'Save' options if needed, plus 'Capsule & Tips'. ` +
        `End with: "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎".`,
    },
    { role: "system", content: prefsToSystem(preferences) },
    ...clientMessages,
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const push = (evt: any) => controller.enqueue(sse(evt));
      const keepAlive = setInterval(() => push({ type: "ping" }), 15000);

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
      const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

      try {
        push({ type: "ready" });

        // 1) Conversational, premium optimistic draft (fast, never waits for APIs)
        const ask = lastUserText(baseMessages);
        const cur = curFor(preferences);
        const greet =
          "Hi! I’m your celebrity stylist. I’m pulling a head-to-toe look right now—links, fit notes, and capsule tricks included.";
        const brief =
          preferences.bodyType || preferences.styleKeywords || ask
            ? `Brief: ${[preferences.bodyType, preferences.styleKeywords, ask].filter(Boolean).join(" • ")}${preferences.budget ? ` • budget ~${preferences.budget} ${cur}` : ""}`
            : "Tell me body type + occasion + any muse (e.g., “Zendaya for a gallery opening”).";
        push({ type: "assistant_draft_delta", data: `${greet}\n` });
        push({ type: "assistant_draft_delta", data: `${brief}\n\n` });

        // 2) Product search (SerpAPI → Web → Demo). Fail-soft; always returns something.
        const query =
          [ask, preferences.styleKeywords].filter(Boolean).join(" | ").trim() ||
          "elevated minimal look with structured top, wide-leg trousers, trench, leather loafers";
        const currency = cur;

        let products: Product[] = [];
        try {
          products = await msTimeout(
            searchProducts({
              query,
              country: preferences.country || "NL",
              currency,
              limit: 8,
              preferEU: (preferences.country || "NL") !== "US",
            }),
            16000,
            "product-search"
          );
        } catch (e: any) {
          console.warn("[RunwayTwin] product search failed:", e?.message || e);
          products = [];
        }

        if (!products.length) {
          // tiny safety net — guarantee something renderable
          products = await searchProducts({
            query: "classic trench coat black loafers minimal tote",
            country: preferences.country || "NL",
            currency,
            limit: 6,
            preferEU: (preferences.country || "NL") !== "US",
          }).catch(() => []) || [];
        }

        if (products.length) {
          const preview = products.slice(0, 3).map((p) => `• ${p.brand}: ${p.title}`).join("\n");
          push({ type: "assistant_draft_delta", data: `Found options:\n${preview}\n\n` });
        }

        push({ type: "assistant_draft_done" });

        // 3) Compose FINAL via OpenAI. Fail-soft to a deterministic, shoppable fallback.
        let finalText = "";
        try {
          if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

          const rules = [
            "Use the candidate products below ONLY for links. Never invent URLs.",
            "Return: Top, Bottom (or Dress), Outerwear, Shoes, Accessories.",
            "Explain exactly why each flatters the body type (rise, drape, neckline, hem, silhouette, fabrication, proportion).",
            "Respect budget; show total; add 'Save' alternates if total exceeds budget.",
            "Include alternates for shoes and outerwear with links.",
            "Add 'Capsule & Tips' (2–3 remix ideas + 2 succinct tips).",
            "Tone: premium, warm, punchy, never repetitive.",
            "Close with the upsell line.",
          ].join(" ");

          const productBlock = `Candidate Products:\n${bulletsFromProducts(products.slice(0, 10))}`;

          const finalizeMessages: ChatMessage[] = [
            ...baseMessages,
            { role: "system", content: rules },
            { role: "system", content: productBlock },
          ];

          // OpenAI call with a firm but reasonable timeout
          finalText = await msTimeout(
            openaiComplete(finalizeMessages, MODEL, OPENAI_API_KEY),
            20000,
            "openai-final"
          );
        } catch (e: any) {
          console.warn("[RunwayTwin] finalize failed:", e?.message || e);
          // Fallback: still great + shoppable (never leaves user empty-handed)
          const tot = products.reduce(
            (sum, p) => sum + (typeof p.price === "number" ? p.price : 0),
            0
          );
          const approx = tot ? `Approx total: ~${Math.round(tot)} ${currency}` : "";
          const lines = [
            "Outfit:",
            ...products.slice(0, 5).map(
              (p) =>
                `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${
                  p.retailer ?? ((): string => { try { return new URL(p.url).hostname; } catch { return ""; } })()
                } | ${p.url}`
            ),
            "",
            approx,
            "",
            "Capsule & Tips:",
            "- Pair the top with tailored trousers and sleek loafers for weekday polish.",
            "- Swap loafers for ankle boots if you want more edge or rain protection.",
            "- Tip: steam outerwear for a clean drape and elongating lines.",
            "- Tip: for pear shapes, balance shoulder structure with a flowing bottom.",
            "",
            "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
          ].filter(Boolean);
          finalText = lines.join("\n");
        }

        // 4) Final → done
        push({ type: "assistant_final", data: finalText });
        push({ type: "done" });
      } catch (err: any) {
        console.error("[RunwayTwin] route fatal:", err?.message || err);
        push({
          type: "assistant_final",
          data:
            "I hit a hiccup preparing your look, but your brief is saved. Try again—I'll stream a fresh outfit with live links immediately.",
        });
        push({ type: "done" });
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
