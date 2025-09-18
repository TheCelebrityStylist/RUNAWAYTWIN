// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { searchProducts, fxConvert, Product } from "../tools";
import { encodeSSE } from "../../../lib/sse/reader";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";

export const runtime = "edge";

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
};

const te = new TextEncoder();
const send = (evt: any) => te.encode(encodeSSE(evt));

function prefsToSystem(p: Prefs) {
  const cur = p.currency || (p.country === "US" ? "USD" : "EUR");
  return [
    `User Profile`,
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Budget: ${p.budget ? `${p.budget} ${cur}` : "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    `Honor budget and body-type fit (rise, drape, neckline, hem, silhouette, fabrication, proportion).`,
  ].join("\n");
}

function asBullets(products: Product[]) {
  return products.map(p =>
    `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? (new URL(p.url).hostname)} | ${p.url} | ${p.imageUrl ?? ""}`
  ).join("\n");
}

async function openaiComplete(messages: any[], model: string, apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, temperature: 0.6, messages }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status} ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  let body: any = {}; try { body = await req.json(); } catch {}
  const messages: { role: "user" | "assistant"; content: string }[] = Array.isArray(body?.messages) ? body.messages : [];
  const preferences: Prefs = (body?.preferences || {}) as Prefs;

  const stream = new ReadableStream({
    async start(controller) {
      const push = (evt: any) => controller.enqueue(send(evt));
      const keepAlive = setInterval(() => push({ type: "ping" }), 15000);

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
      const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

      try {
        push({ type: "ready" });

        // 1) Optimistic draft (instant)
        const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";
        const q = [lastUser, preferences.styleKeywords].filter(Boolean).join(" | ");
        let draft = `Outfit:\n(searching…)\n`;
        push({ type: "assistant_draft_delta", data: draft });
        push({ type: "assistant_draft_done" });

        // 2) Product search (SerpAPI → web → demo)
        const currency = preferences.currency || (preferences.country === "US" ? "USD" : "EUR");
        const products = await searchProducts({
          query: q || "women trench coat minimal black loafers",
          country: preferences.country || "NL",
          currency,
          limit: 6,
          preferEU: (preferences.country || "NL") !== "US",
        });

        // 3) Compose with OpenAI (non-stream, reliable)
        let finalText = "";
        try {
          if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
          const sys = prefsToSystem(preferences);
          const toolNote = [
            "You have candidate shoppable products below (brand, item, price, currency, retailer, link, image).",
            "Pick a coherent head-to-toe look: top/bottom (or dress), outerwear, shoes, bag, 1–2 accessories.",
            "For each item include: Brand + Exact Item, Price + currency, Retailer, Link, Image (if available).",
            "Explain body-type flattering reasons (rise, drape, neckline, hem, silhouette, fabrication, proportion).",
            "Respect budget; show total; if over budget, add 'Save' alternates.",
            "Include alternates for shoes + outerwear with links.",
            "Add 'Capsule & Tips' (2–3 remix ideas + 2 tips).",
            "Never invent links.",
          ].join(" ");
          const productBlock = `Candidate Products:\n${asBullets(products)}`;

          const convo = [
            { role: "system", content: STYLIST_SYSTEM_PROMPT },
            { role: "system", content: sys },
            ...(messages as any[]),
            { role: "system", content: toolNote },
            { role: "system", content: productBlock },
          ];

          finalText = await openaiComplete(convo, MODEL, OPENAI_API_KEY);
        } catch (e: any) {
          console.warn("[RunwayTwin] OpenAI compose failed:", e?.message);
          // Fallback: generate a plain list from products if OpenAI is down
          const lines = [
            "Outfit:",
            ...products.slice(0, 5).map(p => `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? ""} | ${p.url}`),
            "",
            "Capsule & Tips:",
            "- Remix the top with tailored trousers and low heels.",
            "- Swap the loafers for sleek ankle boots on rainy days.",
            "- Tip: keep hems clean; steamed drape elongates.",
            "- Tip: balance fitted top with straighter bottom for hourglass.",
          ];
          finalText = lines.join("\n");
        }

        // 4) Emit final
        push({ type: "assistant_final", data: finalText });
        push({ type: "done" });
      } catch (err: any) {
        console.error("[RunwayTwin] route fatal:", err?.message || err);
        push({ type: "assistant_final", data: "I hit a hiccup preparing your look, but I'm ready to try again immediately." });
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
