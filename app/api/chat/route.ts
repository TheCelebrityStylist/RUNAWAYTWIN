import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { STYLIST_SYSTEM_PROMPT } from "./systemPrompt";
import { toolSchemas, runTool, searchProducts } from "./tools";
import type { Product } from "./tools/types";
import { getSession } from "@/lib/auth/session";
import { getUserById, updateUser, type UserRecord } from "@/lib/storage/user";
import { appendHistory } from "@/lib/storage/history";
import { mergePreferences } from "@/lib/preferences/utils";
import type { Preferences } from "@/lib/preferences/types";
import { normalizeMessage, type ChatMessageRecord } from "@/lib/chat/types";

export const runtime = "edge";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const HAS_OPENAI = !!process.env.OPENAI_API_KEY;
const GUEST_COOKIE = "rt_guest_free";

/** ---------- Types & helpers ---------- */

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string | any }
  | { role: "tool"; tool_call_id: string; content: string };

type ToolCallDelta = {
  id?: string;
  function?: { name?: string; arguments?: string };
  type?: "function";
  index?: number;
};

function sse(event: string, data: unknown) {
  return `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
}

function safeJSON(payload: string) {
  try {
    return JSON.parse(payload || "{}");
  } catch {
    return {};
  }
}

function flattenContent(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((entry) => flattenContent(entry)).join("");
  }
  if (typeof content === "object") {
    if (typeof content.text === "string") return content.text;
    if (typeof content.value === "string") return content.value;
    if (Array.isArray(content.content)) return flattenContent(content.content);
  }
  return "";
}

function prefsToSystem(prefs: Preferences) {
  const sizes = Object.entries(prefs.sizes || {})
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
  const styleKeywords = Array.isArray(prefs.styleKeywords) ? prefs.styleKeywords.join(", ") : "";
  return [
    `### USER PROFILE`,
    `Gender: ${prefs.gender || "unspecified"}`,
    `Sizes: ${sizes || "n/a"}`,
    `Body type: ${prefs.bodyType || "n/a"}`,
    `Height/Weight: ${(prefs as any).height || "-"} / ${(prefs as any).weight || "-"}`,
    `Budget: ${prefs.budget || "n/a"}`,
    `Country: ${prefs.country || "n/a"}`,
    `Style keywords: ${styleKeywords || "n/a"}`,
    ``,
    `### OUTPUT CHECKLIST`,
    `• Deliver Top + Bottom (or Dress), Outerwear, Shoes, Bag, and 1–2 accessories.`,
    `• Each item must include brand, exact item name, price + currency, retailer, working link, and image when available.`,
    `• Explain fit logic for the user's body type (rise, drape, neckline, hem, fabrication, proportion).`,
    `• Respect budget; show total and provide a save-focused alternate if the look exceeds it.`,
    `• Always include alternates for shoes and outerwear with links.`,
    `• Close with the upsell line verbatim.`,
  ].join("\n");
}

function resolvePreferences(userPrefs: Preferences | undefined, incoming: any): Preferences {
  const override: Partial<Preferences> = typeof incoming === "object" && incoming
    ? {
        ...incoming,
        sizes: { ...(incoming.sizes || {}) },
        styleKeywords: Array.isArray(incoming.styleKeywords)
          ? incoming.styleKeywords.filter((word: unknown) => typeof word === "string")
          : undefined,
      }
    : {};
  return mergePreferences(userPrefs, override);
}

type UsageTicket = {
  allowed: boolean;
  reason?: string;
  refund?: () => Promise<void>;
  label?: "free" | "credit" | "subscription" | "guest" | "member";
};

type UsageOutcome = {
  ticket: UsageTicket;
  user: UserRecord | null;
  setCookie?: string | null;
};

function currentTicketLabel(user: UserRecord | null): UsageTicket["label"] {
  if (!user) return "guest";
  if (user.subscriptionActive) return "subscription";
  if (user.lookCredits > 0) return "credit";
  if (!user.freeLookUsed) return "free";
  return "member";
}

