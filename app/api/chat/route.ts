// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";

// If your project already exports an encodeSSE helper, we’ll use it.
// If not, we fall back to a local encoder so streaming never breaks.
let externalEncodeSSE: ((evt: any) => string) | null = null;
try {
  // keep your original relative path if it exists
  // (change this path if your helper lives elsewhere)
  // @ts-ignore - optional import at runtime
  const mod = await import("../../lib/sse/reader");
  if (typeof mod?.encodeSSE === "function") externalEncodeSSE = mod.encodeSSE as (evt: any) => string;
} catch { /* no-op; we’ll use the inline fallback below */ }

export const runtime = "edge";

/* =====================================================================================
   Types (SDK-free for Edge; matches your existing patterns)
   ===================================================================================== */
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

type Product = {
  id: string;
  brand: string;
  title: string;
  price: number | null;
  currency: string | null;
  retailer: string | null;
  url: string;
  imageUrl?: string | null;
  availability?: string | null;
};

/* =====================================================================================
   SSE framing (uses your encodeSSE if present, else a safe fallback)
   ===================================================================================== */
const ENCODER = new TextEncoder();
function fallbackEncodeSSE(evt: Record<string, any>) {
  return `data: ${JSON.stringify(evt)}\n\n`;
}
const encode = (evt: any) => ENCODER.encode((externalEncodeSSE ?? fallbackEncodeSSE)(evt));

/* =====================================================================================
   Utilities (safe parsing, timeouts, uniq, messaging helpers)
   ===================================================================================== */
function contentToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return (c as any[])
      .map((p) => (typeof p === "string" ? p : (p?.text ?? p?.content ?? "")))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}
function lastUserText(msgs: ChatMessage[]): string {
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === "user") return contentToText(msgs[i].content);
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
function safeHost(u: string) { try { return new URL(u).hostname; } catch { return ""; } }
function uniqBy<T>(arr: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>(); const out: T[] = [];
  for (const x of arr) { const k = key(x); if (!k || seen.has(k)) continue; seen.add(k); out.push(x); }
  return out;
}
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}
function bulletsFromProducts(ps: Product[]) {
  return ps.map(p =>
    `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? safeHost(p.url)} | ${p.url} | ${p.imageUrl ?? ""}`
  ).join("\n");
}

/* =====================================================================================
   Built-in adapters (only used to augment or if your tools.ts is missing)
   ===================================================================================== */
// Small deterministic demo catalog (never leaves user empty-handed)
const DEMO: Product[] = [
  { id: "the-row-tee", brand: "The Row", title: "Wesler Merino T-Shirt", price: 590, currency: "EUR", retailer: "Matches", url: "https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt", imageUrl: "https://assets.runwaytwin-demo.com/the-row-wesler.jpg", availability: "InStock" },
  { id: "levis-501", brand: "Levi's", title: "501 Original Straight Jeans", price: 110, currency: "EUR", retailer: "Levi.com EU", url: "https://www.levi.com/NL/en_NL/search?q=501", imageUrl: "https://assets.runwaytwin-demo.com/levis-501.jpg", availability: "InStock" },
  { id: "mango-trench", brand: "Mango", title: "Classic Cotton Trench Coat", price: 119.99, currency: "EUR", retailer: "Mango", url: "https://shop.mango.com/nl/dames/jassen/trench-classic", imageUrl: "https://assets.runwaytwin-demo.com/mango-trench.jpg", availability: "InStock" },
];

