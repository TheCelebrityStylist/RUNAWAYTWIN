// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";

export const runtime = "edge";
export const dynamic = "force-dynamic"; // prevent static optimization; required for reliable streaming

/* --------------------------------
   Types
----------------------------------*/
type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string };
type Prefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string; // "pear" | "apple" | "hourglass" | "rectangle" | etc.
  budget?: number;
  country?: string; // "US", "NL", ...
  currency?: string; // "EUR", "USD"
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

const TE = new TextEncoder();
const sse = (evt: any) => TE.encode(`data: ${JSON.stringify(evt)}\n\n`);
const HEARTBEAT_MS = 10_000;

/* --------------------------------
   Small utils
----------------------------------*/
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const uniqBy = <T,>(arr: T[], key: (t: T) => string) => {
  const seen = new Set<string>(); const out: T[] = [];
  for (const x of arr) { const k = key(x); if (!k || seen.has(k)) continue; seen.add(k); out.push(x); }
  return out;
};
function contentToText(c: unknown): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return (c as any[]).map(v => (typeof v === "string" ? v : v?.text ?? v?.content ?? "")).join(" ");
  if (c && typeof c === "object" && "text" in (c as any)) return String((c as any).text ?? "");
  return "";
}
function lastUserText(msgs: ChatMessage[]) {
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === "user") return contentToText(msgs[i].content);
  return "";
}
function curFor(p: Prefs) { return p.currency || (p.country === "US" ? "USD" : "EUR"); }
function prefsToSystem(p: Prefs) {
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
function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

/* --------------------------------
   Demo catalog (guaranteed fallback)
----------------------------------*/
const DEMO: Product[] = [
  { id: "the-row-tee", brand: "The Row", title: "Wesler Merino T-Shirt", price: 590, currency: "EUR", retailer: "Matches", url: "https://www.matchesfashion.com/products/the-row-wesler-merino-t-shirt", imageUrl: "https://assets.runwaytwin-demo.com/the-row-wesler.jpg", availability: "InStock" },
  { id: "levis-501", brand: "Levi's", title: "501 Original Straight Jeans", price: 110, currency: "EUR", retailer: "Levi.com EU", url: "https://www.levi.com/NL/en_NL/search?q=501", imageUrl: "https://assets.runwaytwin-demo.com/levis-501.jpg", availability: "InStock" },
  { id: "mango-trench", brand: "Mango", title: "Classic Cotton Trench Coat", price: 119.99, currency: "EUR", retailer: "Mango", url: "https://shop.mango.com/nl/dames/jassen/trench-classic", imageUrl: "https://assets.runwaytwin-demo.com/mango-trench.jpg", availability: "InStock" },
  { id: "ganni-tote", brand: "GANNI", title: "Banner Leather Tote", price: 295, currency: "EUR", retailer: "Ganni", url: "https://www.ganni.com", imageUrl: null, availability: "InStock" },
  { id: "gh-ballet", brand: "Giorgio Armani", title: "Pointed Leather Flats", price: 430, currency: "EUR", retailer: "Armani", url: "https://www.armani.com", imageUrl: null, availability: "InStock" },
];

/* --------------------------------
   Optional: Tavily + SerpAPI
----------------------------------*/
function safeJSON(s: string) { try { return JSON.parse(s); } catch { return null; } }
function extractJsonLd(html: string): any[] {
  const out: any[] = []; const rx = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(html))) { const parsed = safeJSON((m[1] || "").trim()); if (parsed == null) continue; Array.isArray(parsed) ? out.push(...parsed) : out.push(parsed); }
  return out;
}
function first<T>(x: T[] | T | undefined) { return Array.isArray(x) ? x[0] : x; }
function pickOffer(offers: any) { if (!offers) return null; const arr = Array.isArray(offers) ? offers : [offers]; return arr.find((o) => String(o.availability || "").toLowerCase().includes("instock")) || arr[0] || null; }
function normalizeProductFromJsonLd(url: string, doc: any): Product | null {
  const types = (doc["@type"] ? (Array.isArray(doc["@type"]) ? doc["@type"] : [doc["@type"]]) : []).map((t: any) => String(t).toLowerCase());
  const isProduct = types.includes("product"); const isOffer = types.includes("offer");
  if (!isProduct && !isOffer) {
    if (doc["@graph"]) { for (const node of doc["@graph"]) { const p = normalizeProductFromJsonLd(url, node); if (p) return p; } }
    return null;
  }
  const node = isProduct ? doc : (doc.itemOffered || doc);
  const brandNode = node.brand;
  const brand = typeof brandNode === "string" ? brandNode : (brandNode?.name ?? "");
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
async function tavilySearch(query: string, max = 10): Promise<string[]> {
  const key = process.env.TAVILY_API_KEY || "";
  if (!key) return [];
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, max_results: clamp(max, 1, 20) }),
  }).catch(() => null);
  if (!res || !res.ok) return [];
  const j = await res.json().catch(() => ({} as any));
  return (Array.isArray(j?.results) ? j.results : []).map((r: any) => r?.url).filter((u: any) => typeof u === "string");
}
async function tavilyAdapter(query: string, limit = 8): Promise<Product[]> {
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
async function serpSearch(query: string, country?: string, limit = 8): Promise<Product[]> {
  const key = process.env.SERPAPI_KEY || "";
  if (!key) return [];
  const gl = (country || "NL").toLowerCase();
  const hl = gl === "us" ? "en" : "en";
  const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&gl=${encodeURIComponent(gl)}&hl=${encodeURIComponent(hl)}&api_key=${key}`;
  const res = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" }).catch(() => null);
  if (!res || !res.ok) return [];
  const json = await res.json().catch(() => ({} as any));
  const items: any[] = Array.isArray(json?.shopping_results) ? json.shopping_results : [];
  const out: Product[] = [];
  for (const it of items) {
    const price =
      typeof it.extracted_price === "number" ? it.extracted_price :
      typeof it.price === "string" ? Number((it.price.match(/[\d,.]+/) || [""])[0].replace(/\./g, "").replace(",", ".")) || null : null;
    const priceText = typeof it.price === "string" ? it.price : "";
    const curGuess = priceText.includes("$") ? "USD" : priceText.includes("£") ? "GBP" : priceText.includes("€") ? "EUR" : null;
    out.push({
      id: it.product_id || it.link || crypto.randomUUID(),
      brand: String(it.source || ""),
      title: String(it.title || ""),
      price: price ?? null,
      currency: curGuess,
      retailer: it.source || null,
      url: String(it.link || it.product_link || ""),
      imageUrl: it.thumbnail || it.product_photos?.[0] || null,
      availability: null,
    });
    if (out.length >= limit) break;
  }
  return uniqBy(out, (p) => p.url);
}

/* --------------------------------
   Deterministic stylist (no-LLM fallback)
----------------------------------*/
type Outfit = {
  top?: Product;
  bottom?: Product;
  dress?: Product;
  outer?: Product;
  shoes?: Product;
  bag?: Product;
  accessories: Product[];
  alternates: { shoes?: Product[]; outer?: Product[] };
  allUsed: Product[];
};

function choose<T>(arr: T[], n: number) {
  const out: T[] = [];
  for (const x of arr) { if (out.length >= n) break; out.push(x); }
  return out;
}
function byCategoryName(ps: Product[], name: string) {
  const rx = new RegExp(name, "i");
  return ps.filter(p => rx.test(p.title) || rx.test(p.brand) || rx.test(p.url));
}
function composeOutfit(products: Product[], prefs: Prefs): Outfit {
  const cur = curFor(prefs);
  const tops = byCategoryName(products, "tee|shirt|blouse|knit|sweater");
  const jeans = byCategoryName(products, "jean|trouser|pant");
  const dress = byCategoryName(products, "dress");
  const outer = byCategoryName(products, "coat|trench|blazer|jacket");
  const shoes = byCategoryName(products, "loafer|boot|sneaker|flat|heel|sand");
  const bags  = byCategoryName(products, "bag|tote|shoulder|cross");

  const pick = <T,>(arr: T[]) => arr[0];
  const o: Outfit = {
    top: pick(tops) || pick(products),
    bottom: pick(jeans),
    dress: pick(dress),
    outer: pick(outer),
    shoes: pick(shoes),
    bag: pick(bags),
    accessories: [],
    alternates: { shoes: choose(shoes.slice(1), 2), outer: choose(outer.slice(1), 2) },
    allUsed: [],
  };

  // pick either dress or top+bottom:
  if (o.dress && (!o.top || !o.bottom)) {
    o.top = undefined; o.bottom = undefined;
  } else {
    o.dress = undefined;
  }

  // fallback fill
  const fill = () => {
    const any = (skip?: Product) => products.find(p => p !== skip);
    if (!o.top) o.top = any();
    if (!o.bottom && !o.dress) o.bottom = any(o.top!);
    if (!o.outer) o.outer = any(o.top!);
    if (!o.shoes) o.shoes = shoes[0] || any(o.outer!);
    if (!o.bag) o.bag = bags[0] || any(o.shoes!);
  };
  fill();

  o.allUsed = [o.top, o.bottom, o.dress, o.outer, o.shoes, o.bag, ...o.accessories]
    .filter(Boolean) as Product[];
  // normalize currency
  o.allUsed.forEach(p => { if (!p.currency) p.currency = cur; });

  return o;
}

function bodyTypeReasons(prefs: Prefs) {
  const bt = (prefs.bodyType || "").toLowerCase();
  const map: Record<string, string[]> = {
    pear: [
      "Structured shoulders broaden the frame.",
      "High-rise, fluid bottoms lengthen the leg line.",
      "Cropped or waist-defining layers spotlight your narrowest point.",
    ],
    apple: [
      "V-necklines elongate; gentle drape skims the midsection.",
      "Straight or slim bottoms keep lines clean.",
      "Unstructured coats avoid bulk through the middle.",
    ],
    hourglass: [
      "Waist-emphasis keeps proportions balanced.",
      "Mid-rise/High-rise trousers follow natural curves.",
      "Tailored outerwear preserves shape without adding volume.",
    ],
    rectangle: [
      "Soft drape and peplum/waist detail create curve.",
      "Wide-leg or tapered bottoms add shape contrast.",
      "Layering at shoulders adds dimension.",
    ],
  };
  return map[bt] || [
    "Clean lines and considered drape keep the silhouette polished.",
    "Proportions balance shoulder, waist, and hem elegantly.",
  ];
}

function renderFinal(out: Outfit, prefs: Prefs, brief: string): string {
  const cur = curFor(prefs);
  const parts: string[] = [];
  parts.push(`Absolutely—here’s a refined look tailored ${prefs.bodyType ? `for your ${prefs.bodyType.toLowerCase()} shape` : "to you"}${brief ? ` — ${brief}` : ""}:`);
  parts.push("");
  const line = (label: string, p?: Product) => {
    if (!p) return;
    parts.push(`- **${label}:** ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? cur} | ${p.retailer ?? safeHost(p.url)} | ${p.url}${p.imageUrl ? ` | ${p.imageUrl}` : ""}`);
  };

  if (out.dress) line("Dress", out.dress);
  else { line("Top", out.top!); line("Bottom", out.bottom!); }
  line("Outerwear", out.outer!);
  line("Shoes", out.shoes!);
  line("Bag", out.bag!);

  // Body-type reasons
  parts.push("");
  parts.push("**Why it flatters:**");
  bodyTypeReasons(prefs).forEach(r => parts.push(`- ${r}`));

  // Budget + total
  const total = out.allUsed.reduce((s, p) => s + (typeof p.price === "number" ? p.price : 0), 0);
  if (total > 0) {
    parts.push("");
    parts.push(`**Approx total:** ~${Math.round(total)} ${cur}`);
    if (prefs.budget && total > prefs.budget) {
      parts.push(`**Save options:** swap outer/shoes for lower-priced alternates below to hit ~${prefs.budget} ${cur}.`);
    }
  }

  // Alternates
  parts.push("");
  parts.push("**Alternates:**");
  if (out.alternates.shoes?.length) {
    parts.push("- Shoes:");
    out.alternates.shoes.forEach(a => parts.push(`  • ${a.brand} — ${a.title} | ${a.price ?? "?"} ${a.currency ?? cur} | ${a.retailer ?? safeHost(a.url)} | ${a.url}`));
  } else {
    parts.push("- Shoes: searching…");
  }
  if (out.alternates.outer?.length) {
    parts.push("- Outerwear:");
    out.alternates.outer.forEach(a => parts.push(`  • ${a.brand} — ${a.title} | ${a.price ?? "?"} ${a.currency ?? cur} | ${a.retailer ?? safeHost(a.url)} | ${a.url}`));
  } else {
    parts.push("- Outerwear: searching…");
  }

  // Capsule & Tips
  parts.push("");
  parts.push("**Capsule & Tips:**");
  parts.push("- Remix the knit with tailored black trousers and loafers for office polish.");
  parts.push("- Dress down the trench with a striped tee and sneakers on weekends.");
  parts.push("- Tip: steam outerwear to sharpen the drape.");
  parts.push("- Tip: keep hemlines just skimming the shoe for a long leg line.");

  // Upsell
  parts.push("");
  parts.push("Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎");

  return parts.join("\n");
}

/* --------------------------------
   Route: Guaranteed-response SSE
----------------------------------*/
export async function POST(req: NextRequest) {
  let body: any = {}; try { body = await req.json(); } catch {}
  const clientMessages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const preferences: Prefs = (body?.preferences || {}) as Prefs;

  // Try to load your internal tools (Awin/Amazon adapters) if present
  let toolsSearch: null | ((p: { query: string; country: string; currency: string; limit: number; preferEU?: boolean }) => Promise<Product[]>) = null;
  try { const t1 = await import("../tools"); if (typeof t1?.searchProducts === "function") toolsSearch = t1.searchProducts as any; } catch {}
  if (!toolsSearch) { try { const t2 = await import("./tools"); if (typeof t2?.searchProducts === "function") toolsSearch = t2.searchProducts as any; } catch {} }

  const stream = new ReadableStream({
    async start(controller) {
      const push = (evt: any) => controller.enqueue(sse(evt));
      const heart = setInterval(() => push({ type: "ping" }), HEARTBEAT_MS);

      // Deadlines
      const SEARCH_SOFT_MS = 4500; // show something by then
      const SEARCH_HARD_MS = 6500; // never wait beyond this for search
      const LIMIT = 10;

      try {
        // 1) ready + optimistic greeting
        push({ type: "ready" });
        const ask = lastUserText(clientMessages);
        const cur = curFor(preferences);
        const brief =
          [preferences.styleKeywords, ask].filter(Boolean).join(" • ") +
          (preferences.budget ? ` • budget ~${preferences.budget} ${cur}` : "");
        const greet =
          "Hi! I’m your celebrity stylist — I’ll assemble a head-to-toe look with real links, body-type fit notes, and capsule tips.";
        push({ type: "assistant_draft_delta", data: `${greet}\n` });
        if (brief.trim()) push({ type: "assistant_draft_delta", data: `Brief: ${brief}\n\n` });

        // 2) parallel, time-boxed product search (never blocks final)
        const q = [ask, preferences.styleKeywords].filter(Boolean).join(" | ").trim()
          || "elevated minimal trench knit wide-leg trouser leather loafer";
        const country = preferences.country || "NL";
        const currency = cur;

        const jobs: Promise<Product[]>[] = [];
        if (toolsSearch) jobs.push(withTimeout(toolsSearch({ query: q, country, currency, limit: LIMIT, preferEU: country !== "US" }), SEARCH_HARD_MS, "tools-timeout"));
        jobs.push(withTimeout(serpSearch(q, country, LIMIT), SEARCH_HARD_MS, "serp-timeout"));
        jobs.push(withTimeout(tavilyAdapter(q, LIMIT), SEARCH_HARD_MS, "tavily-timeout"));

        const collected: Product[] = [];
        const collector = (async () => {
          const res = await Promise.allSettled(jobs);
          for (const r of res) if (r.status === "fulfilled" && Array.isArray(r.value)) collected.push(...r.value);
        })();

        // Soft deadline → stream preview and proceed
        await Promise.race([collector, new Promise((r) => setTimeout(r, SEARCH_SOFT_MS))]);
        let products = collected.length ? collected : DEMO.slice(0, clamp(LIMIT, 4, 12));
        products = uniqBy(products, p => p.url).slice(0, LIMIT);

        const preview = products.slice(0, 4).map(p => `• ${p.brand}: ${p.title}`).join("\n");
        push({ type: "assistant_draft_delta", data: `Found options:\n${preview}\n\n` });
        push({ type: "assistant_draft_done" });

        // Allow the rest of search to finish up to the hard deadline (without blocking final creation)
        await Promise.race([collector, new Promise((r) => setTimeout(r, SEARCH_HARD_MS - SEARCH_SOFT_MS))]);
        if (collected.length) products = uniqBy(collected, p => p.url).slice(0, LIMIT);

        // 3) Compose a premium outfit **without** relying on OpenAI
        const outfit = composeOutfit(products, preferences);
        const final = renderFinal(outfit, preferences, [preferences.styleKeywords, ask].filter(Boolean).join(" • "));

        // 4) Emit final + done (guaranteed)
        push({ type: "assistant_final", data: final });
        push({ type: "done" });
      } catch (err: any) {
        console.error("[RunwayTwin route] fatal", err?.message || err);
        // Even if something goes REALLY wrong, we still answer.
        const cur = curFor(preferences);
        const safe = DEMO.slice(0, 5);
        const outfit = composeOutfit(safe, preferences);
        const final = renderFinal(outfit, preferences, "");
        push({ type: "assistant_final", data: final });
        push({ type: "done" });
      } finally {
        clearInterval(heart);
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
