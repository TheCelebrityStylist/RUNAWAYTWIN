// FILE: app/api/chat/route.ts
export const runtime = "edge";

import OpenAI from "openai";
import { NextRequest } from "next/server";

/**
 * This route returns a clean, formatted stylist reply.
 * - Uses Tavily to fetch candidate product links (optional).
 * - Asks the model for a STRICT JSON plan choosing ONLY from those links.
 * - Renders markdown with working links, clear sections, and fit notes.
 */

type Role = "system" | "user" | "assistant";

type ChatMessage = {
  role: Role;
  content: string | unknown[];
};

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

type Cand = { title: string; url: string };

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const HAS_KEY = Boolean(process.env.OPENAI_API_KEY);
const ALLOW_WEB = (process.env.ALLOW_WEB || "true").toLowerCase() !== "false";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ------------------------- helpers -------------------------- */
function contentToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return (c as unknown[])
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object") {
          const obj = p as Record<string, unknown>;
          const v =
            (obj.text as string | undefined) ??
            (obj.content as string | undefined) ??
            (obj.value as string | undefined);
          return typeof v === "string" ? v : "";
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

function lastUserText(msgs: ChatMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === "user") return contentToText(msgs[i].content);
  }
  return "";
}

function currencyFor(p: Prefs) {
  if (p.currency) return p.currency;
  if ((p.country || "").toUpperCase() === "US") return "USD";
  return "EUR";
}

function prefsBlock(p: Prefs) {
  const cur = currencyFor(p);
  return [
    `User Profile`,
    `- Gender: ${p.gender ?? "-"}`,
    `- Sizes: top=${p.sizeTop ?? "-"}, bottom=${p.sizeBottom ?? "-"}, dress=${p.sizeDress ?? "-"}, shoe=${p.sizeShoe ?? "-"}`,
    `- Body Type: ${p.bodyType ?? "-"}`,
    `- Height/Weight: ${p.heightCm ?? "-"}cm / ${p.weightKg ?? "-"}kg`,
    `- Budget: ${p.budget ?? "-"}`,
    `- Country: ${p.country ?? "-"}`,
    `- Currency: ${cur}`,
    `- Style Keywords: ${p.styleKeywords ?? "-"}`,
  ].join("\n");
}

function sanitizeMarkdown(txt: string) {
  return txt.replace(/\n{3,}/g, "\n\n").trim();
}

function retailerFromUrl(u: string) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* ---------------- Tavily candidates (optional) ---------------- */
async function webSearchProducts(query: string): Promise<Cand[]> {
  if (!ALLOW_WEB || !process.env.TAVILY_API_KEY) return [];

  const booster =
    " site:(zara.com OR mango.com OR hm.com OR net-a-porter.com OR matchesfashion.com OR farfetch.com OR uniqlo.com OR cos.com OR arket.com OR massimodutti.com OR levi.com)";
  const q = `${query}${booster}`;

  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: q,
      search_depth: "basic",
      max_results: 12,
      include_answer: false,
      include_raw_content: false,
    }),
  }).catch(() => null);

  if (!resp || !resp.ok) return [];

  const data = (await resp.json().catch(() => ({}))) as {
    results?: Array<{ title?: unknown; url?: unknown }>;
  };

  const raw: Array<{ title?: unknown; url?: unknown }> = Array.isArray(data.results)
    ? data.results
    : [];

  return raw
    .map((r) => ({
      title: typeof r?.title === "string" ? r.title : "",
      url: typeof r?.url === "string" ? r.url : "",
    }))
    .filter((x) => x.title && x.url)
    .slice(0, 12);
}

function candidatesBlock(cands: Cand[]) {
  if (!cands.length) return "CANDIDATE_LINKS: []";
  const lines = cands.map((c, i) => `{"i":${i},"title":${JSON.stringify(c.title)},"url":${JSON.stringify(c.url)}}`);
  return `CANDIDATE_LINKS: [${lines.join(",")}]`;
}

/* ---------------- JSON schema & rendering ---------------- */
type PlanItem = {
  category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory";
  title: string;
  linkIndex: number | null; // index in candidates
  notes?: string;
  priceGuess?: string; // do NOT invent exact prices; allow "?" or range text
};

type Plan = {
  summary: string;
  look: PlanItem[];
  alternates?: PlanItem[];
  fitNotes: string[];
  capsuleTips: string[];
  budgetNote?: string;
};

function renderPlan(plan: Plan, cands: Cand[], prefs: Prefs, userText: string) {
  const cur = currencyFor(prefs);

  const line = (it: PlanItem) => {
    const idx = it.linkIndex ?? -1;
    const c = idx >= 0 && idx < cands.length ? cands[idx] : null;
    const url = c?.url ?? "";
    const host = url ? retailerFromUrl(url) : "";
    const price = it.priceGuess ?? `? ${cur}`;
    const title = it.title || (c?.title ?? "Item");
    const link = url ? `[${host}](${url})` : "(no link)";
    return `- **${it.category}**: ${title} — *${price}* ${link}${it.notes ? `\n  - _${it.notes}_` : ""}`;
  };

  const lines: string[] = [];
  lines.push(`**Outfit for:** ${userText}`);
  lines.push("");
  lines.push(plan.summary);
  lines.push("");
  lines.push("### Outfit");
  for (const it of plan.look) lines.push(line(it));
  if (plan.alternates && plan.alternates.length) {
    lines.push("");
    lines.push("**Alternates**");
    for (const it of plan.alternates) lines.push(line(it));
  }
  if (plan.fitNotes?.length) {
    lines.push("");
    lines.push("### Why it flatters");
    for (const n of plan.fitNotes) lines.push(`- ${n}`);
  }
  if (plan.capsuleTips?.length) {
    lines.push("");
    lines.push("### Capsule & styling tips");
    for (const n of plan.capsuleTips) lines.push(`- ${n}`);
  }
  if (plan.budgetNote) {
    lines.push("");
    lines.push(`**Budget:** ${plan.budgetNote} (currency: ${cur})`);
  }

  return sanitizeMarkdown(lines.join("\n"));
}