// Tavily web meta → JSON-LD/OG scrape (Edge-safe)
async function tavilySearch(query: string, max = 12): Promise<string[]> {
  const key = process.env.TAVILY_API_KEY || "";
  if (!key) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, max_results: clamp(max, 1, 20) }),
  }).catch(() => null);
  if (!res || !res.ok) return [];
  const j = await res.json().catch(() => ({}));
  return (Array.isArray(j?.results) ? j.results : [])
    .map((r: any) => r?.url)
    .filter((u: any) => typeof u === "string");
}
function safeJSON(s: string) { try { return JSON.parse(s); } catch { return null; } }
function extractJsonLd(html: string): any[] {
  const out: any[] = []; const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) { const parsed = safeJSON((m[1] || "").trim()); if (parsed == null) continue; Array.isArray(parsed) ? out.push(...parsed) : out.push(parsed); }
  return out;
}
function first<T>(x: T[] | T | undefined): T | undefined { return Array.isArray(x) ? x[0] : x; }
function pickOffer(offers: any) { if (!offers) return null; const arr = Array.isArray(offers) ? offers : [offers]; return arr.find((o) => String(o.availability || "").toLowerCase().includes("instock")) || arr[0] || null; }
function normalizeProductFromJsonLd(url: string, doc: any): Product | null {
  const types = (doc["@type"] ? (Array.isArray(doc["@type"]) ? doc["@type"] : [doc["@type"]]) : []).map((t: any) => String(t).toLowerCase());
  const isProduct = types.includes("product"); const isOffer = types.includes("offer");
  if (!isProduct && !isOffer) {
    if (doc["@graph"]) { for (const node of doc["@graph"]) { const p = normalizeProductFromJsonLd(url, node); if (p) return p; } }
    return null;
  }
  const node = isProduct ? doc : (doc.itemOffered || doc);
  const brandNode = node.brand; const brand = typeof brandNode === "string" ? brandNode : (brandNode?.name ?? "");
  const offer = pickOffer(node.offers || doc.offers);
  const price = offer ? Number(offer.price || offer?.priceSpecification?.price || NaN) : NaN;
  const currency = offer?.priceCurrency || offer?.priceSpecification?.priceCurrency || null;
  const image = first(node.image) || node.image || offer?.image || null;
  const retailer = offer?.seller?.name || offer?.seller || null;
  const title = node.name || offer?.itemOffered?.name || null;
  const id = node.sku || node.productID || node["@id"] || url;
  if (!title) return null;
  return { id: String(id), brand: String(brand || ""), title: String(title), price: Number.isFinite(price) ? price : null, currency: currency ? String(currency) : null, retailer: retailer ? String(retailer) : null, url, imageUrl: image ? String(image) : null, availability: offer?.availability || null };
}
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 RunwayTwinBot/1.0", accept: "text/html,application/xhtml+xml" } });
    if (!res.ok) return null; const html = await res.text();
    return html && html.length > 200 ? html : null;
  } catch { return null; }
}
function scrapeOG(html: string) {
  const img = html.match(/<meta[^>]+property=['"]og:image['"][^>]+content=['"]([^'"]+)['"]/i)?.[1];
  const title = html.match(/<meta[^>]+property=['"]og:title['"][^>]+content=['"]([^'"]+)['"]/i)?.[1];
  return { imageUrl: img || null, title: title || null };
}
async function tavilyAdapter(query: string, limit = 6): Promise<Product[]> {
  const urls = await tavilySearch(query, limit * 2);
  const out: Product[] = [];
  for (const u of urls) {
    const html = await fetchHtml(u); if (!html) continue;
    const blocks = extractJsonLd(html);
    let prod: Product | null = null;
    for (const b of blocks) { prod = normalizeProductFromJsonLd(u, b); if (prod) break; }
    if (!prod) {
      const og = scrapeOG(html);
      if (og.title) prod = { id: u, brand: "", title: og.title, price: null, currency: null, retailer: safeHost(u), url: u, imageUrl: og.imageUrl, availability: null };
    }
    if (prod) out.push(prod);
    if (out.length >= limit) break;
  }
  return out;
}

// SerpAPI Shopping (lightweight normalization)
async function serpSearch(query: string, country?: string, limit = 8): Promise<Product[]> {
  const key = process.env.SERPAPI_KEY || "";
  if (!key) return [];
  const gl = (country || "NL").toLowerCase();
  const hl = gl === "us" ? "en" : "en";
  const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&gl=${encodeURIComponent(gl)}&hl=${encodeURIComponent(hl)}&api_key=${key}`;
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return [];
  const json = await res.json().catch(() => ({}));
  const items: any[] = Array.isArray(json?.shopping_results) ? json.shopping_results : [];
  const out: Product[] = [];
  for (const it of items) {
    const price = typeof it.extracted_price === "number" ? it.extracted_price :
      (typeof it.price === "string" ? Number((it.price.match(/[\d,.]+/) || [""])[0].replace(".", "").replace(",", ".")) : null);
    const curGuess = typeof it.price === "string"
      ? (it.price.includes("$") ? "USD" : it.price.includes("£") ? "GBP" : it.includes?.("€") ? "EUR" : null)
      : null;
    out.push({
      id: it.product_id || it.link || crypto.randomUUID(),
      brand: (it.source || "").toString(),
      title: (it.title || "").toString(),
      price: price ?? null,
      currency: curGuess,
      retailer: (it.source || null),
      url: (it.link || it.product_link || "").toString(),
      imageUrl: (it.thumbnail || it.product_photos?.[0] || null),
      availability: null,
    });
    if (out.length >= limit) break;
  }
  return uniqBy(out, p => p.url);
}

/* =====================================================================================
   Try to use your existing tools.ts (Awin/Amazon/etc). If present, we use it FIRST.
   Then we augment with SerpAPI + Tavily. Finally we fall back to DEMO.
   ===================================================================================== */
type ToolsSearch = (p: { query: string; country: string; currency: string; limit: number; preferEU?: boolean }) => Promise<Product[]>;
let toolsSearch: ToolsSearch | null = null;
try {
  // Prefer app/api/tools.ts (one level up from /chat)
  const t1 = await import("../tools");
  if (typeof t1?.searchProducts === "function") toolsSearch = t1.searchProducts as ToolsSearch;
} catch { /* ignore */ }
if (!toolsSearch) {
  try {
    // Some projects colocate tools next to route
    const t2 = await import("./tools");
    if (typeof t2?.searchProducts === "function") toolsSearch = t2.searchProducts as ToolsSearch;
  } catch { /* ignore */ }
}

/* =====================================================================================
   OpenAI compose (REST, non-stream) — used for the FINAL polished message
   ===================================================================================== */
async function openaiComplete(messages: ChatMessage[], model: string, key: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.5, messages }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json().catch(() => ({}));
  return (j?.choices?.[0]?.message?.content as string) || "";
}

/* =====================================================================================
   Route — rock-solid SSE: ready → assistant_draft_delta* → assistant_draft_done → assistant_final → done
   ===================================================================================== */
export async function POST(req: NextRequest) {
  let body: any = {}; try { body = await req.json(); } catch {}
  const clientMessages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const preferences: Prefs = (body?.preferences || {}) as Prefs;

  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    {
      role: "system",
      content:
        `You are "The Ultimate Celebrity Stylist AI": warm, premium, aspirational, concise, never repetitive. ` +
        `Detect celebrity muses automatically. When you have body type + occasion, deliver a complete outfit with brand/item/price+currency/retailer/link/image and explicit body-type reasons. ` +
        `Always include alternates for shoes & outerwear with links, show total & 'Save' options if over budget, and 'Capsule & Tips'. ` +
        `Close with: "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎".`,
    },
    { role: "system", content: prefsToSystem(preferences) },
    ...clientMessages,
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const push = (evt: any) => controller.enqueue(encode(evt));
      const keepAlive = setInterval(() => push({ type: "ping" }), 15000);

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
      const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

      try {
        push({ type: "ready" });

        // 1) Conversational draft (streams immediately, never blocks)
        const ask = lastUserText(baseMessages);
        const cur = curFor(preferences);
        const greet = "Hi! I’m your celebrity stylist—curating a head-to-toe look with shoppable links and sharp fit notes.";
        const brief = preferences.bodyType || preferences.styleKeywords || ask
          ? `Brief: ${[preferences.bodyType, preferences.styleKeywords, ask].filter(Boolean).join(" • ")}${preferences.budget ? ` • budget ~${preferences.budget} ${cur}` : ""}`
          : "Tell me body type + occasion + any muse (e.g., “Zendaya for a gallery opening”).";
        push({ type: "assistant_draft_delta", data: `${greet}\n` });
        push({ type: "assistant_draft_delta", data: `${brief}\n\n` });

        // 2) Multi-source product search (Tools → SerpAPI → Tavily → DEMO). All run in parallel with timeouts.
        const q = [ask, preferences.styleKeywords].filter(Boolean).join(" | ").trim() ||
                  "elevated minimal: structured knit, wide-leg trouser, trench, leather loafer";
        const currency = cur;
        const country = preferences.country || "NL";
        const limit = 10;

        const jobs: Promise<Product[]>[] = [];

        if (toolsSearch) {
          jobs.push(withTimeout(toolsSearch({ query: q, country, currency, limit, preferEU: country !== "US" }), 16000, "tools-search-timeout"));
        }
        jobs.push(withTimeout(serpSearch(q, country, limit), 12000, "serp-timeout"));
        jobs.push(withTimeout(tavilyAdapter(q, limit), 12000, "tavily-timeout"));

        const results = await Promise.allSettled(jobs);
        let products: Product[] = [];
        for (const r of results) if (r.status === "fulfilled" && Array.isArray(r.value)) products = products.concat(r.value);

        if (!products.length) {
          products = DEMO.slice(0, clamp(limit, 3, 12));
        }

        // dedupe + trim
        products = uniqBy(products, p => p.url).slice(0, limit);

        // Stream small preview into draft to keep the chat feeling alive
        if (products.length) {
          const preview = products.slice(0, 4).map((p) => `• ${p.brand}: ${p.title}`).join("\n");
          push({ type: "assistant_draft_delta", data: `Found options:\n${preview}\n\n` });
        }

        push({ type: "assistant_draft_done" });

        // 3) Final composition with OpenAI (strict timeout + graceful fallback)
        let finalText = "";
        try {
          if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

          const rules = [
            "Use ONLY the Candidate Products for URLs. Do not invent links.",
            "Return: Top, Bottom (or Dress), Outerwear, Shoes, Accessories.",
            "Explain exactly why each flatters the body type (rise, drape, neckline, hem, silhouette, fabrication, proportion).",
            "Respect budget; show total; add 'Save' alternates if total exceeds budget.",
            "Always include alternates for shoes and outerwear with links.",
            "Add 'Capsule & Tips' (2–3 remix ideas + 2 succinct tips).",
            "Tone: premium, warm, punchy, never repetitive.",
            "Close with the upsell line verbatim.",
          ].join(" ");

          const productBlock = `Candidate Products (use links as-is):\n${bulletsFromProducts(products)}`;

          const finalizeMessages: ChatMessage[] = [
            ...baseMessages,
            { role: "system", content: rules },
            { role: "system", content: productBlock },
          ];

          finalText = await withTimeout(openaiComplete(finalizeMessages, MODEL, OPENAI_API_KEY), 22000, "openai-final-timeout");
        } catch (e: any) {
          console.warn("[RunwayTwin] finalize failed:", e?.message || e);
          // deterministic, shoppable fallback (never leaves the user empty-handed)
          const tot = products.reduce((sum, p) => sum + (typeof p.price === "number" ? p.price : 0), 0);
          const approx = tot ? `Approx total: ~${Math.round(tot)} ${currency}` : "";
          const lines = [
            "Outfit:",
            ...products.slice(0, 6).map(p => `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? safeHost(p.url)} | ${p.url}`),
            "",
            approx,
            "",
            "Capsule & Tips:",
            "- Swap loafers for ankle boots on rainy days.",
            "- Pair the knit with tailored trousers for office polish.",
            "- Tip: steam outerwear for a longer, cleaner drape.",
            "- Tip: for pear shapes, add shoulder structure + flowing bottom.",
            "",
            "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
          ].filter(Boolean);
          finalText = lines.join("\n");
        }

        // 4) Final + done (always emitted)
        push({ type: "assistant_final", data: finalText });
        push({ type: "done" });
      } catch (err: any) {
        console.error("[RunwayTwin] route fatal:", err?.message || err);
        push({
          type: "assistant_final",
          data:
            "I hit a hiccup preparing your look, but your brief is saved. Try again—I'll stream fresh options with live links immediately.",
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
