import { NextRequest } from "next/server";
import { searchProducts as legacySearchProducts, type Product } from "../tools";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { runTool, toolSchemas } from "./tools";
import type { AdapterContext } from "./tools/types";

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

type NormalizedPrefs = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budgetLabel?: string;
  budgetValue?: number;
  country?: string;
  currency?: string;
  styleKeywordsText?: string;
  styleKeywordsList: string[];
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

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
    if (!cleaned) return undefined;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseMeasurement(value: unknown): number | undefined {
  const num = parseNumber(value);
  if (typeof num === "number") return num;
  if (typeof value === "string") {
    const match = value.match(/([0-9]{2,3})/);
    if (match) {
      const parsed = Number.parseInt(match[1]!, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

function normalizeKeywords(value: unknown): { text?: string; list: string[] } {
  if (Array.isArray(value)) {
    const list = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return { text: list.join(" · "), list };
  }
  if (typeof value === "string") {
    const list = value
      .split(/[|,•·]/)
      .map((part) => part.trim())
      .filter(Boolean);
    const text = list.join(" · ") || value.trim();
    return { text, list: list.length ? list : value.trim() ? [value.trim()] : [] };
  }
  return { list: [] };
}

function parseBudget(value: unknown): { label?: string; amount?: number } {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { label: `${value}`, amount: value };
  }
  if (typeof value === "string") {
    const numbers = value.match(/\d+(?:[.,]\d+)?/g)?.map((part) => Number.parseFloat(part.replace(/,/g, "")));
    if (numbers && numbers.length) {
      const amount = Math.max(...numbers.filter((n) => Number.isFinite(n)));
      if (Number.isFinite(amount)) {
        return { label: value, amount };
      }
    }
    const normalized = value.trim();
    if (normalized) {
      const presets: Record<string, number> = {
        "<$150": 150,
        "$150–$300": 300,
        "$300–$600": 600,
        "$600–$1000": 1000,
        "$1000+": 1600,
        "luxury / couture": 3500,
      };
      const lower = normalized.toLowerCase();
      const presetAmount = Object.entries(presets).find(([key]) => key.toLowerCase() === lower)?.[1];
      return { label: normalized, amount: presetAmount };
    }
  }
  return {};
}

function normalizePreferences(raw: any): NormalizedPrefs {
  if (!raw || typeof raw !== "object") {
    return { styleKeywordsList: [] };
  }

  const sizes = typeof raw.sizes === "object" && raw.sizes ? raw.sizes : {};
  const keywords = normalizeKeywords(raw.styleKeywords ?? raw.style_keywords ?? raw.style);
  const budget = parseBudget(raw.budget ?? raw.budgetMax ?? raw.budgetLabel);

  const heightCm = parseMeasurement(raw.height ?? raw.heightCm);
  const weightKg = parseMeasurement(raw.weight ?? raw.weightKg);

  const normalized: NormalizedPrefs = {
    gender: raw.gender ?? raw.profileGender ?? undefined,
    sizeTop: raw.sizeTop ?? sizes.top ?? undefined,
    sizeBottom: raw.sizeBottom ?? sizes.bottom ?? undefined,
    sizeDress: raw.sizeDress ?? sizes.dress ?? undefined,
    sizeShoe: raw.sizeShoe ?? sizes.shoe ?? undefined,
    bodyType: raw.bodyType ?? raw.body_type ?? undefined,
    budgetLabel: budget.label ?? (typeof raw.budget === "string" ? raw.budget : undefined),
    budgetValue: budget.amount,
    country: raw.country ?? raw.locale ?? undefined,
    currency: raw.currency ?? undefined,
    styleKeywordsText: keywords.text,
    styleKeywordsList: keywords.list,
    heightCm,
    weightKg,
  };

  return normalized;
}

function countryToCurrency(country?: string): string {
  if (!country) return "EUR";
  const code = country.toUpperCase();
  if (code === "US") return "USD";
  if (code === "UK" || code === "GB") return "GBP";
  if (code === "CA") return "CAD";
  if (code === "AU") return "AUD";
  if (code === "JP") return "JPY";
  if (code === "CH") return "CHF";
  if (code === "AE" || code === "UAE") return "AED";
  if (code === "EU") return "EUR";
  return "EUR";
}

function currencyForPrefs(prefs: NormalizedPrefs): string {
  if (prefs.currency) return prefs.currency.toUpperCase();
  return countryToCurrency(prefs.country);
}

function prefsToSystem(prefs: NormalizedPrefs): string {
  const currency = currencyForPrefs(prefs);
  const budgetLine = prefs.budgetLabel
    ? `${prefs.budgetLabel}`
    : typeof prefs.budgetValue === "number"
    ? `${Math.round(prefs.budgetValue)} ${currency}`
    : "-";
  return [
    "User Profile",
    `- Gender: ${prefs.gender ?? "-"}`,
    `- Sizes: top=${prefs.sizeTop ?? "-"}, bottom=${prefs.sizeBottom ?? "-"}, dress=${prefs.sizeDress ?? "-"}, shoe=${prefs.sizeShoe ?? "-"}`,
    `- Body Type: ${prefs.bodyType ?? "-"}`,
    `- Height/Weight: ${prefs.heightCm ?? "-"}cm / ${prefs.weightKg ?? "-"}kg`,
    `- Budget: ${budgetLine}`,
    `- Country: ${prefs.country ?? "-"}`,
    `- Currency: ${currency}`,
    `- Style Keywords: ${prefs.styleKeywordsText ?? (prefs.styleKeywordsList.length ? prefs.styleKeywordsList.join(" · ") : "-")}`,
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

function bulletsFromProducts(products: Product[]): string {
  return products
    .map(
      (p) =>
        `- ${p.brand} — ${p.title} | ${p.price ?? "?"} ${p.currency ?? ""} | ${p.retailer ?? safeHost(p.url)} | ${p.url} | ${p.imageUrl ?? ""}`
    )
    .join("\n");
}

function formatCurrency(amount: number, currency: string) {
  if (!Number.isFinite(amount)) return "—";
  return `${currency} ${Math.round(amount)}`;
}

type OutfitPlan = {
  top?: Product | null;
  bottom?: Product | null;
  dress?: Product | null;
  outerwear?: Product | null;
  shoes?: Product | null;
  bag?: Product | null;
  accessories: Product[];
  outerwearAlt?: Product | null;
  shoesAlt?: Product | null;
  total: number;
  selected: Product[];
};

function sortByPrice(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const priceA = typeof a.price === "number" ? a.price : Number.POSITIVE_INFINITY;
    const priceB = typeof b.price === "number" ? b.price : Number.POSITIVE_INFINITY;
    return priceA - priceB;
  });
}

function groupByCategory(products: Product[]): Record<string, Product[]> {
  return products.reduce<Record<string, Product[]>>((acc, product) => {
    const key = product.category?.toLowerCase() ?? "misc";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(product);
    return acc;
  }, {});
}

function pickOutfit(products: Product[], currency: string, prefs: NormalizedPrefs): OutfitPlan {
  const groups = groupByCategory(products);
  const take = (category: string) => sortByPrice(groups[category.toLowerCase()] ?? []);

  const dresses = take("dress");
  const tops = take("top");
  const bottoms = take("bottom");
  const outerwear = take("outerwear");
  const shoes = take("shoes");
  const bags = take("bag");
  const accessories = take("accessories");

  const usingDress = dresses.length > 0 && (!tops.length || !bottoms.length);

  const dress = usingDress ? dresses[0] ?? null : null;
  const top = usingDress ? null : tops[0] ?? null;
  const bottom = usingDress ? null : bottoms[0] ?? null;
  const outerwearPrimary = outerwear[0] ?? null;
  const shoesPrimary = shoes[0] ?? null;
  const bag = bags[0] ?? null;
  const jewellery = accessories.slice(0, 2);

  const selected: Product[] = [];
  for (const item of [top, bottom, dress, outerwearPrimary, shoesPrimary, bag, ...jewellery]) {
    if (item) selected.push(item);
  }

  const total = selected.reduce((sum, item) => sum + (typeof item.price === "number" ? item.price : 0), 0);

  return {
    top,
    bottom,
    dress,
    outerwear: outerwearPrimary,
    shoes: shoesPrimary,
    bag,
    accessories: jewellery,
    outerwearAlt: outerwear.find((item) => item !== outerwearPrimary) ?? null,
    shoesAlt: shoes.find((item) => item !== shoesPrimary) ?? null,
    total,
    selected,
  };
}

function describeFit(category: string, prefs: NormalizedPrefs): string {
  const body = prefs.bodyType?.toLowerCase();
  if (!body) {
    const defaults: Record<string, string> = {
      top: "Slim, structured lines keep the proportions clean.",
      bottom: "Tailoring lengthens the leg line for polish.",
      dress: "A sculpted waist keeps the silhouette refined.",
      outerwear: "Sharp shoulders frame the look without bulk.",
      shoes: "Sleek profile elongates the line of the leg.",
      bag: "Structured leather finishes the look with intention.",
      accessories: "Refined accents tie the palette together.",
    };
    return defaults[category] ?? "Polished details keep the story cohesive.";
  }

  switch (category) {
    case "top":
      return `${body} silhouettes love a top that skims the waist so curves stay defined.`;
    case "bottom":
      return `${body} bodies benefit from a tailored leg—this pair creates long, clean lines.`;
    case "dress":
      return `${body} frames shine in a dress that nips at the waist and floats over curves.`;
    case "outerwear":
      return `${body} proportions stay balanced with structured shoulders and a controlled drape.`;
    case "shoes":
      return `${body} lines look longer with a streamlined shoe and modest rise.`;
    case "bag":
      return `${body} styling stays sleek with a structured bag that mirrors the outfit's geometry.`;
    default:
      return `${body} styling feels elevated with polished accessories to echo the hardware.`;
  }
}

function formatProductLine(label: string, product: Product | null | undefined, prefs: NormalizedPrefs, currency: string) {
  if (!product) return null;
  const price = typeof product.price === "number" ? formatCurrency(product.price, product.currency ?? currency) : `${product.currency ?? currency} —`;
  const retailer = product.retailer ?? safeHost(product.url);
  const reasoning = describeFit(label.toLowerCase(), prefs);
  const image = product.imageUrl ? ` (Image: ${product.imageUrl})` : "";
  return `${label}: ${product.brand ?? ""} ${product.title ?? ""} — ${price} at ${retailer} → ${product.url}${image}\n  Why: ${reasoning}`;
}

function fallbackCopy(products: Product[], currency: string, ask: string, prefs: NormalizedPrefs): string {
  if (!products.length) {
    return [
      "Vibe: I’m scouting more boutiques for your brief — give me a beat and I’ll refresh.",
      ask ? `Brief: “${ask}”` : "",
      "",
      "Outfit:",
      "- Still sourcing exact pieces. Tap again for a refreshed pull.",
      "",
      "Capsule & Tips:",
      "- Rotate your go-to tailoring with a satin camisole for evening polish.",
      "- Anchor with a hero outerwear moment to frame your silhouette.",
      "- Tip: keep proportions balanced — cinch the waist, lengthen the leg.",
      "- Tip: mirror hardware tones with jewellery for cohesion.",
      "",
      "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const plan = pickOutfit(products, currency, prefs);
  const bodyFocus = prefs.bodyType ? `Body type focus: ${prefs.bodyType}.` : "Balanced to flatter every line.";
  const muse = ask ? `Muse: “${ask}”.` : prefs.styleKeywordsText ? `Style DNA: ${prefs.styleKeywordsText}.` : "";

  const totalLine = `Total: ${formatCurrency(plan.total, currency)}`;
  const budgetLine =
    typeof prefs.budgetValue === "number"
      ? plan.total > prefs.budgetValue
        ? `Budget check: swap in the save picks to glide under ${currency} ${Math.round(prefs.budgetValue)}.`
        : `Budget check: we land within ~${currency} ${Math.round(prefs.budgetValue)}.`
      : "";

  const alternates: string[] = [];
  if (plan.outerwearAlt) {
    const price = typeof plan.outerwearAlt.price === "number" ? formatCurrency(plan.outerwearAlt.price, plan.outerwearAlt.currency ?? currency) : `${plan.outerwearAlt.currency ?? currency} —`;
    alternates.push(
      `Outerwear save: ${plan.outerwearAlt.brand ?? ""} ${plan.outerwearAlt.title ?? ""} — ${price} at ${plan.outerwearAlt.retailer ?? safeHost(plan.outerwearAlt.url)} → ${plan.outerwearAlt.url}`
    );
  }
  if (plan.shoesAlt) {
    const price = typeof plan.shoesAlt.price === "number" ? formatCurrency(plan.shoesAlt.price, plan.shoesAlt.currency ?? currency) : `${plan.shoesAlt.currency ?? currency} —`;
    alternates.push(
      `Shoes save: ${plan.shoesAlt.brand ?? ""} ${plan.shoesAlt.title ?? ""} — ${price} at ${plan.shoesAlt.retailer ?? safeHost(plan.shoesAlt.url)} → ${plan.shoesAlt.url}`
    );
  }

  const accessoriesLines = plan.accessories
    .map((item, index) => {
      const price = typeof item.price === "number" ? formatCurrency(item.price, item.currency ?? currency) : `${item.currency ?? currency} —`;
      const retailer = item.retailer ?? safeHost(item.url);
      const why = describeFit("accessories", prefs);
      const image = item.imageUrl ? ` (Image: ${item.imageUrl})` : "";
      return `Accessory ${index + 1}: ${item.brand ?? ""} ${item.title ?? ""} — ${price} at ${retailer} → ${item.url}${image}\n  Why: ${why}`;
    })
    .map((line) => `${line}`);

  const outfitLines = [
    formatProductLine("Top", plan.top, prefs, currency),
    formatProductLine("Bottom", plan.bottom, prefs, currency),
    formatProductLine("Dress", plan.dress, prefs, currency),
    formatProductLine("Outerwear", plan.outerwear, prefs, currency),
    formatProductLine("Shoes", plan.shoes, prefs, currency),
    formatProductLine("Bag", plan.bag, prefs, currency),
    ...accessoriesLines,
  ]
    .filter(Boolean)
    .map((line) => line as string);

  return [
    "Vibe: Polished silhouettes in ready-to-wear rotation.",
    bodyFocus,
    muse,
    "",
    "Outfit:",
    ...outfitLines,
    "",
    totalLine,
    budgetLine,
    "",
    "Alternates:",
    alternates.length ? alternates.join("\n") : "Outerwear save: still sourcing • Shoes save: still sourcing",
    "",
    "Capsule & Tips:",
    "- Remix the top with your favourite vintage denim and slingbacks for a curated brunch moment.",
    "- Layer the outerwear over a slip dress for night, swapping in the save boots for a lighter feel.",
    "- Tip: tailor the hem to hit just at the ankle so the leg reads mile-long.",
    "- Tip: echo jewellery hardware with your bag to keep the palette luxe and intentional.",
    "",
    "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
  ]
    .filter(Boolean)
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

function preferEU(country?: string): boolean {
  if (!country) return true;
  const upper = country.toUpperCase();
  return !["US", "CA", "AU"].includes(upper);
}

async function loadProducts(
  ask: string,
  prefs: NormalizedPrefs,
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
      16_000,
      "product-search-timeout"
    );
    if (items.length) return items;
  } catch (error) {
    console.warn("[RunwayTwin] product search failed", error);
  }

  try {
    const fallback = await legacySearchProducts({
      query: "classic trench coat black loafers sleek tote neutral knit",
      country,
      currency,
      limit: 8,
      preferEU: preferEU(prefs.country),
    });
    return fallback;
  } catch (error) {
    console.warn("[RunwayTwin] fallback search failed", error);
    return [];
  }
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
  const normalizedPrefs = normalizePreferences(body?.preferences || {});

  const history: ChatMessage[] = rawMessages
    .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant"))
    .map((msg) => ({ role: msg.role, content: msg.content })) as ChatMessage[];

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
    { role: "system", content: prefsToSystem(normalizedPrefs) },
    ...history,
  ];

  if (finalUser && finalUser.role === "user") {
    baseMessages.push({ role: "user", content: finalUser.content });
  }

  const ask = lastUserText(baseMessages);
  const currency = currencyForPrefs(normalizedPrefs);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      send(controller, "ready", { ok: true });
      const keepAlive = setInterval(() => send(controller, "ping", { t: Date.now() }), 15_000);

      const productPromise = loadProducts(ask, normalizedPrefs, currency);
      let resolvedProducts: Product[] = [];

      try {
        const greet = "Hi! I’m your celebrity stylist—assembling a head-to-toe look with linked pieces and fit intel.";
        const briefParts = [
          normalizedPrefs.bodyType,
          normalizedPrefs.styleKeywordsText,
          ask,
        ].filter(Boolean);
        const budgetNote = normalizedPrefs.budgetLabel
          ? `budget ${normalizedPrefs.budgetLabel}`
          : normalizedPrefs.budgetValue
          ? `budget ~${Math.round(normalizedPrefs.budgetValue)} ${currency}`
          : null;
        if (budgetNote) briefParts.push(budgetNote);
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
        const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

        if (!OPENAI_API_KEY) {
          const fallback = fallbackCopy(resolvedProducts, currency, ask, normalizedPrefs);
          send(controller, "assistant_final", { text: fallback });
          send(controller, "done", { ok: false, reason: "missing-openai" });
          return;
        }

        const productBlock = `Candidate Products:\n${bulletsFromProducts(resolvedProducts.slice(0, 10))}`;
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

        const adapterContext: AdapterContext = { preferences: normalizedPrefs };

        const firstPassMessages: ChatMessage[] = [
          ...baseMessages,
          { role: "system", content: rules },
          { role: "system", content: productBlock },
        ];

        const firstPass = await streamChatCompletion(firstPassMessages, MODEL, OPENAI_API_KEY, {
          onTextDelta: (text) => {
            send(controller, "assistant_delta", { text });
          },
          onToolCall: (call) => {
            send(controller, "tool_call", {
              id: call.id,
              name: call.name,
            });
          },
        });

        let finalText = firstPass.text.trim();
        const toolCalls = firstPass.toolCalls;

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

          finalText = await openaiComplete(secondPassMessages, MODEL, OPENAI_API_KEY);
        }

        if (!finalText || !finalText.trim()) {
          finalText = fallbackCopy(resolvedProducts, currency, ask, normalizedPrefs);
        }

        send(controller, "assistant_final", { text: finalText });
        send(controller, "done", { ok: true });
      } catch (error) {
        console.error("[RunwayTwin] route fatal", error);
        const safeProducts = resolvedProducts.length ? resolvedProducts : await productPromise.catch(() => []);
        const fallback = fallbackCopy(safeProducts, currency, ask, normalizedPrefs);
        send(controller, "error", { message: "stylist_error", detail: String(error) });
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