async function reserveUsage(
  user: UserRecord | null,
  guestCookie: string | undefined,
  options: { continuation: boolean }
): Promise<UsageOutcome> {
  const { continuation } = options;

  if (continuation) {
    return {
      ticket: { allowed: true, label: currentTicketLabel(user) },
      user,
    };
  }

  if (user) {
    if (user.subscriptionActive) {
      return { ticket: { allowed: true, label: "subscription" }, user };
    }
    if (!user.freeLookUsed) {
      const updated = await updateUser(user.id, { freeLookUsed: true });
      return {
        ticket: {
          allowed: true,
          label: "free",
          refund: async () => {
            await updateUser(user.id, { freeLookUsed: false });
          },
        },
        user: updated,
      };
    }
    if (user.lookCredits > 0) {
      const before = user.lookCredits;
      const updated = await updateUser(user.id, { lookCredits: before - 1, plan: "per_look" });
      return {
        ticket: {
          allowed: true,
          label: "credit",
          refund: async () => {
            await updateUser(user.id, { lookCredits: before });
          },
        },
        user: updated,
      };
    }
    return {
      ticket: {
        allowed: false,
        reason: "You’ve used your looks. Grab a one-off look for $5 or go unlimited for $19/mo.",
      },
      user,
    };
  }

  if (!guestCookie) {
    const maxAge = 60 * 60 * 24 * 365;
    return {
      ticket: { allowed: true, label: "guest" },
      user: null,
      setCookie: `${GUEST_COOKIE}=1; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
    };
  }

  return {
    ticket: {
      allowed: false,
      reason: "Create a free account to unlock your saved looks and continue styling.",
    },
    user: null,
  };
}

function lastUserText(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const entry = messages[i];
    if (entry?.role !== "user") continue;
    if (typeof entry.content === "string") return entry.content;
    if (Array.isArray(entry.content)) {
      const textPart = entry.content.find((part: any) => part?.type === "text");
      if (textPart?.text) return textPart.text;
    }
  }
  return "";
}

function currencyFor(preferences: Preferences | undefined): string {
  const raw = typeof (preferences as any)?.currency === "string" ? (preferences as any).currency : "";
  if (raw) return raw.toUpperCase();
  const country = (preferences?.country || "").toUpperCase();
  switch (country) {
    case "US":
      return "USD";
    case "UK":
    case "GB":
      return "GBP";
    case "CA":
      return "CAD";
    case "AU":
      return "AUD";
    case "JP":
      return "JPY";
    case "CH":
      return "CHF";
    case "SE":
      return "SEK";
    case "NO":
      return "NOK";
    case "DK":
      return "DKK";
    case "AE":
      return "AED";
    case "SG":
      return "SGD";
    default:
      return "EUR";
  }
}

function parseBudgetNumber(preferences: Preferences | undefined): number | null {
  const raw = (preferences as any)?.budget;
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const cleaned = String(raw).replace(/[^0-9.,]/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeHost(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function formatPriceDisplay(product: Product | null | undefined, fallbackCurrency: string): string {
  if (!product) return "price on request";
  const currency = product.currency || fallbackCurrency;
  const price = typeof product.price === "number" && Number.isFinite(product.price) ? product.price : null;
  if (price === null) return `${currency} —`;
  const formatted = Math.round(price).toLocaleString("en-US");
  return `${currency} ${formatted}`;
}

function formatProductLine(label: string, product: Product | null, currency: string): string {
  if (!product) {
    return `- ${label} — scouting live options`;
  }
  const brand = product.brand || "";
  const title = product.title || "";
  const retailer = product.retailer || safeHost(product.url) || "Retailer";
  const price = formatPriceDisplay(product, currency);
  const image = product.imageUrl ? ` · Image: ${product.imageUrl}` : "";
  return `- ${label} — ${brand} ${title} (${price}, ${retailer}) · ${product.url}${image}`;
}

function productDisplayName(product: Product | null | undefined): string {
  if (!product) return "";
  const brand = product.brand || "";
  const title = product.title || "";
  return [brand, title].filter(Boolean).join(" ");
}

function buildSearchQuery(preferences: Preferences, userText: string): string {
  const keywords = Array.isArray(preferences.styleKeywords) ? preferences.styleKeywords : [];
  const muse = userText.trim();
  const gender = preferences.gender && preferences.gender !== "unspecified" ? preferences.gender : "";
  const palette = keywords.slice(0, 3).join(" ");
  const parts = [muse, palette, gender].filter(Boolean);
  if (parts.length) {
    return parts.join(" | ");
  }
  return "elevated modern tailoring with luxe textures";
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

type WarmProductResult = { items: Product[]; preview: string; source: string; query: string };

async function warmProductScout(preferences: Preferences, userText: string): Promise<WarmProductResult> {
  const currency = currencyFor(preferences);
  const query = buildSearchQuery(preferences, userText);
  const budgetMax = parseBudgetNumber(preferences) ?? undefined;
  try {
    const result = await searchProducts(
      {
        query,
        country: preferences.country || undefined,
        currency,
        budgetMax,
        limit: 12,
      },
      { preferences }
    );
    const items = Array.isArray(result?.items) ? result!.items : [];
    return {
      items,
      source: result?.source || "adapters",
      query: result?.query || query,
      preview: buildDraftPreview(items, currency),
    };
  } catch (error) {
    console.error("warmProductScout error", error);
    return { items: [], source: "error", query, preview: "" };
  }
}

const BODY_NOTES: Record<string, string[]> = {
  hourglass: [
    "High-rise tailoring locks in the waist while mirrored shoulder structure keeps curves sculpted.",
    "Fluid fabrics glide over the hip so nothing clings where it shouldn’t.",
  ],
  pear: [
    "A strong shoulder and elongated outerwear lift the eye upward while trousers skim the hip.",
    "Slight tapering at the ankle and pointed footwear lengthen the leg line.",
  ],
  rectangle: [
    "Waist detailing and curved necklines carve definition through the torso.",
    "Layered textures and tailored hems create shape without bulk.",
  ],
  apple: [
    "Columnar layers and soft drape skim the midsection for a smooth line.",
    "Deep necklines and vertical seaming pull the gaze lengthwise.",
  ],
  "inverted-triangle": [
    "Volume through the trouser and fluid hems temper broader shoulders.",
    "Soft knit textures balance the top block so proportions feel effortless.",
  ],
  petite: [
    "Cropped silhouettes and tonal dressing elongate without overwhelming scale.",
    "Sleek footwear maintains one unbroken line from hip to toe.",
  ],
  tall: [
    "Defined waistlines and layered textures add rhythm to a long frame.",
    "Tailored outerwear with venting keeps stride ease without excess volume.",
  ],
  plus: [
    "Strategic shaping at the waist defines curves without cling.",
    "Vertical seams and structured footwear elongate the silhouette.",
  ],
};

function bodyNotesFor(bodyType: string | undefined): string[] {
  if (!bodyType) {
    return [
      "Balanced proportions and controlled layers elongate the frame.",
      "Texture play keeps the look intentional while flattering natural lines.",
    ];
  }
  const key = bodyType.toLowerCase();
  return BODY_NOTES[key] || [
    "Balanced proportions and controlled layers elongate the frame.",
    "Texture play keeps the look intentional while flattering natural lines.",
  ];
}

function buildDraftIntro(preferences: Preferences, userText: string): string {
  const keywords = Array.isArray(preferences.styleKeywords) ? preferences.styleKeywords.slice(0, 3) : [];
  const mood = keywords.length ? `Moodboard: ${keywords.join(" · ")}.` : "Moodboard: couture-polished essentials.";
  const body = preferences.bodyType ? `Body focus: ${preferences.bodyType}.` : "";
  const budget = preferences.budget ? `Budget guardrail: ${preferences.budget}.` : "";
  const brief = userText ? `Brief: “${userText}”.` : "Cue up your muse, venue, and climate when you’re ready.";
  return [
    "Hey — I’m already pulling from live boutiques.",
    mood,
    [body, budget].filter(Boolean).join(" "),
    brief,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDraftPreview(products: Product[], currency: string): string {
  if (!products.length) {
    return "Sourcing pieces from partner boutiques…";
  }
  const lines = products.slice(0, 3).map((item) => {
    const price = formatPriceDisplay(item, currency);
    return `• ${item.brand} ${item.title} (${price})`;
  });
  return ["First finds:", ...lines, ""].join("\n");
}

const CATEGORY_PATTERNS = {
  dress: [/dress/i, /gown/i, /slip/i, /caftan/i],
  top: [/top/i, /blouse/i, /shirt/i, /bodysuit/i, /camisole/i, /knit/i, /sweater/i, /tee/i, /corset/i, /bustier/i],
  bottom: [/pant/i, /trouser/i, /skirt/i, /jean/i, /denim/i, /culotte/i, /short/i, /cargo/i, /legging/i],
  outerwear: [/coat/i, /jacket/i, /trench/i, /blazer/i, /cape/i, /puffer/i, /overcoat/i],
  shoes: [/boot/i, /sandal/i, /heel/i, /loafer/i, /sneaker/i, /pump/i, /flat/i, /mule/i, /stiletto/i],
  bag: [/bag/i, /clutch/i, /tote/i, /satchel/i, /pouch/i, /crossbody/i, /hobo/i, /backpack/i, /bucket/i],
  accessory: [/earring/i, /necklace/i, /bracelet/i, /ring/i, /belt/i, /scarf/i, /hat/i, /sunglass/i, /watch/i, /brooch/i, /cuff/i, /hair/i, /pin/i, /glove/i],
};

function matchesCategory(product: Product, patterns: RegExp[]): boolean {
  const haystack = `${product.title || ""} ${product.category || ""} ${product.description || ""}`;
  return patterns.some((regex) => regex.test(haystack));
}

function takeMatching(products: Product[], used: Set<number>, patterns: RegExp[]): Product | null {
  for (let i = 0; i < products.length; i++) {
    if (used.has(i)) continue;
    const product = products[i];
    if (matchesCategory(product, patterns)) {
      used.add(i);
      return product;
    }
  }
  return null;
}

function takeAny(products: Product[], used: Set<number>): Product | null {
  for (let i = 0; i < products.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    return products[i];
  }
  return null;
}

function findAlternate(
  products: Product[],
  primary: Set<number>,
  altUsed: Set<number>,
  patterns: RegExp[]
): Product | null {
  for (let i = 0; i < products.length; i++) {
    if (primary.has(i) || altUsed.has(i)) continue;
    if (matchesCategory(products[i], patterns)) {
      altUsed.add(i);
      return products[i];
    }
  }
  return null;
}

function takeAnyAlternate(products: Product[], primary: Set<number>, altUsed: Set<number>): Product | null {
  for (let i = 0; i < products.length; i++) {
    if (primary.has(i) || altUsed.has(i)) continue;
    altUsed.add(i);
    return products[i];
  }
  return null;
}

function composeFallbackFromProducts(products: Product[], preferences: Preferences, userText: string): string {
  const currency = currencyFor(preferences);
  if (!products.length) {
    const lines = [
      "I’m scouting live inventory for you — give me a second and tap again for a refreshed look.",
      userText ? `Brief: “${userText}”` : "",
      "",
      "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
    ].filter(Boolean);
    return lines.join("\n");
  }

  const used = new Set<number>();
  const dress = takeMatching(products, used, CATEGORY_PATTERNS.dress);
  let top: Product | null = null;
  let bottom: Product | null = null;
  if (!dress) {
    top = takeMatching(products, used, CATEGORY_PATTERNS.top) || takeAny(products, used);
    bottom = takeMatching(products, used, CATEGORY_PATTERNS.bottom) || takeAny(products, used);
  }
  const outerwear = takeMatching(products, used, CATEGORY_PATTERNS.outerwear) || takeAny(products, used);
  const shoes = takeMatching(products, used, CATEGORY_PATTERNS.shoes) || takeAny(products, used);
  const bag = takeMatching(products, used, CATEGORY_PATTERNS.bag) || takeAny(products, used);
  const accessory = takeMatching(products, used, CATEGORY_PATTERNS.accessory) || takeAny(products, used);

  const primaryEntries = dress
    ? [
        { label: "Dress", product: dress },
        { label: "Outerwear", product: outerwear },
        { label: "Shoes", product: shoes },
        { label: "Bag", product: bag },
        { label: "Accessories", product: accessory },
      ]
    : [
        { label: "Top", product: top },
        { label: "Bottom", product: bottom },
        { label: "Outerwear", product: outerwear },
        { label: "Shoes", product: shoes },
        { label: "Bag", product: bag },
        { label: "Accessories", product: accessory },
      ];

  const totalAmount = primaryEntries.reduce((sum, entry) => {
    const price = entry.product?.price;
    return typeof price === "number" && Number.isFinite(price) ? sum + price : sum;
  }, 0);
  const total =
    totalAmount > 0 ? `${currency} ${Math.round(totalAmount).toLocaleString("en-US")}` : "mixed currency";

  const budgetNumber = parseBudgetNumber(preferences);
  const budgetLine = budgetNumber
    ? `Budget: approx ${total} vs your ${preferences.budget}.`
    : `Budget: approx ${total}.`;

  const primaryIndices = new Set<number>(used);
  const altUsed = new Set<number>();
  const altOuterwear =
    findAlternate(products, primaryIndices, altUsed, CATEGORY_PATTERNS.outerwear) ||
    takeAnyAlternate(products, primaryIndices, altUsed);
  const altShoes =
    findAlternate(products, primaryIndices, altUsed, CATEGORY_PATTERNS.shoes) ||
    takeAnyAlternate(products, primaryIndices, altUsed);
  const extraAlt = takeAnyAlternate(products, primaryIndices, altUsed);

  const alternates: string[] = [];
  if (altOuterwear) {
    alternates.push(formatProductLine("Outerwear Alternate", altOuterwear, currency));
  }
  if (altShoes) {
    alternates.push(formatProductLine("Shoes Alternate", altShoes, currency));
  }
  if (extraAlt) {
    alternates.push(formatProductLine("Accessory Alternate", extraAlt, currency));
  }
  if (!alternates.length) {
    alternates.push("- More alternates incoming as stock updates.");
  }

  const bodyNotes = bodyNotesFor(preferences.bodyType);

  const capsule: string[] = [];
  const topName = productDisplayName(top);
  const bottomName = productDisplayName(bottom);
  const dressName = productDisplayName(dress);
  const shoesName = productDisplayName(shoes);
  const outerName = productDisplayName(outerwear);
  const bagName = productDisplayName(bag);

  if (topName && bottomName) {
    capsule.push(`Style the ${topName} with relaxed denim and keep the ${bagName || "bag"} for effortless days off.`);
  }
  if (dressName && outerName) {
    capsule.push(`Layer the ${outerName} over the ${dressName} with strappy heels for evening polish.`);
  }
  if (outerName && shoesName) {
    capsule.push(`Throw the ${outerName} over monochrome separates and the ${shoesName} for travel-ready chic.`);
  }
  while (capsule.length < 2) {
    capsule.push("Rotate the outerwear over tailored denim and a knit for an instant uniform.");
  }

  const tips = [
    "Tailor hems so they skim the shoe vamp for an unbroken leg line.",
    "Steam outer layers and brush suede to keep the set pristine between wears.",
  ];

  const saveLine = budgetNumber && totalAmount > budgetNumber && altShoes
    ? `Save option: swap to ${productDisplayName(altShoes)} (${formatPriceDisplay(altShoes, currency)}) to dip under budget.`
    : "";

  const lines: string[] = [];
  lines.push("Consider this a polished preview while I finalize your bespoke notes.");
  lines.push("");
  lines.push("Outfit:");
  lines.push(...primaryEntries.map((entry) => formatProductLine(entry.label, entry.product ?? null, currency)));
  lines.push("");
  lines.push("Body Notes:");
  lines.push(...bodyNotes.map((note) => `- ${note}`));
  lines.push("");
  lines.push(budgetLine);
  if (saveLine) {
    lines.push(saveLine);
  }
  lines.push("");
  lines.push("Alternates:");
  lines.push(...alternates);
  lines.push("");
  lines.push("Capsule & Tips:");
  lines.push(...capsule.map((idea) => `- ${idea}`));
  lines.push(...tips.map((tip) => `- Tip: ${tip}`));
  if (userText) {
    lines.push("");
    lines.push(`Brief: “${userText}”`);
  }
  lines.push("");
  lines.push("Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎");
  return lines.join("\n");
}

function buildCandidateBlock(products: Product[], currency: string, meta?: { source?: string; query?: string }) {
  if (!products.length) return "";
  const lines = products.slice(0, 12).map((item) => {
    const retailer = item.retailer || safeHost(item.url) || "Retailer";
    return `- ${item.brand} — ${item.title} | ${formatPriceDisplay(item, currency)} | ${retailer} | ${item.url} | ${item.imageUrl || ""}`;
  });
  const header = meta?.query ? `Candidate Products for “${meta.query}”` : "Candidate Products";
  const suffix = meta?.source ? `\nSource: ${meta.source}` : "";
  return `${header}:\n${lines.join("\n")}${suffix}`;
}

async function* openaiStream(body: any) {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`OpenAI HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    carry += chunk;
    while (true) {
      const idx = carry.indexOf("\n\n");
      if (idx === -1) break;
      const raw = carry.slice(0, idx);
      carry = carry.slice(idx + 2);
      const lines = raw.split("\n").filter((line) => line.startsWith("data: "));
      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          yield { done: true };
          return;
        }
        if (!data) continue;
        try {
          yield JSON.parse(data);
        } catch {
          // ignore malformed keep-alives
        }
      }
    }
  }
}

