// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { searchProducts, fxConvert, Product } from "../tools";     // <- app/api/tools.ts (SerpAPI → Web → Demo)
import { encodeSSE } from "../../lib/sse/reader";                   // <- app/lib/sse/reader.ts
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";

export const runtime = "edge";

/* ──────────────────────────────────────────────────────────────
   Types (SDK-free for Edge)
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
    `Always tailor silhouette (rise, drape, neckline, hem, fabrication, proportion) to flatter body type. Respect budget.`,
  ].join("\n");
}

function bulletsFromProducts(ps: Product[]) {
  return ps
    .map(
      (p) =>
        `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${
          p.retailer ?? new URL(p.url).hostname
        } | ${p.url} | ${p.imageUrl ?? ""}`
    )
    .join("\n");
}

const BODY_TYPE_KEYWORDS: Record<string, string[]> = {
  Pear: ["pear", "triangle", "bottom-heavy", "curvy hips"],
  Apple: ["apple", "round", "midsection", "apple-shaped"],
  Hourglass: ["hourglass", "balanced", "defined waist", "curvy"],
  Rectangle: ["rectangle", "straight", "athletic", "column"],
  "Inverted Triangle": ["inverted triangle", "broad shoulders", "athletic shoulders"],
};

const OCCASION_KEYWORDS: { label: string; hints: string[] }[] = [
  { label: "everyday", hints: ["everyday", "daily", "errand"] },
  { label: "work", hints: ["work", "office", "boardroom", "meeting", "presentation"] },
  { label: "evening", hints: ["evening", "night", "cocktail"] },
  { label: "date night", hints: ["date", "dinner", "romantic"] },
  { label: "gala", hints: ["gala", "red carpet"] },
  { label: "party", hints: ["party", "celebration", "birthday"] },
  { label: "wedding", hints: ["wedding", "ceremony"] },
  { label: "travel", hints: ["travel", "vacation", "resort", "holiday"] },
  { label: "weekend casual", hints: ["casual", "brunch", "weekend", "street"] },
  { label: "event", hints: ["event", "opening", "show", "launch"] },
];

const CELEBRITY_HINTS = [
  "Zendaya",
  "Jennifer Lawrence",
  "Blake Lively",
  "Hailey Bieber",
  "Timothée Chalamet",
  "Taylor Russell",
  "Rihanna",
  "Beyoncé",
  "Rosie Huntington-Whiteley",
  "Rosie HW",
  "Kendall Jenner",
  "Bella Hadid",
  "Anya Taylor-Joy",
  "Florence Pugh",
];

function toTitleCase(input: string) {
  return input
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function detectBodyType(text: string, fallback?: string | null): string | null {
  if (fallback) return toTitleCase(fallback.trim());
  const explicit = text.match(/body\s*(?:type|shape)\s*[:\-]\s*([a-z\s]+)/i);
  if (explicit) return toTitleCase(explicit[1].trim());

  const lower = text.toLowerCase();
  for (const [label, keywords] of Object.entries(BODY_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return label;
  }
  return null;
}

function detectOccasion(text: string): string | null {
  const explicit = text.match(/occasion\s*[:\-]\s*([^\n.,]+)/i);
  if (explicit) return explicit[1].trim();

  const forMatch = text.match(/\bfor (?:an?|the)?\s+([^\n.,]+)/i);
  if (forMatch) {
    const candidate = forMatch[1].trim();
    if (candidate && candidate.length > 3 && !/^me$/i.test(candidate)) {
      return candidate;
    }
  }

  const lower = text.toLowerCase();
  for (const entry of OCCASION_KEYWORDS) {
    if (entry.hints.some((hint) => lower.includes(hint))) return entry.label;
  }
  return null;
}

function detectMuse(text: string): string | null {
  const direct = text.match(
    /(?:dress|style|look)\s+(?:me\s+)?(?:like|as)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i
  );
  if (direct) return direct[1].trim();

  for (const name of CELEBRITY_HINTS) {
    if (text.toLowerCase().includes(name.toLowerCase())) return name;
  }
  return null;
}

function buildIntakeSummary({
  bodyType,
  occasion,
  muse,
  styleKeywords,
  budget,
  currency,
  hasBodyType,
  hasOccasion,
}: {
  bodyType: string | null;
  occasion: string | null;
  muse: string | null;
  styleKeywords?: string | null;
  budget?: number | null;
  currency: string;
  hasBodyType: boolean;
  hasOccasion: boolean;
}) {
  const missing: string[] = [];
  if (!hasBodyType) missing.push("body type");
  if (!hasOccasion) missing.push("occasion");

  const lines = [
    "Intake Snapshot:",
    `- Body type: ${bodyType ?? "unknown"}`,
    `- Occasion: ${occasion ?? "unknown"}`,
    `- Celebrity muse: ${muse ?? "unspecified"}`,
    `- Style keywords: ${styleKeywords?.trim() || "n/a"}`,
    `- Budget: ${budget ? `${budget} ${currency}` : "not stated"}`,
  ];

  if (missing.length) {
    lines.push(
      `Guidance: Stay conversational, acknowledge what you know, and ask gracefully for the missing ${missing.join(
        " & "
      )}. Do not output the structured template yet.`
    );
  } else {
    lines.push(
      "Guidance: You have everything needed. Deliver the full structured plan. Lead with 1–2 luxe sentences nodding to the muse, occasion, and body type before the 'Outfit:' heading."
    );
  }

  lines.push("If this summary conflicts with the conversation, defer to the conversation context.");

  return lines.join("\n");
}

function describeBodyTypeBenefit(bodyType: string | null) {
  const lower = (bodyType || "").toLowerCase();
  if (lower.includes("pear")) return "balances proportion by highlighting shoulders and elongating the leg line.";
  if (lower.includes("apple")) return "cinches the waist and adds structure away from the midsection.";
  if (lower.includes("rectangle")) return "builds soft curves while keeping the silhouette sleek.";
  if (lower.includes("inverted")) return "softens the shoulder line and adds flow through the lower half.";
  if (lower.includes("hourglass")) return "honours your natural waist and fluid curves.";
  return "flatters your proportions with intentional tailoring.";
}

function pickProduct(
  products: Product[],
  keywords: string[]
): Product | undefined {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  return products.find((p) => {
    const hay = `${p.title} ${p.brand}`.toLowerCase();
    return lowerKeywords.some((kw) => hay.includes(kw));
  });
}

async function openaiComplete(
  messages: ChatMessage[],
  model: string,
  key: string
): Promise<string> {
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

/* ──────────────────────────────────────────────────────────────
   Route — SSE: ready → draft → final → done (no tool bubbles)
   ────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const clientMessages: ChatMessage[] = Array.isArray(body?.messages)
    ? body.messages
    : [];
  const preferences: Prefs = (body?.preferences || {}) as Prefs;

  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
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

        // 1) ✨ Conversational optimistic draft (never blocks on APIs)
        const ask = lastUserText(baseMessages);
        const cur = preferences.currency || (preferences.country === "US" ? "USD" : "EUR");
        const transcript = clientMessages
          .map((m) => contentToText(m.content))
          .filter(Boolean)
          .join(" \n");
        const bodyType = detectBodyType(`${transcript}\n${ask}`, preferences.bodyType);
        const occasion = detectOccasion(`${ask}\n${transcript}`);
        const muse = detectMuse(`${ask}\n${transcript}`);
        const hasBodyType = Boolean(bodyType);
        const hasOccasion = Boolean(occasion);
        const missingParts: string[] = [];
        if (!hasBodyType) missingParts.push("body type");
        if (!hasOccasion) missingParts.push("occasion");

        const warmGreeting = muse
          ? `Hello love — channeling ${muse} energy for you.`
          : "Hello love — your ultimate celebrity stylist is on it.";
        const infoLine = hasBodyType && hasOccasion
          ? `Tailoring a ${occasion} look${bodyType ? ` for your ${bodyType.toLowerCase()} shape` : ""}${
              preferences.budget ? ` around ${preferences.budget} ${cur}` : ""
            }${preferences.styleKeywords ? `, vibe: ${preferences.styleKeywords}` : ""}.`
          : missingParts.length
          ? `I just need your ${missingParts.join(" & ")} so I can sculpt the exact look${
              muse ? ` in ${muse}'s signature style` : ""
            }.`
          : "Share any extra direction and I’ll tailor the look instantly.";

        const intakeSummary = buildIntakeSummary({
          bodyType,
          occasion,
          muse,
          styleKeywords: preferences.styleKeywords,
          budget: preferences.budget ?? null,
          currency: cur,
          hasBodyType,
          hasOccasion,
        });

        push({ type: "assistant_draft_delta", data: `${warmGreeting}\n` });
        push({ type: "assistant_draft_delta", data: `${infoLine}\n\n` });

        // 2) 🔎 Product search (SerpAPI → Web → Demo). Always returns something.
        const query =
          [
            ask,
            muse ? `${muse} style ${occasion ?? ""}`.trim() : "",
            bodyType ? `${bodyType} body type styling` : "",
            preferences.styleKeywords || "",
            preferences.gender ? `${preferences.gender} ${occasion ?? "look"}`.trim() : "",
            preferences.budget ? `under ${preferences.budget} ${cur}` : "",
          ]
            .filter(Boolean)
            .join(" | ")
            .trim() ||
          "elevated minimal look: structured top, wide-leg trouser, trench, leather loafer";
        const currency =
          preferences.currency || (preferences.country === "US" ? "USD" : "EUR");

        const products = await searchProducts({
          query,
          country: preferences.country || "NL",
          currency,
          limit: 8,
          preferEU: (preferences.country || "NL") !== "US",
        });

        // Tiny preview into the draft so the UI feels alive
        if (products.length) {
          const prev = products
            .slice(0, 3)
            .map((p) => `• ${p.brand}: ${p.title}`)
            .join("\n");
          push({
            type: "assistant_draft_delta",
            data: `Found shoppable options:\n${prev}\n\n`,
          });
        }

        push({ type: "assistant_draft_done" });

        // 3) 🧠 Compose FINAL with OpenAI (uses candidate products). Fail-soft if OpenAI is down.
        let finalText = "";
        try {
          if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

          const rules = [
            "You are The Ultimate Celebrity Stylist AI: warm, premium, aspirational, and never repetitive.",
            "Follow the intake snapshot provided. If it's time for the full plan, begin with 1–2 luxe sentences that nod to the muse, occasion, weather if stated, and body type before the 'Outfit:' heading.",
            "Return a complete outfit: Top, Bottom (or Dress), Outerwear, Shoes, Accessories.",
            "Each outfit line must read '<Category>: <Brand> — <Exact Item> | <Price> <Currency> | <Retailer> | <URL> | <ImageURL or N/A>' and use real Candidate Products.",
            "If any required link or image is missing from candidates, say so and mark it as N/A rather than inventing details.",
            "Explain why the look flatters the body type with fabric, rise, drape, tailoring, and proportions, weaving in the celebrity muse's signature vibe.",
            "Respect the stated budget. Show the total; when over budget, add Save Picks with real links and sharper price points.",
            "Always include Alternates for shoes AND outerwear with links, even if they echo items from the outfit.",
            "Capsule & Tips must feature three remix bullets and two styling tips tied to the look.",
            "Respond to follow-up tweaks conversationally while keeping the structure. Reference previous recommendations when swapping pieces.",
            "Close every full response with: 'Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎'.",
          ].join(" ");

          // Avoid exploding tokens by limiting to first 10 candidates
          const productBlock = `Candidate Products (use real links below):\n${bulletsFromProducts(
            products.slice(0, 10)
          )}`;

          const finalizeMessages: ChatMessage[] = [
            ...baseMessages,
            { role: "system", content: intakeSummary },
            { role: "system", content: rules },
            { role: "system", content: productBlock },
          ];

          finalText = await openaiComplete(finalizeMessages, MODEL, OPENAI_API_KEY);
        } catch (e: any) {
          // 🔁 Fallback: deterministic, still useful + shoppable
          const tot = products.reduce(
            (sum, p) => sum + (typeof p.price === "number" ? p.price : 0),
            0
          );
          const approxTotal = tot > 0 ? Math.round(tot) : null;
          const greetingLine = muse
            ? `Hello love — here’s an instant ${occasion ?? ""} lineup inspired by ${muse}.`.trim()
            : "Hello love — here’s an instant lineup while I refresh the full catalog.";

          if (!hasBodyType || !hasOccasion) {
            const needed = missingParts.join(" & ");
            finalText = [
              greetingLine,
              needed
                ? `Share your ${needed} and I’ll deliver a head-to-toe look with links the moment it lands.`
                : "Give me a touch more context and I’ll dress you to perfection.",
              "",
              "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
            ]
              .filter(Boolean)
              .join("\n");
          } else {
            const primary = products.slice(0, 5);
            const shoesAlt =
              pickProduct(products, ["boot", "heel", "sandal", "flat", "sneaker", "loafer", "pump"]) || products[3];
            const outerAlt =
              pickProduct(products, ["coat", "jacket", "trench", "blazer", "outerwear"]) || products[4];

            const benefit = describeBodyTypeBenefit(bodyType);
            const lines = [
              greetingLine,
              "",
              "Outfit:",
              ...primary.map(
                (p, idx) =>
                  `- Item ${idx + 1}: ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${
                    p.retailer ?? ""
                  } | ${p.url} | ${p.imageUrl ?? ""}`
              ),
              "",
              "Alternates:",
              shoesAlt
                ? `- Shoes: ${shoesAlt.brand} — ${shoesAlt.title} | ${shoesAlt.price ?? "?"} ${
                    shoesAlt.currency ?? ""
                  } | ${shoesAlt.retailer ?? ""} | ${shoesAlt.url}`
                : "- Shoes: N/A",
              outerAlt
                ? `- Outerwear: ${outerAlt.brand} — ${outerAlt.title} | ${outerAlt.price ?? "?"} ${
                    outerAlt.currency ?? ""
                  } | ${outerAlt.retailer ?? ""} | ${outerAlt.url}`
                : "- Outerwear: N/A",
              "",
              "Why it Flatters:",
              `- Each piece ${benefit}`,
              "- Proportions keep the look polished and occasion-appropriate.",
              "",
              "Budget:",
              `- Total: ${
                approxTotal ? `${approxTotal} ${currency}` : "TBC"
              } (Budget: ${preferences.budget ? `${preferences.budget} ${currency}` : "—"})`,
              "",
              "Capsule & Tips:",
              "- Remix: Pair the top with sharp tailoring for weekday polish.",
              "- Remix: Swap in denim and loafers for relaxed days.",
              "- Remix: Layer with a knit over the shoulders for travel ease.",
              "- Tip: Steam hems and sleeves for a crisp line.",
              `- Tip: ${benefit}`,
              "",
              "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
            ].filter(Boolean);
            finalText = lines.join("\n");
          }
        }

        // 4) ✅ Final answer + done
        push({ type: "assistant_final", data: finalText });
        push({ type: "done" });
      } catch (err: any) {
        console.error("[RunwayTwin] route fatal:", err?.message || err);
        push({
          type: "assistant_final",
          data:
            "I hit a hiccup preparing your look, but your brief is saved. Try again—I'll stream live options with links immediately.",
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
