// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { searchProducts, fxConvert, Product } from "../tools";          // ← app/api/tools.ts
import { encodeSSE } from "../../lib/sse/reader";                        // ← app/lib/sse/reader.ts  (two levels up)
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";

export const runtime = "edge";

/* ──────────────────────────────────────────────────────────────
   Types kept intentionally light (avoid fragile SDK typings).
   ────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function prefsToSystem(p: Prefs): string {
  const cur = p.currency || (p.country === "US" ? "USD" : "EUR");
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
    `Always propose items that flatter body type (rise, drape, neckline, hem, silhouette, fabrication, proportion). Respect budget.`,
  ].join("\n");
}

function bulletsFromProducts(ps: Product[]) {
  return ps.map(p =>
    `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? new URL(p.url).hostname} | ${p.url} | ${p.imageUrl ?? ""}`
  ).join("\n");
}

function lastUserText(msgs: ChatMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user" && typeof msgs[i].content === "string") return msgs[i].content;
  }
  return "";
}

/* ──────────────────────────────────────────────────────────────
   OpenAI (REST, no SDK) — non-stream compose for FINAL
   ────────────────────────────────────────────────────────────── */
async function openaiComplete(messages: ChatMessage[], model: string, key: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, temperature: 0.5, messages }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  return (j?.choices?.[0]?.message?.content as string) || "";
}

/* ──────────────────────────────────────────────────────────────
   Route: ready → draft → (search) → final → done
   ────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const clientMessages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const preferences: Prefs = (body?.preferences || {}) as Prefs;
  const sysPrefs = prefsToSystem(preferences);
  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    { role: "system", content: sysPrefs },
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

        // 1) ✨ Conversational optimistic draft (fast + human)
        //    This is not model-blocked and ensures the chat always feels alive.
        const userAsk = lastUserText(baseMessages);
        const cur = preferences.currency || (preferences.country === "US" ? "USD" : "EUR");
        const draftLines = [
          `Great brief—give me a sec to hunt down shoppable pieces that fit your ${preferences.bodyType ?? "body"} and budget (${cur}).`,
          `I’ll stream your look with links, then send a polished final with fit notes and capsule tips.`,
          ``,
        ];
        for (const line of draftLines) {
          push({ type: "assistant_draft_delta", data: line + "\n" });
        }

        // 2) 🔎 Product search (SerpAPI → Web → Demo). Always returns something.
        const query = [userAsk, preferences.styleKeywords].filter(Boolean).join(" | ").trim() || "minimal chic gallery opening outfit coat loafers";
        const currency = preferences.currency || (preferences.country === "US" ? "USD" : "EUR");
        const products = await searchProducts({
          query,
          country: preferences.country || "NL",
          currency,
          limit: 8,
          preferEU: (preferences.country || "NL") !== "US",
        });

        // Stream a small preview of found items into the draft (keeps the convo lively)
        const preview = products.slice(0, 3).map(p => `• ${p.brand}: ${p.title}`).join("\n");
        if (preview) push({ type: "assistant_draft_delta", data: `\nFound options:\n${preview}\n\n` });

        push({ type: "assistant_draft_done" });

        // 3) 🧠 Compose FINAL with OpenAI (uses product candidates). Fail-soft if OpenAI down.
        let finalText = "";
        try {
          if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

          const guidance = [
            "You are a celebrity-grade stylist. Use the candidate products below to build a cohesive, shoppable outfit.",
            "Return: top/bottom (or dress), outerwear, shoes, bag, 1–2 accessories.",
            "For EACH item include: Brand + Exact Item, Price + currency, Retailer, Link, and Image (if available).",
            "Explain *why* each flatters the body type (rise, drape, neckline, hem, silhouette, fabrication, proportion).",
            "Respect budget; show total; if over, add 'Save' alternates with links.",
            "Always include alternates for *shoes* and *outerwear* with links.",
            "Add 'Capsule & Tips' (2–3 remix ideas + 2 succinct tips).",
            "Never invent links—only use the provided URLs. If a perfect item is missing, say so and propose the closest in-stock.",
          ].join(" ");

          const productBlock = `Candidate Products:\n${bulletsFromProducts(products)}`;

          const finalizeMessages: ChatMessage[] = [
            ...baseMessages,
            { role: "system", content: guidance },
            { role: "system", content: productBlock },
          ];

          finalText = await openaiComplete(finalizeMessages, MODEL, OPENAI_API_KEY);
        } catch (e: any) {
          // ✅ Guaranteed graceful fallback (still excellent & shoppable)
          console.warn("[RunwayTwin] OpenAI finalize failed:", e?.message);
          const cur = currency;
          const total = products.reduce((sum, p) => sum + (typeof p.price === "number" ? p.price : 0), 0);
          const totalLine = total ? `Total (approx): ${Math.round(total)} ${cur}` : "";

          const lines = [
            "Outfit:",
            ...products.slice(0, 5).map(p => `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? ""} | ${p.url}`),
            "",
            totalLine,
            "",
            "Capsule & Tips:",
            "- Remix the top with tailored trousers and low heels.",
            "- Swap loafers for sleek ankle boots if it’s rainy.",
            "- Tip: steam outerwear for a clean drape; keep hems crisp.",
            "- Tip: balance a fitted top with a straighter leg for an hourglass frame.",
          ].filter(Boolean);
          finalText = lines.join("\n");
        }

        // 4) ✅ Emit FINAL + done
        push({ type: "assistant_final", data: finalText });
        push({ type: "done" });
      } catch (err: any) {
        console.error("[RunwayTwin] route fatal:", err?.message || err);
        // Still close out cleanly with a helpful message
        push({
          type: "assistant_final",
          data:
            "I hit a hiccup preparing your look, but I saved your preferences. Try again and I’ll stream a fresh outfit with live links.",
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