/** ---------- Route ---------- */

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const rawMessages = Array.isArray(payload?.messages) ? payload.messages : [];
  const finalUser = payload?.finalUser;
  const incomingPrefs = payload?.preferences;

  const chatMessages: ChatMessage[] = [...rawMessages];
  if (finalUser) {
    chatMessages.push(finalUser);
  }
  const userText = lastUserText(chatMessages);

  const cookieStore = cookies();
  const guestCookie = cookieStore.get(GUEST_COOKIE)?.value;
  const session = await getSession();
  let userRecord = session?.uid ? await getUserById(session.uid) : null;

  const hasHistory = rawMessages.length > 0;
  const usageOutcome = await reserveUsage(userRecord, guestCookie, { continuation: hasHistory });
  const { ticket } = usageOutcome;
  if (usageOutcome.user) {
    userRecord = usageOutcome.user;
  }

  const preferences: Preferences = resolvePreferences(userRecord?.preferences, incomingPrefs);

  const personaMessage: ChatMessage = {
    role: "system",
    content:
      `You are "The Ultimate Celebrity Stylist AI": warm, premium, aspirational, concise. ` +
      `Detect celebrity muses, occasions, climate, and palette cues without repeating questions. ` +
      `Use only tool-sourced links and images. Keep tone editorial yet efficient. ` +
      `Close every final answer with: "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎"`,
  };

  const baseMessages: ChatMessage[] = [
    { role: "system", content: STYLIST_SYSTEM_PROMPT },
    personaMessage,
    { role: "system", content: prefsToSystem(preferences) },
    ...chatMessages,
  ];

  if (!ticket.allowed) {
    const reason = ticket.reason || "Upgrade to unlock more looks.";
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sse("ready", { ok: true }));
        controller.enqueue(sse("assistant_final", { text: reason }));
        controller.enqueue(sse("done", { ok: false }));
        controller.close();
      },
    });
    const headers = new Headers({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    if (usageOutcome.setCookie) {
      headers.append("Set-Cookie", usageOutcome.setCookie);
    }
    return new Response(stream, { status: 200, headers });
  }

  const historyRecords: ChatMessageRecord[] = [];
  if (userRecord && userText) {
    historyRecords.push(
      normalizeMessage({
        role: "user",
        content: userText,
        meta: { ticket: ticket.label, preferences },
      })
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse("ready", { ok: true }));
      const statusText = (() => {
        if (!ticket.label) return null;
        if (ticket.label === "subscription") return "Unlimited plan active — concierge styling unlocked.";
        if (ticket.label === "credit") {
          const remaining = typeof userRecord?.lookCredits === "number" ? userRecord.lookCredits : null;
          return remaining !== null
            ? `One look credit applied. ${remaining} remaining.`
            : "One look credit applied.";
        }
        if (ticket.label === "free") return "Welcome look unlocked — let’s dress you.";
        if (ticket.label === "guest") return "Guest look unlocked. Create an account to save it.";
        if (ticket.label === "member") return "Continuing your look — ask for swaps or alternates anytime.";
        return null;
      })();
      if (!hasHistory && statusText) {
        controller.enqueue(sse("notice", { text: statusText }));
      }

      const pinger = setInterval(() => controller.enqueue(sse("ping", { t: Date.now() })), 15_000);
      let finalDelivered = false;

      const finalize = async (ok: boolean, finalText: string) => {
        if (finalDelivered) return;
        finalDelivered = true;
        if (ok && userRecord && historyRecords.length) {
          const trimmed = finalText.trim();
          if (trimmed) {
            historyRecords.push(
              normalizeMessage({
                role: "assistant",
                content: trimmed,
              })
            );
          }
          try {
            await appendHistory(userRecord.id, historyRecords);
          } catch (error) {
            console.error("history append failed", error);
          }
        } else if (!ok && ticket.refund) {
          try {
            await ticket.refund();
          } catch (error) {
            console.error("usage refund failed", error);
          }
        }
      };

      const end = async (ok = true, finalText = "") => {
        await finalize(ok, finalText);
        try {
          controller.enqueue(sse("done", { ok }));
        } catch {
          // ignore
        }
        clearInterval(pinger);
        controller.close();
      };

      const draftIntro = buildDraftIntro(preferences, userText);
      controller.enqueue(sse("assistant_draft_delta", { text: draftIntro }));

      let warmedProducts: Product[] = [];
      let candidateBlock = "";
      try {
        const warmed = await withTimeout(warmProductScout(preferences, userText), 12_000, "product-warmup-timeout");
        warmedProducts = warmed.items;
        candidateBlock = buildCandidateBlock(warmed.items, currencyFor(preferences), {
          source: warmed.source,
          query: warmed.query,
        });
        if (warmed.preview) {
          controller.enqueue(sse("assistant_draft_delta", { text: warmed.preview }));
        }
      } catch (error) {
        console.error("warm scout failed", error);
      } finally {
        controller.enqueue(sse("assistant_draft_done", {}));
      }

      if (!HAS_OPENAI) {
        const fallback = composeFallbackFromProducts(warmedProducts, preferences, userText);
        controller.enqueue(sse("assistant_final", { text: fallback }));
        await end(true, fallback);
        return;
      }

      const tools = (toolSchemas || []).map((fn) => ({
        type: "function",
        function: { name: fn.name, description: fn.description, parameters: fn.schema },
      }));

      const toolCalls: Record<string, { name: string; arguments: string }> = {};
      let accText = "";

      const modelMessages = candidateBlock
        ? [...baseMessages, { role: "system", content: candidateBlock }]
        : [...baseMessages];

      try {
        for await (const evt of openaiStream({
          model: "gpt-4o-mini",
          temperature: 0.7,
          stream: true,
          tool_choice: "auto",
          tools,
          messages: modelMessages,
        })) {
          const choice = (evt as any).choices?.[0];
          if (!choice) continue;

          const delta = choice.delta || {};
          const chunkText = flattenContent(delta.content);
          if (chunkText) {
            accText += chunkText;
            controller.enqueue(sse("assistant_delta", { text: chunkText }));
          }

          const tcs = delta.tool_calls as ToolCallDelta[] | undefined;
          if (tcs?.length) {
            for (const call of tcs) {
              const index = typeof call.index === "number" ? call.index : undefined;
              const id = call.id || (index !== undefined ? `call_${index}` : `call_${Object.keys(toolCalls).length}`);
              const name = call.function?.name || toolCalls[id]?.name || "unknown";
              const argsChunk = call.function?.arguments || "";
              const existing = toolCalls[id];
              toolCalls[id] = {
                name,
                arguments: (existing?.arguments || "") + argsChunk,
              };
            }
          }

          if (choice.finish_reason) break;
        }
      } catch (error) {
        console.error("stream error", error);
        const fallback = composeFallbackFromProducts(warmedProducts, preferences, userText);
        controller.enqueue(sse("assistant_final", { text: fallback }));
        await end(false, fallback);
        return;
      }

      const toolEntries = Object.entries(toolCalls);
      if (toolEntries.length) {
        const toolMsgs: ChatMessage[] = [];
        for (const [id, meta] of toolEntries) {
          const args = safeJSON(meta.arguments);
          controller.enqueue(sse("tool_call", { id, name: meta.name, args }));
          try {
            const result = await runTool(meta.name, args, { preferences });
            controller.enqueue(sse("tool_result", { id, ok: true, result }));
            toolMsgs.push({ role: "tool", tool_call_id: id, content: JSON.stringify(result) });
          } catch (error: any) {
            console.error(`tool ${meta.name} failed`, error);
            controller.enqueue(sse("tool_result", { id, ok: false, error: error?.message || "Tool error" }));
            toolMsgs.push({ role: "tool", tool_call_id: id, content: JSON.stringify({ error: "Tool error" }) });
          }
        }

        try {
          const res = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              temperature: 0.4,
              stream: false,
              messages: [
                ...modelMessages,
                { role: "assistant", content: accText },
                ...toolMsgs,
                {
                  role: "system",
                  content: [
                    "Refine the assistant answer with this checklist:",
                    "1) Every item lists brand, exact item name, price, currency, retailer, link, and image (if available).",
                    "2) Fit notes mention rise, drape, neckline, hem, fabrication, and proportion adjustments for the body type.",
                    "3) Respect budget; include total and a save-focused alternate if over budget.",
                    "4) Provide alternates for shoes and outerwear with links.",
                    "5) Add 'Capsule & Tips' with 2–3 remix ideas plus 2 concise tips.",
                    "6) Never invent links — only use tool or candidate URLs.",
                    "7) Close with the upsell line verbatim.",
                  ].join("\n"),
                },
              ],
            }),
          });
          if (!res.ok) {
            throw new Error(`OpenAI final HTTP ${res.status}`);
          }
          const json = await res.json();
          const finalMessage = json?.choices?.[0]?.message;
          const finalText = flattenContent(finalMessage?.content) || composeFallbackFromProducts(warmedProducts, preferences, userText);
          controller.enqueue(sse("assistant_final", { text: finalText }));
          await end(true, finalText);
          return;
        } catch (error) {
          console.error("final compose error", error);
          const fallback = composeFallbackFromProducts(warmedProducts, preferences, userText);
          controller.enqueue(sse("assistant_final", { text: fallback }));
          await end(false, fallback);
          return;
        }
      }

      const finalOutput = accText.trim()
        ? accText
        : composeFallbackFromProducts(warmedProducts, preferences, userText);
      controller.enqueue(sse("assistant_final", { text: finalOutput }));
      await end(true, finalOutput);
    },
  });

  const headers = new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  if (usageOutcome.setCookie) {
    headers.append("Set-Cookie", usageOutcome.setCookie);
  }
  return new Response(stream, { status: 200, headers });
}
