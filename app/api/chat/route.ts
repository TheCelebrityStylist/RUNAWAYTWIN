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

type BodyKey = "hourglass" | "pear" | "apple" | "rectangle" | "inverted" | "default";

function bodyKeyFrom(bodyType: string | null): BodyKey {
  const lower = (bodyType || "").toLowerCase();
  if (lower.includes("hourglass")) return "hourglass";
  if (lower.includes("pear")) return "pear";
  if (lower.includes("apple")) return "apple";
  if (lower.includes("rectangle")) return "rectangle";
  if (lower.includes("inverted")) return "inverted";
  return "default";
}

function normalizeMuseName(muse: string | null): string | null {
  if (!muse) return null;
  const lower = muse.toLowerCase();
  if (lower.includes("zendaya")) return "Zendaya";
  if (lower.includes("jennifer") && lower.includes("lawrence")) return "Jennifer Lawrence";
  if (lower.includes("blake") && lower.includes("lively")) return "Blake Lively";
  return muse;
}

function normalizeOccasionLabel(occasion: string | null): string | null {
  if (!occasion) return null;
  const lower = occasion.toLowerCase();
  if (lower.includes("gala") || lower.includes("red carpet")) return "gala";
  if (lower.includes("evening") || lower.includes("cocktail") || lower.includes("night")) return "evening";
  if (lower.includes("work") || lower.includes("office") || lower.includes("boardroom")) return "work";
  if (lower.includes("wedding") || lower.includes("ceremony")) return "event";
  if (lower.includes("party")) return "evening";
  if (lower.includes("travel")) return "travel";
  if (lower.includes("everyday") || lower.includes("daily") || lower.includes("casual") || lower.includes("day"))
    return "everyday";
  return lower.split(/[^a-z]+/)[0] || lower;
}

type CuratedLook = {
  muses: string[];
  occasions: string[];
  hero: {
    top: string;
    bottom: string;
    outerwear: string;
    shoes: string;
    accessories: string;
  };
  alternates: {
    shoes: string;
    outerwear: string;
  };
  save?: { category: string; productId: string }[];
  vibe: string;
  palette: string;
  why: Partial<Record<BodyKey, string[]>>;
  capsule: { remix: string[]; tips: string[] };
};

const CURATED_LOOKS: CuratedLook[] = [
  {
    muses: ["zendaya"],
    occasions: ["gala", "evening"],
    hero: {
      top: "safiyaa-livia-top",
      bottom: "safiyaa-viviana-skirt",
      outerwear: "alex-vauthier-opera-coat",
      shoes: "jimmy-choo-bing-100",
      accessories: "tyler-ellis-perry-clutch",
    },
    alternates: {
      shoes: "amina-muaddi-begum",
      outerwear: "ralph-lauren-velvet-blazer",
    },
    save: [
      { category: "Top", productId: "reformation-olena-top" },
      { category: "Bottom", productId: "reformation-julietta-skirt" },
      { category: "Outerwear", productId: "stories-satin-duster" },
      { category: "Shoes", productId: "schutz-altina-sandal" },
      { category: "Accessories", productId: "cult-gaia-eos-clutch" },
    ],
    vibe: "liquid midnight couture with sculpted lines",
    palette: "inky midnight, molten silver, mirrored crystal",
    why: {
      hourglass: [
        "Corseted neckline frames the shoulders while spotlighting your waist, echoing Zendaya’s red-carpet confidence.",
        "Column maxi skirt pours over curves without bulk so the proportions stay statuesque.",
        "Opera coat adds architectural drama that keeps the silhouette clean yet powerful.",
      ],
      pear: [
        "Off-the-shoulder top broadens the frame and balances fuller hips.",
        "Fluid skirt skims the lower body so the eye lifts to the corseted bodice.",
        "Crystal accessories pull focus upward, elongating the entire line.",
      ],
      default: [
        "Structured tailoring sculpts the torso while the skirt creates liquid movement.",
        "Monochrome palette keeps the silhouette elongated and impossibly sleek.",
        "Statement outerwear mirrors Zendaya’s fearless couture minimalism.",
      ],
    },
    capsule: {
      remix: [
        "Style the corset with high-waisted tuxedo trousers for premieres.",
        "Rework the skirt with a cashmere turtleneck and ankle boots for Paris dinners.",
        "Belt the opera coat over a silk slip dress for winter galas.",
      ],
      tips: [
        "Sweep hair into a sleek bun to let the neckline and earrings shine.",
        "Add soft body shimmer along shoulders for camera-ready light play.",
      ],
    },
  },
  {
    muses: ["jennifer lawrence"],
    occasions: ["everyday", "work"],
    hero: {
      top: "the-row-wesler",
      bottom: "khaite-eddie-trouser",
      outerwear: "the-row-balter-coat",
      shoes: "manolo-bb-70",
      accessories: "loewe-puzzle-tote",
    },
    alternates: {
      shoes: "common-projects-achellea",
      outerwear: "toteme-signature-coat",
    },
    save: [
      { category: "Top", productId: "arket-merino-tee" },
      { category: "Bottom", productId: "arket-wide-leg-trouser" },
      { category: "Outerwear", productId: "cos-wool-wrap-coat" },
      { category: "Shoes", productId: "veja-esplar" },
      { category: "Accessories", productId: "polene-numero-un" },
    ],
    vibe: "understated quiet luxury with clean tailoring",
    palette: "stone, charcoal, soft black",
    why: {
      hourglass: [
        "Merino tee skims the bust while the high-rise trouser locks in your waist with ease.",
        "Fluid coat drops straight from the shoulder so curves stay defined without bulk.",
        "Pointed pump elongates the leg line for effortless everyday polish.",
      ],
      pear: [
        "Structured tee broadens the upper body just enough to balance the hips.",
        "Wide-leg trouser floats over the lower half, keeping the profile long and lean.",
        "Top-handle tote draws the eye upward, echoing Jennifer’s minimalist posture.",
      ],
      rectangle: [
        "Soft merino knit adds gentle shape while the tailored trouser creates a waist.",
        "Belted coat cinches midsection subtly, building quiet curves.",
        "Sculpted accessories add dimension without fuss.",
      ],
      default: [
        "Neutral layers stack to form a vertical column for instant polish.",
        "Mix of textures—merino, wool, calfskin—keeps minimalism luxe.",
        "Footwear and bag mirror Jennifer’s relaxed yet refined city uniform.",
      ],
    },
    capsule: {
      remix: [
        "Swap in raw-hem denim and Common Projects for weekend coffee runs.",
        "Layer the coat over a silk slip dress for gallery evenings.",
        "Half-tuck the tee into a leather midi skirt for smart dinners.",
      ],
      tips: [
        "Keep the palette tonal to maintain Jennifer’s signature quiet luxury vibe.",
        "Steam the trouser crease sharply so the leg stays statuesque all day.",
      ],
    },
  },
];

