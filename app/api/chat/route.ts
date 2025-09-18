// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { encodeSSE } from "../../../lib/sse/reader";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { searchProducts, fxConvert, type Product } from "../tools";

export const runtime = "edge";

/* ──────────────────────────────────────────────────────────────
   Types & small helpers
   ────────────────────────────────────────────────────────────── */
type UserMsg = { role: "user" | "assistant"; content: string };
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
const out = (evt: any) => te.encode(encodeSSE(evt));
const safeNum = (n: any) => (typeof n === "number" && isFinite(n) ? n : null);

function userPrefsToSystem(p: Prefs): string {
  const cur = p.currency || (p.country === "US" ? "USD" : "EUR");
  return [
    `User Profile for Styling Decisions`,
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ? `${p.budget} ${cur}` : "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
    `Use these for silhouette, rise, drape, neckline, hem, fabrication, and proportion decisions.`,
  ].join("\n");
}

function bulletProducts(products: Product[]): string {
  // Brand — Title | Price CUR | Retailer | Link | Image
  return products
    .map((p) => {
      const price = p.price != null ? `${p.price}` : "?";
      const cur = p.currency ?? "";
      const retailer = p.retailer ?? new URL(p.url).hostname;
      const img = p.imageUrl ?? "";
      return `- ${p.brand} — ${p.title} | ${price} ${cur} | ${retailer} | ${p.url} | ${img}`;
    })
    .join("\n");
}

async function openAICompose({
  systemPrompt,
  prefsSystem,
  history,
  products,
  model,
  apiKey,
}: {
  systemPrompt: string;
  prefsSystem: string;
  history: UserMsg[];
  products: Product[];
  model: string;
  apiKey: string;
}): Promise<string> {
  const constraints = [
    "You are RunwayTwin, a celebrity-grade stylist. Output a complete, shoppable head-to-toe look.",
    "For EVERY item include: Brand + Exact Item, Price + currency, Retailer, Link, Image (when available).",
    "Explain explicitly WHY each item flatters the body type (rise, drape, neckline, hem, silhouette, fabrication, proportion).",
    "Respect budget; show total; if over, add 'Save' alternates.",
    "Provide alternates for shoes AND outerwear (with links).",
    "Add 'Capsule & Tips' (2–3 remix ideas + 2 tips).",
    "Never invent links. If an exact item is not in stock, present the closest in-stock alternative and say so.",
    "Be concise, editorial, confident.",
  ].join(" ");

  const productContext = `Candidate Products (use when appropriate; include links as provided):\n${bulletProducts(
    products
  )}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "system", content: prefsSystem },
    ...history,
    { role: "system", content: constraints },
    { role: "system", content: productContext },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      messages,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI compose ${res.status}: ${t.slice(0, 500)}`);
  }
  const json = await res.json().catch(() => ({}));
  return (json?.choices?.[0]?.message?.content as string) || "";
}

/* ──────────────────────────────────────────────────────────────
   Route
   ────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const history: UserMsg[] = Array.isArray(payload?.messages) ? payload.messages : [];
  const preferences: Prefs = (payload?.preferences || {}) as Prefs;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (evt: any) => controller.enqueue(out(evt));
      const keepAlive = setInterval(() => send({ type: "ping" }), 15000);

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
      const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

      try {
        send({ type: "ready" });

        // 1) Build a query and do product search (SerpAPI → web → demo).
        const lastUser = [...history].reverse().find((m) => m.role === "user")?.content || "";
        const style = preferences.styleKeywords ? ` | ${preferences.styleKeywords}` : "";
        const query = (lastUser + style).trim() || "women minimal outfit rainy gallery opening";
        const currency = preferences.currency || (preferences.country === "US" ? "USD" : "EUR");

        // (a) tool_call event
        send({
          type: "tool_call",
          data: { id: crypto.randomUUID(), name: "search_products", args: { query, country: preferences.country, currency } },
        });

        let products: Product[] = [];
        try {
          products = await searchProducts({
            query,
            country: preferences.country || "NL",
            currency,
            limit: 8,
            preferEU: (preferences.country || "NL") !== "US",
          });
        } catch (e: any) {
          // fail-soft
          products = [];
          console.warn("[RunwayTwin] searchProducts failed:", e?.message);
        }

        // (b) tool_result event (always ok: true to avoid UI warnings)
        send({
          type: "tool_result",
          data: { tool: "search_products", result: { ok: true, count: products.length } },
        });

        // 2) Stream an optimistic draft immediately so UI never feels stuck.
        const draftLines: string[] = [];
        draftLines.push("Outfit:");
        const hero = products.slice(0, 4);
        if (hero.length) {
          for (const p of hero) {
            draftLines.push(
              `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? new URL(p.url).hostname} | ${p.url}`
            );
          }
          draftLines.push("");
          draftLines.push("Alternates:");
          const alts = products.slice(4, 6);
          for (const a of alts) {
            draftLines.push(`- ${a.brand} — ${a.title} | ${a.price ?? "?"} ${a.currency ?? ""} | ${a.retailer ?? ""} | ${a.url}`);
          }
        } else {
          draftLines.push("- assembling…");
        }
        for (const line of draftLines) {
          send({ type: "assistant_draft_delta", data: line + "\n" });
          // tiny pace to feel alive but not slow
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 6));
        }
        send({ type: "assistant_draft_done" });

        // 3) Compose the final with OpenAI (non-stream for reliability).
        let finalText = "";
        try {
          if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
          finalText = await openAICompose({
            systemPrompt: STYLIST_SYSTEM_PROMPT,
            prefsSystem: userPrefsToSystem(preferences),
            history,
            products,
            model: OPENAI_MODEL,
            apiKey: OPENAI_API_KEY,
          });
        } catch (err: any) {
          console.warn("[RunwayTwin] OpenAI compose failed:", err?.message);

          // Strong fallback: deterministic final using products only
          const lines: string[] = [];
          lines.push("Outfit:");
          const pick = products.slice(0, 5);
          if (pick.length) {
            for (const p of pick) {
              lines.push(
                `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? ""} | ${p.url} | ${p.imageUrl ?? ""}`
              );
            }
            // budget tally if prices exist
            const total = pick
              .map((p) => safeNum(p.price))
              .filter((n): n is number => n != null)
              .reduce((a, b) => a + b, 0);
            if (total) lines.push(`\nTotal (approx): ${total} ${currency}`);
            lines.push("\nCapsule & Tips:");
            lines.push("- Remix the knit/tee with tailored trousers and low heels.");
            lines.push("- Swap loafers for sleek ankle boots on rainy days.");
            lines.push("- Tip: steam to keep drape clean; balanced proportions flatter an hourglass.");
            lines.push("- Tip: mid/high rise + straight leg elongates without clinging.");
          } else {
            lines.push("- (Could not fetch products right now; try again in a moment.)");
          }
          finalText = lines.join("\n");
        }

        if (!finalText || !finalText.trim()) {
          // last resort fallback to the optimistic draft
          finalText = draftLines.join("\n");
        }

        // 4) Emit the final and close the stream.
        send({ type: "assistant_final", data: finalText });
        send({ type: "done" });
      } catch (err: any) {
        console.error("[RunwayTwin] route fatal:", err?.message || err);
        // Always end gracefully with a friendly, usable final
        send({
          type: "assistant_final",
          data:
            "I hit a hiccup preparing your look just now, but I’m ready to try again immediately. You can resend your muse + occasion and I’ll pull fresh shoppable options.",
        });
        send({ type: "done" });
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