/* ---------------- route ---------------- */
export async function POST(req: NextRequest) {
  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });

  try {
    if (!(req.headers.get("content-type") || "").includes("application/json")) {
      return new Response("Expected application/json body.", { status: 415, headers });
    }

    const body = (await req.json().catch(() => ({}))) as {
      messages?: ChatMessage[];
      preferences?: Prefs;
    };

    const history: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const preferences: Prefs = (body?.preferences || {}) as Prefs;

    const userText = lastUserText(history);
    if (!userText) {
      return new Response(
        "Tell me your occasion, body type, budget, and any celebrity muse. I’ll style a full look.",
        { status: 400, headers }
      );
    }

    // 1) Fetch candidate product links (optional)
    let cands: Cand[] = [];
    if (ALLOW_WEB && process.env.TAVILY_API_KEY) {
      const q = [
        userText,
        preferences.styleKeywords,
        preferences.bodyType,
        preferences.country,
      ]
        .filter(Boolean)
        .join(" ");
      cands = await Promise.race([
        webSearchProducts(q),
        new Promise<Cand[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]);
    }

    // 2) Build strict prompt expecting JSON
    const sys = [
      "You are an editorial-level fashion stylist.",
      "You MUST output a single JSON object EXACTLY matching this TypeScript type:",
      "type Plan = {",
      '  summary: string;',
      '  look: { category: "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Bag" | "Accessory"; title: string; linkIndex: number | null; notes?: string; priceGuess?: string; }[];',
      "  alternates?: Plan['look'];",
      "  fitNotes: string[];",
      "  capsuleTips: string[];",
      "  budgetNote?: string;",
      "};",
      "",
      "RULES:",
      "- Only choose links from CANDIDATE_LINKS via their numeric index; if none fit, set linkIndex=null.",
      "- Do NOT invent exact prices; use a short range or '?' text (store in priceGuess).",
      "- Respect body type, weather, occasion, and budget band.",
      "- Use clean, timeless, capsule-friendly styling.",
      "",
      prefsBlock(preferences),
      "",
      candidatesBlock(cands),
    ].join("\n");

    let plan: Plan | null = null;

    if (HAS_KEY) {
      const completion = await client.chat.completions.create({
        model: MODEL,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          ...history.map((m) => ({ role: m.role, content: contentToText(m.content) })),
          {
            role: "user",
            content:
              "Create the Plan JSON now. Keep it concise, polished, and wearable. Do not include markdown, only JSON.",
          },
        ],
      });

      const raw = completion.choices?.[0]?.message?.content || "{}";
      try {
        plan = JSON.parse(raw) as Plan;
      } catch {
        plan = null;
      }
    }

    // 3) Fallback (no key or parsing failed)
    if (!plan) {
      // lightweight deterministic fallback mapping first candidates to categories
      const pick = (i: number): number | null => (i < cands.length ? i : null);
      plan = {
        summary:
          "A refined, weather-aware look balancing proportion and clean lines. Cohesive neutrals you can remix.",
        look: [
          { category: "Outerwear", title: cands[pick(0) ?? -1]?.title || "Tailored trench", linkIndex: pick(0), priceGuess: "?", notes: "Keeps lines sharp; works over dresses/denim." },
          { category: "Dress", title: cands[pick(1) ?? -1]?.title || "Midi column dress", linkIndex: pick(1), priceGuess: "?", notes: "Column or gentle A-line for easy layering." },
          { category: "Shoes", title: cands[pick(2) ?? -1]?.title || "Sleek ankle boot", linkIndex: pick(2), priceGuess: "?", notes: "Weather-friendly; keeps the silhouette long." },
          { category: "Bag", title: cands[pick(3) ?? -1]?.title || "Structured shoulder bag", linkIndex: pick(3), priceGuess: "?", notes: "Scales for events; minimal hardware." },
        ],
        alternates: [
          { category: "Outerwear", title: cands[pick(4) ?? -1]?.title || "Cropped blazer", linkIndex: pick(4), priceGuess: "?" },
          { category: "Shoes", title: cands[pick(5) ?? -1]?.title || "Pointed pump", linkIndex: pick(5), priceGuess: "?" },
        ],
        fitNotes: [
          "Balance shoulder/hip ratio; use structured outerwear to sharpen lines.",
          "Choose necklines that open the face; keep hems tidy to shoe height.",
        ],
        capsuleTips: [
          "Swap dress for knit + wide trousers for daytime.",
          "Add fine-knit turtleneck under blazer in colder weather.",
        ],
        budgetNote: typeof preferences.budget === "string" || typeof preferences.budget === "number"
          ? String(preferences.budget)
          : "within your chosen band",
      };
    }

    // 4) Render
    const txt = renderPlan(plan, cands, preferences, userText);
    return new Response(txt, { headers });
  } catch (err: unknown) {
    const msg = `I hit a hiccup finishing the look. Please try again.\n\n(${String(
      (err as Error)?.message || err
    )})`;
    return new Response(msg, { headers });
  }
}