function matchCuratedLook(muse: string | null, occasion: string | null): CuratedLook | null {
  const museKey = (muse || "").toLowerCase();
  const occKey = normalizeOccasionLabel(occasion);
  for (const look of CURATED_LOOKS) {
    const museOk = !look.muses.length || (museKey && look.muses.includes(museKey));
    const occOk = !look.occasions.length || (occKey && look.occasions.includes(occKey));
    if (museOk && occOk) return look;
  }
  return null;
}

function formatProductLine(category: string, product: Product) {
  const retailer = product.retailer || new URL(product.url).hostname.replace(/^www\./, "");
  const price = product.price != null ? product.price : "?";
  const currency = product.currency ?? "";
  const image = product.imageUrl ?? "N/A";
  return `- ${category}: ${product.brand} — ${product.title} | ${price} ${currency} | ${retailer} | ${product.url} | ${image}`;
}

function formatAlternateLine(category: string, product: Product) {
  const retailer = product.retailer || new URL(product.url).hostname.replace(/^www\./, "");
  const price = product.price != null ? product.price : "?";
  const currency = product.currency ?? "";
  return `- ${category}: ${product.brand} — ${product.title} | ${price} ${currency} | ${retailer} | ${product.url}`;
}

function convertPrice(amount: number, from: string | null | undefined, to: string) {
  if (!Number.isFinite(amount)) return 0;
  if (!from || from.toUpperCase() === to.toUpperCase()) return amount;
  return fxConvert(amount, from.toUpperCase(), to.toUpperCase());
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function buildCuratedPlan({
  look,
  products,
  bodyType,
  bodyKey,
  museName,
  occasion,
  currency,
  budget,
}: {
  look: CuratedLook;
  products: Product[];
  bodyType: string | null;
  bodyKey: BodyKey;
  museName: string | null;
  occasion: string | null;
  currency: string;
  budget?: number | null;
}): string | null {
  const map = new Map<string, Product>();
  for (const p of products) {
    map.set(p.id, p);
    map.set(p.url, p);
  }

  const requiredIds = [
    look.hero.top,
    look.hero.bottom,
    look.hero.outerwear,
    look.hero.shoes,
    look.hero.accessories,
  ];
  const heroes = requiredIds.map((id) => map.get(id));
  if (heroes.some((p) => !p)) return null;
  const [top, bottom, outerwear, shoes, accessories] = heroes as Product[];

  const introMuse = museName ? `${museName}’s` : "your muse’s";
  const occasionLabel = occasion ? occasion.toLowerCase() : "moment";
  const introLine = `For a ${occasionLabel} moment, I’m distilling ${introMuse} ${look.vibe}.`;
  const bodyDetail = bodyType
    ? `It honours your ${bodyType.toLowerCase()} shape so ${describeBodyTypeBenefit(bodyType).replace(/\.$/, "")}.`
    : "Each piece is cut to flatter head-to-toe.";

  const lines: string[] = [];
  lines.push(`${introLine} ${bodyDetail}`.trim());
  lines.push("");
  lines.push("Outfit:");
  lines.push(formatProductLine("Top", top));
  lines.push(formatProductLine("Bottom", bottom));
  lines.push(formatProductLine("Outerwear", outerwear));
  lines.push(formatProductLine("Shoes", shoes));
  lines.push(formatProductLine("Accessories", accessories));
  lines.push("");

  lines.push("Alternates:");
  const altShoes = map.get(look.alternates.shoes);
  const altOuter = map.get(look.alternates.outerwear);
  lines.push(altShoes ? formatAlternateLine("Shoes", altShoes) : "- Shoes: N/A");
  lines.push(altOuter ? formatAlternateLine("Outerwear", altOuter) : "- Outerwear: N/A");
  lines.push("");

  const whyBullets = look.why[bodyKey] || look.why.default || [];
  const enrichedBullets = [...whyBullets];
  if (enrichedBullets.length < 2) {
    enrichedBullets.push(`Each element ${describeBodyTypeBenefit(bodyType)}.`);
  }
  if (enrichedBullets.length < 3) {
    enrichedBullets.push(`The ${look.palette} palette keeps the silhouette fluid and luxe.`);
  }

  lines.push("Why it Flatters:");
  for (const bullet of enrichedBullets.slice(0, 3)) {
    lines.push(`- ${bullet}`);
  }
  lines.push("");

  const targetCurrency = (currency || "EUR").toUpperCase();
  let total = 0;
  for (const product of [top, bottom, outerwear, shoes, accessories]) {
    if (product.price != null) {
      total += convertPrice(product.price, product.currency, targetCurrency);
    }
  }
  const budgetLine = `- Total: ${formatNumber(total)} ${targetCurrency} (Budget: ${
    budget ? `${budget} ${targetCurrency}` : "—"
  })`;
  lines.push("Budget:");
  lines.push(budgetLine);
  lines.push("");

  const needSave = Boolean(budget && total > (budget || 0) && look.save?.length);
  const categories = ["Top", "Bottom", "Outerwear", "Shoes", "Accessories"];
  lines.push("Save Picks:");
  if (needSave && look.save) {
    for (const category of categories) {
      const save = look.save.find((s) => s.category === category);
      if (!save) {
        lines.push(`- ${category}: N/A`);
        continue;
      }
      const prod = map.get(save.productId);
      lines.push(prod ? formatAlternateLine(category, prod) : `- ${category}: N/A`);
    }
  } else {
    for (const category of categories) {
      lines.push(`- ${category}: On budget`);
    }
  }
  lines.push("");

  lines.push("Capsule & Tips:");
  for (const remix of look.capsule.remix.slice(0, 3)) {
    lines.push(`- Remix: ${remix}`);
  }
  for (const tip of look.capsule.tips.slice(0, 2)) {
    lines.push(`- Tip: ${tip}`);
  }
  lines.push("");

  lines.push(
    "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎"
  );

  return lines.join("\n");
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
          limit: 12,
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
          const normalizedMuse = normalizeMuseName(muse);
          const normalizedOccasion = normalizeOccasionLabel(occasion);

          if (!hasBodyType || !hasOccasion) {
            const greetingLine = normalizedMuse
              ? `Hello love — I’m ready to channel ${normalizedMuse}.`
              : "Hello love — I’m poised to tailor your look.";
            const needed = missingParts.join(" & ");
            finalText = [
              greetingLine,
              needed
                ? `Share your ${needed} so I can deliver the full head-to-toe lineup the moment it streams in.`
                : "Give me a touch more direction and I’ll style you instantly.",
              "",
              "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
            ]
              .filter(Boolean)
              .join("\n");
          } else {
            const curated = matchCuratedLook(normalizedMuse, normalizedOccasion);
            const curatedText = curated
              ? buildCuratedPlan({
                  look: curated,
                  products,
                  bodyType,
                  bodyKey: bodyKeyFrom(bodyType),
                  museName: normalizedMuse ?? muse,
                  occasion: normalizedOccasion ?? occasion,
                  currency,
                  budget: preferences.budget ?? null,
                })
              : null;

            if (curatedText) {
              finalText = curatedText;
            } else {
              const greetingLine = muse
                ? `Hello love — here’s an instant ${occasion ?? ""} lineup inspired by ${muse}.`.trim()
                : "Hello love — here’s an instant lineup while I refresh the full catalog.";
              const tot = products.reduce(
                (sum, p) => sum + (typeof p.price === "number" ? p.price : 0),
                0
              );
              const approxTotal = tot > 0 ? Math.round(tot) : null;
              const shoesAlt =
                pickProduct(products, ["boot", "heel", "sandal", "flat", "sneaker", "loafer", "pump"]) || products[3];
              const outerAlt =
                pickProduct(products, ["coat", "jacket", "trench", "blazer", "outerwear"]) || products[4];
              const benefit = describeBodyTypeBenefit(bodyType);
              const lines = [
                greetingLine,
                "",
                "Outfit:",
                ...products.slice(0, 5).map((p, idx) =>
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
