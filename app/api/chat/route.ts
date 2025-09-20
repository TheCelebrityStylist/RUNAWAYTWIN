// FILE: app/api/chat/route.ts
import { NextRequest } from "next/server";
import { searchProducts, fxConvert, getCatalogProductById } from "../tools";     // <- app/api/tools.ts (SerpAPI → Web → Demo)
import type { Product } from "../tools";
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
  { label: "gala", hints: ["gala", "red carpet", "premiere"] },
  { label: "party", hints: ["party", "celebration", "birthday"] },
  { label: "wedding", hints: ["wedding", "ceremony"] },
  { label: "travel", hints: ["travel", "vacation", "resort", "holiday"] },
  { label: "weekend casual", hints: ["casual", "brunch", "weekend", "street"] },
  { label: "smart casual", hints: ["smart casual", "smart-casual", "smartcasual"] },
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

type SceneDetails = {
  location?: string | null;
  temperatureC?: number | null;
  condition?: string | null;
};

const CONDITION_KEYWORDS: { regex: RegExp; label: string }[] = [
  { regex: /drizzle|rain|shower/i, label: "misty drizzle" },
  { regex: /snow|frost/i, label: "snowy chill" },
  { regex: /wind|breeze|gust/i, label: "crisp breeze" },
  { regex: /sunny|sunlight|sunshine|bright/i, label: "sunny glow" },
  { regex: /overcast|cloud|grey/i, label: "softly overcast" },
  { regex: /humid|muggy/i, label: "warm humidity" },
  { regex: /chill|cold|cool/i, label: "cool air" },
  { regex: /heatwave|hot|balmy/i, label: "balmy heat" },
];

function extractSceneDetails(text: string, muse?: string | null): SceneDetails {
  const sample = text || "";
  const museKey = muse ? muse.toLowerCase() : "";

  const locationMatch = sample.match(/\b(?:in|at|around|heading to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  let location = locationMatch ? locationMatch[1].trim() : null;
  if (location && museKey && location.toLowerCase().includes(museKey)) {
    location = null;
  }

  let temperatureC: number | null = null;
  const tempRegex = /(-?\d{1,2})(?:\s*[°º]\s*([CFcf])|\s*degrees?\s*(celsius|fahrenheit|c|f)?)/;
  const tempMatch = sample.match(tempRegex);
  if (tempMatch) {
    const value = parseInt(tempMatch[1], 10);
    const unit = (tempMatch[2] || tempMatch[3] || "c").toLowerCase();
    if (Number.isFinite(value)) {
      temperatureC = unit.startsWith("f") ? Math.round(((value - 32) * 5) / 9) : value;
    }
  }

  let condition: string | null = null;
  for (const entry of CONDITION_KEYWORDS) {
    if (entry.regex.test(sample)) {
      condition = entry.label;
      break;
    }
  }

  return { location, temperatureC, condition };
}

function sceneSummaryLine(
  scene: SceneDetails | null | undefined,
  occasion: string | null,
  styleKeywords?: string | null
): string | null {
  if (!scene) {
    if (!styleKeywords) return null;
    return `- Scene: moodboard ${styleKeywords}`;
  }
  const parts: string[] = [];
  if (scene.location) parts.push(scene.location);
  if (typeof scene.temperatureC === "number") parts.push(`${scene.temperatureC}°C`);
  if (scene.condition) parts.push(scene.condition);
  if (occasion) parts.push(occasion.toLowerCase());
  const descriptor = parts.join(" • ");
  const mood = styleKeywords ? `moodboard ${styleKeywords}` : "";
  const body = [descriptor, mood].filter(Boolean).join(" — ");
  return body ? `- Scene: ${body}` : null;
}

function sceneNarrativeLine(
  scene: SceneDetails | null | undefined,
  occasion: string | null,
  styleKeywords?: string | null
): string | null {
  if (!scene || (!scene.location && typeof scene.temperatureC !== "number" && !scene.condition)) {
    if (!styleKeywords) return null;
    return `Moodboard — ${styleKeywords}`;
  }
  const parts: string[] = [];
  if (scene.location) parts.push(scene.location);
  if (typeof scene.temperatureC === "number") parts.push(`${scene.temperatureC}°C`);
  if (scene.condition) parts.push(scene.condition);
  if (occasion) parts.push(occasion.toLowerCase());
  const descriptor = parts.join(" • ");
  const mood = styleKeywords ? `moodboard: ${styleKeywords}` : "";
  const body = [descriptor, mood].filter(Boolean).join(" — ");
  return body ? `Setting • ${body}` : null;
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
  scene,
}: {
  bodyType: string | null;
  occasion: string | null;
  muse: string | null;
  styleKeywords?: string | null;
  budget?: number | null;
  currency: string;
  hasBodyType: boolean;
  hasOccasion: boolean;
  scene?: SceneDetails | null;
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

  const sceneLine = sceneSummaryLine(scene ?? null, occasion, styleKeywords);
  if (sceneLine) {
    lines.push(sceneLine);
  }

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

const GREETING_TOKENS = [
  "hi",
  "hello",
  "hey",
  "hiya",
  "heya",
  "hola",
  "ciao",
  "bonjour",
  "bonsoir",
  "thanks",
  "thank",
  "morning",
  "evening",
  "afternoon",
  "appreciate",
];

const STYLE_TRIGGER_TOKENS = [
  "dress",
  "outfit",
  "style",
  "wear",
  "look",
  "ideas",
  "idea",
  "gala",
  "event",
  "wedding",
  "party",
  "jean",
  "coat",
  "shoe",
  "shoes",
  "top",
  "bottom",
  "accessories",
  "budget",
  "need",
  "help",
  "want",
  "prefer",
  "make",
  "plan",
  "capsule",
  "swap",
  "change",
  "pair",
  "recommend",
  "recommendation",
  "options",
  "option",
  "update",
  "refine",
];

function isGreetingLike(text: string): boolean {
  if (!text) return false;
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > 60) return false;
  const tokens = normalized.split(" ").filter(Boolean);
  if (!tokens.some((t) => GREETING_TOKENS.includes(t))) return false;
  if (tokens.some((t) => STYLE_TRIGGER_TOKENS.includes(t))) return false;
  return tokens.length <= 6;
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

type OutfitCategory = "Top" | "Bottom" | "Dress" | "Outerwear" | "Shoes" | "Accessories";

function normalizeMuseName(muse: string | null): string | null {
  if (!muse) return null;
  const lower = muse.toLowerCase();
  if (lower.includes("zendaya")) return "Zendaya";
  if (lower.includes("jennifer") && lower.includes("lawrence")) return "Jennifer Lawrence";
  if (lower.includes("blake") && lower.includes("lively")) return "Blake Lively";
  if (lower.includes("hailey") && lower.includes("bieber")) return "Hailey Bieber";
  if (lower.includes("hailey")) return "Hailey Bieber";
  return muse;
}

function normalizeOccasionLabel(occasion: string | null): string | null {
  if (!occasion) return null;
  const lower = occasion.toLowerCase();
  if (lower.includes("gala") || lower.includes("red carpet") || lower.includes("premiere")) return "gala";
  if (lower.includes("evening") || lower.includes("cocktail") || lower.includes("night")) return "evening";
  if (lower.includes("work") || lower.includes("office") || lower.includes("boardroom")) return "work";
  if (lower.includes("wedding") || lower.includes("ceremony")) return "event";
  if (lower.includes("opening") || lower.includes("gallery")) return "event";
  if (lower.includes("party")) return "evening";
  if (lower.includes("smart-casual") || lower.includes("smart casual")) return "smart casual";
  if (lower.includes("street style") || lower.includes("street")) return "weekend casual";
  if (lower.includes("travel")) return "travel";
  if (lower.includes("everyday") || lower.includes("daily") || lower.includes("casual") || lower.includes("day"))
    return "everyday";
  if (lower.includes("event")) return "event";
  return lower.split(/[^a-z]+/)[0] || lower;
}

type CuratedLook = {
  muses: string[];
  occasions: string[];
  hero: {
    top?: string;
    bottom?: string;
    dress?: string;
    outerwear?: string;
    shoes?: string;
    accessories?: string;
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

const OCCASION_GROUPS = [
  ["gala", "evening", "event", "red carpet"],
  ["everyday", "weekend casual", "smart casual", "street"],
  ["work", "office", "boardroom"],
  ["party", "evening", "cocktail"],
  ["travel", "resort", "vacation"],
];

function occasionsSimilar(a: string, b: string) {
  if (a === b) return true;
  for (const group of OCCASION_GROUPS) {
    if (group.includes(a) && group.includes(b)) return true;
  }
  return false;
}

const CURATED_LOOKS: CuratedLook[] = [
  {
    muses: ["zendaya"],
    occasions: ["gala", "evening", "event"],
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
  {
    muses: ["hailey bieber", "hailey"],
    occasions: ["everyday", "weekend casual", "smart casual"],
    hero: {
      top: "toteme-contour-ribbed-tank",
      bottom: "agolde-90s-pinched-jean",
      outerwear: "wardrobe-nyc-double-breasted-coat",
      shoes: "saint-laurent-le-loafer",
      accessories: "bottega-mini-jodie",
    },
    alternates: {
      shoes: "autry-medalist-sneaker",
      outerwear: "frankie-shop-bea-blazer",
    },
    save: [
      { category: "Top", productId: "mango-ribbed-tank" },
      { category: "Bottom", productId: "levi-ribcage-straight" },
      { category: "Outerwear", productId: "stories-oversized-wool-coat" },
      { category: "Shoes", productId: "vagabond-ayden-loafer" },
      { category: "Accessories", productId: "charles-keith-luna-bag" },
    ],
    vibe: "effortless West Coast street polish with sculpted lines",
    palette: "bone, camel, inky black",
    why: {
      hourglass: [
        "Contour tank skims the bust while nipping the waist so your curves stay intentional.",
        "Pinch-waist denim smooths the hip and drops into a long, lean line à la Hailey.",
        "Camel coat falls clean from the shoulder, framing your shape without bulk.",
      ],
      pear: [
        "Squared neckline broadens the shoulder line to balance fuller hips.",
        "High-rise denim floats over curves while the sleek loafer keeps the leg looking endless.",
        "Mini Jodie tucks under the arm so focus lifts toward your waist and décolleté.",
      ],
      rectangle: [
        "Ribbed knit adds contour while the pinched waistband creates instant definition.",
        "Structured coat and soft bag build dimension so the silhouette feels sculpted, not boxy.",
        "Glossy loafers add a refined anchor that sharpens the overall line.",
      ],
      apple: [
        "Straight denim anchors the lower half without clinging through the midsection.",
        "Leaving the coat open draws vertical lines that skim the torso effortlessly.",
        "Loafer lift lengthens the leg so the eye travels upward.",
      ],
      default: [
        "Neutral layering and razor-sharp tailoring mirror Hailey’s signature street polish.",
        "Mix of luxe textures—ribbed knit, premium denim, calfskin—keeps minimalism elevated.",
        "Iconic accessories pull the look together so it photographs like a VIP errand run.",
      ],
    },
    capsule: {
      remix: [
        "Pair the tank with leather trousers and the loafers for late-night cocktails.",
        "Swap in the Autry sneakers and a baseball cap for Sunday coffee runs.",
        "Belt the camel coat over a silk slip dress for after-dark dinners.",
      ],
      tips: [
        "Steam the coat hem and jean cuff so every line stays razor sharp.",
        "Stack delicate gold jewellery and slick hair back to echo Hailey’s finish.",
      ],
    },
  },
];

const DEFAULT_CATEGORY_FALLBACKS: Record<OutfitCategory | "Dress", string[]> = {
  Top: ["safiyaa-livia-top", "the-row-wesler", "toteme-contour-ribbed-tank", "arket-merino-tee", "mango-ribbed-tank"],
  Bottom: [
    "safiyaa-viviana-skirt",
    "khaite-eddie-trouser",
    "agolde-90s-pinched-jean",
    "levi-ribcage-straight",
    "arket-wide-leg-trouser",
  ],
  Dress: [],
  Outerwear: [
    "alex-vauthier-opera-coat",
    "the-row-balter-coat",
    "wardrobe-nyc-double-breasted-coat",
    "mango-trench",
    "stories-oversized-wool-coat",
    "frankie-shop-bea-blazer",
  ],
  Shoes: [
    "jimmy-choo-bing-100",
    "manolo-bb-70",
    "saint-laurent-le-loafer",
    "autry-medalist-sneaker",
    "schutz-altina-sandal",
    "vagabond-ayden-loafer",
  ],
  Accessories: [
    "tyler-ellis-perry-clutch",
    "cult-gaia-eos-clutch",
    "loewe-puzzle-tote",
    "bottega-mini-jodie",
    "charles-keith-luna-bag",
    "polene-numero-un",
  ],
};

const CATEGORY_QUERY_HINTS: Record<OutfitCategory, string[]> = {
  Top: ["structured top", "tailored blouse", "luxury knit", "bodysuit", "corset top"],
  Bottom: ["high-waisted trouser", "wide-leg pant", "fluid skirt", "column skirt", "dressy trouser"],
  Dress: ["evening gown", "red carpet dress", "silk slip dress", "draped gown", "statement dress"],
  Outerwear: ["tailored coat", "sculpted blazer", "statement outerwear", "evening cape", "cropped jacket"],
  Shoes: ["pointed pump", "strappy heel", "ankle boot", "platform sandal", "evening shoe"],
  Accessories: ["designer clutch", "statement earring", "structured bag", "minimal gold jewelry", "evening bag"],
};

const FORMAL_OCCASION_HINTS = [
  "gala",
  "premiere",
  "red carpet",
  "black tie",
  "evening",
  "wedding",
  "award",
  "ball",
];

function shouldFavorDress(occasion: string | null, transcript: string): boolean {
  const occ = (occasion || "").toLowerCase();
  if (FORMAL_OCCASION_HINTS.some((hint) => occ.includes(hint))) return true;

  const text = transcript.toLowerCase();
  if (/(?:gown|evening dress|slip dress|ballgown|floor[-\s]?length)/.test(text)) return true;

  return false;
}

function buildCategoryQuery({
  category,
  ask,
  muse,
  occasion,
  bodyType,
  styleKeywords,
  budget,
  currency,
  scene,
}: {
  category: OutfitCategory;
  ask: string;
  muse?: string | null;
  occasion?: string | null;
  bodyType?: string | null;
  styleKeywords?: string | null;
  budget?: number | null;
  currency: string;
  scene?: SceneDetails | null;
}): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  const push = (value?: string | null) => {
    if (!value) return;
    const trimmed = value.toString().trim();
    if (!trimmed) return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    parts.push(trimmed);
  };

  push(ask);
  if (muse) push(`${muse} ${category.toLowerCase()}`);
  if (occasion) push(`${occasion} ${category.toLowerCase()}`);
  if (bodyType) push(`${bodyType} body type ${category.toLowerCase()}`);
  if (styleKeywords) push(styleKeywords);
  if (scene?.location) push(scene.location);
  if (scene?.condition) push(`${scene.condition} friendly ${category.toLowerCase()}`);
  if (budget) push(`under ${budget} ${currency}`);
  for (const hint of CATEGORY_QUERY_HINTS[category] || []) push(hint);

  return parts.slice(0, 8).join(" | ");
}

function heroIdForCategory(look: CuratedLook, category: OutfitCategory | "Dress"): string | undefined {
  switch (category) {
    case "Dress":
      return look.hero.dress;
    case "Top":
      return look.hero.top;
    case "Bottom":
      return look.hero.bottom;
    case "Outerwear":
      return look.hero.outerwear;
    case "Shoes":
      return look.hero.shoes;
    case "Accessories":
      return look.hero.accessories;
    default:
      return undefined;
  }
}

function fallbackIdsForCategory(
  category: OutfitCategory | "Dress",
  museName?: string | null,
  curated?: CuratedLook | null
): string[] {
  const ids: string[] = [];
  const push = (id?: string) => {
    if (!id) return;
    if (ids.includes(id)) return;
    ids.push(id);
  };

  if (curated) {
    push(heroIdForCategory(curated, category));
    if (category === "Outerwear") push(curated.alternates.outerwear);
    if (category === "Shoes") push(curated.alternates.shoes);
    if (curated.save) {
      for (const entry of curated.save) {
        if (entry.category === category) push(entry.productId);
      }
    }
  }

  const museKey = museName ? museName.toLowerCase() : "";
  if (museKey) {
    for (const look of CURATED_LOOKS) {
      if (look.muses.some((m) => museKey.includes(m))) {
        push(heroIdForCategory(look, category));
        if (category === "Outerwear") push(look.alternates.outerwear);
        if (category === "Shoes") push(look.alternates.shoes);
        if (look.save) {
          for (const entry of look.save) {
            if (entry.category === category) push(entry.productId);
          }
        }
      }
    }
  }

  for (const look of CURATED_LOOKS) {
    push(heroIdForCategory(look, category));
    if (category === "Outerwear") push(look.alternates.outerwear);
    if (category === "Shoes") push(look.alternates.shoes);
    if (look.save) {
      for (const entry of look.save) {
        if (entry.category === category) push(entry.productId);
      }
    }
  }

  for (const fallback of DEFAULT_CATEGORY_FALLBACKS[category] || []) {
    push(fallback);
  }

  return ids;
}

function matchCuratedLook(muse: string | null, occasion: string | null): CuratedLook | null {
  const museKey = (muse || "").toLowerCase();
  const occKey = normalizeOccasionLabel(occasion);
  let best: { look: CuratedLook; score: number } | null = null;

  for (const look of CURATED_LOOKS) {
    let score = 0;

    if (!look.muses.length) {
      score += 0.5;
    } else if (museKey && look.muses.some((m) => museKey.includes(m) || m.includes(museKey))) {
      score += 3.5;
    } else if (museKey) {
      continue;
    }

    if (!look.occasions.length) {
      score += 0.5;
    } else if (occKey && look.occasions.some((label) => label === occKey)) {
      score += 2.5;
    } else if (occKey && look.occasions.some((label) => occasionsSimilar(label, occKey))) {
      score += 1.8;
    } else if (!occKey) {
      score += 0.2;
    } else {
      score -= 1;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { look, score };
    }
  }

  if (best && best.score >= 2.5) return best.look;
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

const CATEGORY_PATTERNS: { key: OutfitCategory; patterns: RegExp[] }[] = [
  { key: "Dress", patterns: [/\bdress\b/, /\bgown\b/, /\bslip\b/] },
  {
    key: "Top",
    patterns: [
      /\btop\b/,
      /\bshirt\b/,
      /\bblouse\b/,
      /t[-\s]?shirt/,
      /\btank\b/,
      /\bknit\b/,
      /\bsweater\b/,
      /\bbodysuit\b/,
      /\bcardigan\b/,
      /\btee\b/,
      /\bcorset\b/,
      /\bhalter\b/,
    ],
  },
  {
    key: "Bottom",
    patterns: [
      /\btrouser\b/,
      /\bpant\b/,
      /\bjean\b/,
      /\bskirt\b/,
      /\bshort\b/,
      /\bculotte\b/,
      /\blegging\b/,
      /\bwide[-\s]?leg\b/,
    ],
  },
  {
    key: "Outerwear",
    patterns: [
      /\bcoat\b/,
      /\bjacket\b/,
      /\bblazer\b/,
      /\btrench\b/,
      /\bduster\b/,
      /\bovercoat\b/,
      /\bparka\b/,
      /\bbomber\b/,
      /\banorak\b/,
      /\bouterwear\b/,
    ],
  },
  {
    key: "Shoes",
    patterns: [
      /\bboot\b/,
      /\bsandal\b/,
      /\bheel\b/,
      /\bpump\b/,
      /\bloafer\b/,
      /\bflat\b/,
      /\bsneaker\b/,
      /\bmule\b/,
      /\bslingback\b/,
      /\bstiletto\b/,
      /\bplatform\b/,
    ],
  },
  {
    key: "Accessories",
    patterns: [
      /\bbag\b/,
      /\bclutch\b/,
      /\btote\b/,
      /\bpouch\b/,
      /\bearring\b/,
      /\bnecklace\b/,
      /\bbracelet\b/,
      /\bring\b/,
      /\bbelt\b/,
      /\bsunglass\b/,
      /\bscarf\b/,
      /\bchoker\b/,
      /\bwatch\b/,
      /\bhair\b/,
    ],
  },
];

function guessCategory(product: Product): OutfitCategory | null {
  const direct = product.category?.toLowerCase();
  if (direct) {
    for (const { key } of CATEGORY_PATTERNS) {
      if (direct.includes(key.toLowerCase())) return key;
    }
  }

  const haystack = [
    product.title,
    product.description,
    product.brand,
    ...(product.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const { key, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(haystack))) return key;
  }
  return null;
}

function categoryTitleFor(product: Product): string {
  return guessCategory(product) ?? "Item";
}

function shortProductName(product: Product): string {
  const cleanTitle = product.title
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleanTitle.split(/\s+/);
  const trimmed = words.length > 6 ? `${words.slice(0, 6).join(" ")}…` : cleanTitle;
  return [product.brand, trimmed].filter(Boolean).join(" ").trim();
}

const COLOR_KEYWORDS: { label: string; patterns: RegExp[] }[] = [
  { label: "onyx black", patterns: [/\bblack\b/i, /\bnoir\b/i, /\bjet\b/i] },
  { label: "ivory", patterns: [/\bivory\b/i, /\bcream\b/i, /\bbone\b/i, /\bpearl\b/i] },
  { label: "champagne", patterns: [/\bchampagne\b/i, /\bbeige\b/i, /\btaupe\b/i, /\bcamel\b/i] },
  { label: "deep navy", patterns: [/\bnavy\b/i, /\bmidnight\b/i, /\bindigo\b/i] },
  { label: "slate grey", patterns: [/\bgrey\b/i, /\bgray\b/i, /\bcharcoal\b/i] },
  { label: "emerald", patterns: [/\bemerald\b/i, /\bforest\b/i, /\bgreen\b/i] },
  { label: "ruby", patterns: [/\bruby\b/i, /\bcrimson\b/i, /\bred\b/i, /\bburgundy\b/i] },
  { label: "blush", patterns: [/\bblush\b/i, /\brose\b/i, /\bpink\b/i] },
  { label: "cobalt", patterns: [/\bcobalt\b/i, /\broyal\b/i, /\bazure\b/i, /\bblue\b/i] },
  { label: "liquid silver", patterns: [/\bsilver\b/i, /\bchrome\b/i, /\bmetallic\b/i] },
  { label: "molten gold", patterns: [/\bgold\b/i, /\bgilt\b/i, /\bbronze\b/i] },
];

const FABRIC_KEYWORDS: { label: string; patterns: RegExp[] }[] = [
  { label: "silk", patterns: [/\bsilk\b/i, /\bsatin\b/i, /\bcharmeuse\b/i] },
  { label: "crepe", patterns: [/\bcrepe\b/i, /\bcrêpe\b/i] },
  { label: "wool", patterns: [/\bwool\b/i, /\bcashmere\b/i, /\bmerino\b/i] },
  { label: "leather", patterns: [/\bleather\b/i, /\bsuede\b/i, /\bnappa\b/i] },
  { label: "denim", patterns: [/\bdenim\b/i] },
  { label: "cotton", patterns: [/\bcotton\b/i, /\bpoplin\b/i, /\bjersey\b/i] },
  { label: "lace", patterns: [/\blace\b/i, /\btulle\b/i] },
  { label: "velvet", patterns: [/\bvelvet\b/i] },
  { label: "embellishment", patterns: [/\bsequin/i, /\bembellish/i, /\bcrystal\b/i] },
];

const DETAIL_PATTERNS: { regex: RegExp; phrase: string }[] = [
  { regex: /off[-\s]?the[-\s]?shoulder/i, phrase: "off-the-shoulder neckline" },
  { regex: /one[-\s]?shoulder/i, phrase: "one-shoulder sculpting" },
  { regex: /corset|bustier/i, phrase: "corseted bodice" },
  { regex: /structured|tailor|sharp/i, phrase: "razor-sharp tailoring" },
  { regex: /wide[-\s]?leg|palazzo/i, phrase: "wide-leg drape" },
  { regex: /high[-\s]?rise|high[-\s]?waist/i, phrase: "high-rise waistband" },
  { regex: /bias|slip/i, phrase: "bias-cut glide" },
  { regex: /column/i, phrase: "column silhouette" },
  { regex: /double[-\s]?breasted/i, phrase: "double-breasted framing" },
  { regex: /cropped/i, phrase: "cropped proportion" },
  { regex: /pointed/i, phrase: "pointed toe" },
  { regex: /stiletto|heel/i, phrase: "sleek heel" },
  { regex: /loafer/i, phrase: "polished loafer profile" },
  { regex: /slingback/i, phrase: "slingback finish" },
];

type MuseTrait = {
  intro: string;
  palette: string;
  fabrics: string;
};

const MUSE_TRAITS: Record<string, MuseTrait> = {
  zendaya: {
    intro: "liquid couture edge",
    palette: "obsidian, liquid silver, midnight emerald",
    fabrics: "satin, crepe, architectural tailoring",
  },
  "jennifer lawrence": {
    intro: "quiet luxury polish",
    palette: "stone, bone, charcoal",
    fabrics: "cashmere, merino, supple leather",
  },
  "hailey bieber": {
    intro: "90s minimalist street polish",
    palette: "bone, camel, inky black",
    fabrics: "ribbed knits, structured denim, buttery leather",
  },
  "taylor russell": {
    intro: "sculptural avant-garde",
    palette: "espresso, alabaster, chrome",
    fabrics: "lacquered leather, silk, precision wool",
  },
  "blake lively": {
    intro: "playful Park Avenue glam",
    palette: "sorbet pastels, luminous gold",
    fabrics: "silk, sequins, tulle",
  },
  rihanna: {
    intro: "fearless high-low glamour",
    palette: "midnight, citron, molten metallics",
    fabrics: "silk, leather, sport-luxe contrasts",
  },
};

const BODY_TYPE_CATEGORY_LINES: Record<BodyKey, Partial<Record<OutfitCategory | "Dress", string>>> = {
  hourglass: {
    Top: "frames the bust while keeping your waist razor sharp.",
    Bottom: "follows your curves then drops into a clean, elongating line.",
    Dress: "sculpts your waist and lets the skirt glide over every curve.",
    Outerwear: "defines your waist without adding bulk.",
    Shoes: "lengthen the leg so the silhouette stays statuesque.",
    Accessories: "keeps focus at the waist and décolleté.",
  },
  pear: {
    Top: "broadens your shoulders so hips look impossibly balanced.",
    Bottom: "skims the hips and releases into a long leg line.",
    Dress: "nips the waist while the skirt floats over curves.",
    Outerwear: "structures the top half without hiding your shape.",
    Shoes: "elongate your stance for camera-ready proportions.",
    Accessories: "pulls the gaze upward toward your face and waist.",
  },
  apple: {
    Top: "creates a defined shoulder line and lengthens your torso.",
    Bottom: "drops from the waist to streamline the midsection.",
    Dress: "skims the midsection and carves out a sleek column.",
    Outerwear: "adds structure away from the waist for a clean frame.",
    Shoes: "anchor the look while elongating the leg.",
    Accessories: "spotlights your neckline to keep everything lifted.",
  },
  rectangle: {
    Top: "builds gentle curves through the bust and shoulder.",
    Bottom: "adds volume where you want it for a defined waist.",
    Dress: "creates shape through the waist and hip for soft curves.",
    Outerwear: "adds contour through tailored seams.",
    Shoes: "add polish and lift for a feminine finish.",
    Accessories: "adds dimension through the torso.",
  },
  inverted: {
    Top: "softens the shoulder line while keeping the waist sharp.",
    Bottom: "adds flow through the lower half to balance proportions.",
    Dress: "draws the eye downward with fluid motion.",
    Outerwear: "elongates the torso without adding shoulder bulk.",
    Shoes: "ground the look so the proportions feel harmonious.",
    Accessories: "focus attention at the hip and hand for equilibrium.",
  },
  default: {
    Top: "keeps the upper body sculpted and polished.",
    Bottom: "elongates the leg line effortlessly.",
    Dress: "creates a statuesque column from shoulder to hem.",
    Outerwear: "adds structure while keeping the silhouette sleek.",
    Shoes: "give you lift without sacrificing comfort.",
    Accessories: "finish the look with intentional polish.",
  },
};

function uniqueStrings(values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function productText(product: Product): string {
  return [product.brand, product.title, product.description, ...(product.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function detectPalette(products: Product[]): string[] {
  const colours: string[] = [];
  for (const product of products) {
    const text = productText(product);
    for (const entry of COLOR_KEYWORDS) {
      if (entry.patterns.some((pattern) => pattern.test(text))) {
        colours.push(entry.label);
        break;
      }
    }
  }
  return uniqueStrings(colours);
}

function detectFabrics(products: Product[]): string[] {
  const fabrics: string[] = [];
  for (const product of products) {
    const text = productText(product);
    for (const entry of FABRIC_KEYWORDS) {
      if (entry.patterns.some((pattern) => pattern.test(text))) {
        fabrics.push(entry.label);
      }
    }
  }
  return uniqueStrings(fabrics);
}

function highlightDetail(product: Product): string | null {
  const text = productText(product);
  for (const entry of DETAIL_PATTERNS) {
    if (entry.regex.test(text)) {
      return entry.phrase;
    }
  }
  return null;
}

function bodyFocusLine(bodyKey: BodyKey, category: OutfitCategory | "Dress"): string {
  return (
    BODY_TYPE_CATEGORY_LINES[bodyKey]?.[category] ||
    BODY_TYPE_CATEGORY_LINES.default[category] ||
    "celebrates your proportions with purposeful tailoring."
  );
}

function museTraitFor(name?: string | null): MuseTrait | null {
  if (!name) return null;
  const key = name.toLowerCase();
  return MUSE_TRAITS[key] ?? null;
}

function formatList(items: string[], fallback: string): string {
  const filtered = items.filter(Boolean);
  if (!filtered.length) return fallback;
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")}, and ${filtered.slice(-1)}`;
}

function buildProductFallbackPlan({
  products,
  bodyType,
  museName,
  occasion,
  currency,
  budget,
  curatedLook,
  styleKeywords,
  scene,
}: {
  products: Product[];
  bodyType: string | null;
  museName?: string | null;
  occasion?: string | null;
  currency: string;
  budget?: number | null;
  curatedLook?: CuratedLook | null;
  styleKeywords?: string | null;
  scene?: SceneDetails | null;
}): string {
  const targetCurrency = (currency || "EUR").toUpperCase();
  const bodyKey = bodyKeyFrom(bodyType);
  const museInfo = museTraitFor(museName);
  const occasionLabel = occasion ? occasion.toLowerCase() : "moment";
  const styleTokens = (styleKeywords || "")
    .split(/[\s,]+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const sceneDetails = scene ?? null;
  const isRainy = sceneDetails?.condition ? /rain|drizzle|mist/i.test(sceneDetails.condition) : false;
  const isChilly = typeof sceneDetails?.temperatureC === "number" && sceneDetails.temperatureC <= 12;
  const isWarm = typeof sceneDetails?.temperatureC === "number" && sceneDetails.temperatureC >= 24;

  const curatedIds = new Set<string>();
  if (curatedLook) {
    const heroKeys = [
      curatedLook.hero.top,
      curatedLook.hero.bottom,
      curatedLook.hero.dress,
      curatedLook.hero.outerwear,
      curatedLook.hero.shoes,
      curatedLook.hero.accessories,
      curatedLook.alternates.shoes,
      curatedLook.alternates.outerwear,
      ...(curatedLook.save?.map((entry) => entry.productId) ?? []),
    ];
    for (const id of heroKeys) {
      if (id) curatedIds.add(id);
    }
  }

  const deduped: Product[] = [];
  const seen = new Set<string>();
  const pushProduct = (product?: Product | null) => {
    if (!product) return;
    const key = product.id || product.url;
    if (seen.has(key) || seen.has(product.url)) return;
    seen.add(key);
    seen.add(product.url);
    deduped.push(product);
  };

  for (const product of products) pushProduct(product);
  if (curatedLook) {
    const curatedPool = [
      curatedLook.hero.top,
      curatedLook.hero.bottom,
      curatedLook.hero.dress,
      curatedLook.hero.outerwear,
      curatedLook.hero.shoes,
      curatedLook.hero.accessories,
      curatedLook.alternates.shoes,
      curatedLook.alternates.outerwear,
      ...(curatedLook.save?.map((entry) => entry.productId) ?? []),
    ];
    for (const id of curatedPool) {
      if (!id) continue;
      pushProduct(getCatalogProductById(id));
    }
  }

  if (!deduped.length) {
    return [
      "Hello love — I’m refreshing the racks with new finds.",
      "Give me one more cue and I’ll spin a tailored lineup immediately.",
      "",
      "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
    ].join("\n");
  }

  const buckets: Record<OutfitCategory | "Dress", Product[]> = {
    Top: [],
    Bottom: [],
    Dress: [],
    Outerwear: [],
    Shoes: [],
    Accessories: [],
  };

  for (const product of deduped) {
    const category = guessCategory(product);
    if (category) buckets[category].push(product);
  }

  const allocation: Partial<Record<OutfitCategory | "Dress", number>> = budget
    ? {
        Top: budget * 0.22,
        Bottom: budget * 0.22,
        Dress: budget * 0.42,
        Outerwear: budget * 0.26,
        Shoes: budget * 0.18,
        Accessories: budget * 0.12,
      }
    : {};

  const rankCategory = (category: OutfitCategory | "Dress") => {
    const bucket = buckets[category];
    if (!bucket.length) return [] as { product: Product; score: number; price: number }[];
    const occLower = (occasion ?? "").toLowerCase();
    const museLower = (museName ?? "").toLowerCase();
    const bodyLower = (bodyType ?? "").toLowerCase();

    return bucket
      .map((product, idx) => {
        let score = 0;
        const text = productText(product);
        const tags = (product.tags || []).map((t) => t.toLowerCase());
        const price =
          typeof product.price === "number"
            ? convertPrice(product.price, product.currency, targetCurrency)
            : Number.NaN;

        if (curatedIds.has(product.id)) score += 6;
        if (museLower) {
          if (text.includes(museLower.split(" ")[0])) score += 1.4;
          if (tags.some((tag) => tag.includes(museLower))) score += 4;
        }
        if (occLower) {
          if (text.includes(occLower)) score += 1.2;
          if (tags.some((tag) => tag.includes(occLower))) score += 2.2;
        }
        if (bodyLower) {
          if (tags.some((tag) => tag.includes(bodyLower))) score += 2;
        }
        if (styleTokens.length) {
          const matches = styleTokens.filter((kw) => text.includes(kw));
          if (matches.length) score += Math.min(matches.length, 2) * 0.6;
          if (tags.some((tag) => styleTokens.some((kw) => tag.includes(kw)))) score += 0.8;
        }

        if (category === "Top" || category === "Dress") {
          if (isWarm && /silk|linen|cotton|tank|sleeveless|lightweight/.test(text)) score += 0.5;
          if (isChilly && /long[-\s]?sleeve|knit|wool|cashmere|turtleneck/.test(text)) score += 0.5;
        }
        if (category === "Bottom") {
          if (isWarm && /linen|silk|cropped|fluid/.test(text)) score += 0.3;
          if (isChilly && /wool|leather|lined/.test(text)) score += 0.3;
        }
        if (category === "Outerwear") {
          if (isRainy && /trench|rain|waterproof|gabardine/.test(text)) score += 1;
          if (isChilly && /wool|cashmere|coat|double[-\s]?breasted|lined/.test(text)) score += 0.9;
          if (isWarm && /linen|silk|lightweight|unlined/.test(text)) score += 0.5;
        }
        if (category === "Shoes") {
          if (isRainy && /boot|loafer|closed/.test(text)) score += 0.4;
          if (isWarm && /sandal|open/.test(text)) score += 0.3;
        }

        const detail = highlightDetail(product);
        if (detail) score += 1.1;

        if (bodyKey === "pear") {
          if (category === "Top" && /shoulder|neckline|structured/.test(text)) score += 1.5;
          if (category === "Bottom" && /wide|flare|column|flow|fluid/.test(text)) score += 1.5;
        } else if (bodyKey === "hourglass") {
          if (/wrap|corset|belt|nipped/.test(text)) score += 1.2;
        } else if (bodyKey === "apple") {
          if (category === "Top" && /wrap|drape|v-neck/.test(text)) score += 1.2;
          if (category === "Outerwear" && /open|drape|longline/.test(text)) score += 1;
        } else if (bodyKey === "rectangle") {
          if (/peplum|pleat|volume|belt|curve/.test(text)) score += 1.2;
        } else if (bodyKey === "inverted") {
          if (category === "Bottom" && /wide|pleat|volume|flare/.test(text)) score += 1.5;
          if (category === "Top" && /drape|soft|wrap/.test(text)) score += 1.1;
        }

        if (Number.isFinite(price) && budget) {
          const target = allocation[category] ?? budget / 5;
          if (target > 0) {
            const diff = Math.abs(price - target) / target;
            score += 4 - Math.min(diff * 2, 4);
            if (price <= target * 1.2) score += 1.4;
            if (price > budget * 0.6 && category !== "Accessories") score -= 0.6;
          }
        } else if (Number.isFinite(price)) {
          score += 0.5;
        }

        score -= idx * 0.08;
        return { product, score, price: Number.isFinite(price) ? price : Number.NaN };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.price || Infinity) - (b.price || Infinity);
      });
  };

  type Candidate = { product: Product; score: number; price: number };

  const rankedTop = rankCategory("Top");
  const rankedBottom = rankCategory("Bottom");
  const rankedDress = rankCategory("Dress");
  const rankedOuterwear = rankCategory("Outerwear");
  const rankedShoes = rankCategory("Shoes");
  const rankedAccessories = rankCategory("Accessories");

  const ensureCandidates = (
    ranked: { product: Product; score: number; price: number }[],
    category: OutfitCategory | "Dress"
  ): Candidate[] => {
    const list: Candidate[] = ranked.slice(0, 6).map((entry) => ({
      product: entry.product,
      score: entry.score,
      price: Number.isFinite(entry.price) ? entry.price : Number.NaN,
    }));
    if (list.length >= 4) return list;
    const fallbackPool = fallbackIdsForCategory(category, museName, curatedLook);
    for (const id of fallbackPool) {
      const product = deduped.find((p) => p.id === id) || getCatalogProductById(id);
      if (!product) continue;
      if (list.some((entry) => entry.product.id === product.id)) continue;
      list.push({
        product,
        score: 2.6,
        price:
          typeof product.price === "number"
            ? convertPrice(product.price, product.currency, targetCurrency)
            : Number.NaN,
      });
      if (list.length >= 4) break;
    }
    if (!list.length) {
      const fallback = deduped.find((p) => guessCategory(p) === category);
      if (fallback) {
        list.push({
          product: fallback,
          score: 1.2,
          price:
            typeof fallback.price === "number"
              ? convertPrice(fallback.price, fallback.currency, targetCurrency)
              : Number.NaN,
        });
      }
    }
    return list;
  };

  const candidateTop = ensureCandidates(rankedTop, "Top");
  const candidateBottom = ensureCandidates(rankedBottom, "Bottom");
  const candidateDress = ensureCandidates(rankedDress, "Dress");
  const candidateOuter = ensureCandidates(rankedOuterwear, "Outerwear");
  const candidateShoes = ensureCandidates(rankedShoes, "Shoes");
  const candidateAccessories = ensureCandidates(rankedAccessories, "Accessories");

  type Combo = {
    structure: "separates" | "dress";
    top?: Candidate | null;
    bottom?: Candidate | null;
    dress?: Candidate | null;
    outerwear?: Candidate | null;
    shoes?: Candidate | null;
    accessories?: Candidate | null;
    total: number;
    score: number;
    unknownCount: number;
  };

  const combos: Combo[] = [];
  const MAX_OPTIONS = 4;

  const evaluateCombo = (combo: {
    structure: "separates" | "dress";
    top?: Candidate | null;
    bottom?: Candidate | null;
    dress?: Candidate | null;
    outerwear?: Candidate | null;
    shoes?: Candidate | null;
    accessories?: Candidate | null;
  }) => {
    if (combo.structure === "separates" && (!combo.top || !combo.bottom)) return;
    if (combo.structure === "dress" && !combo.dress) return;
    const items = [combo.dress, combo.top, combo.bottom, combo.outerwear, combo.shoes, combo.accessories]
      .filter(Boolean) as Candidate[];
    if (!items.length) return;
    const total = items.reduce((sum, cand) => sum + (Number.isFinite(cand.price) ? cand.price : 0), 0);
    const unknownCount = items.filter((cand) => !Number.isFinite(cand.price)).length;
    let score = items.reduce((sum, cand) => sum + cand.score, 0);

    if (budget && budget > 0) {
      const over = total - budget;
      if (over <= 0) {
        score += 6 + Math.min(((budget - total) / Math.max(budget, 1)) * 4, 4);
      } else {
        score -= Math.min((over / Math.max(budget, 1)) * 9, 9);
      }
    } else {
      score += items.filter((cand) => Number.isFinite(cand.price)).length * 0.25;
    }

    if (!combo.outerwear) score -= 1.2;
    if (!combo.shoes) score -= 1.1;
    if (!combo.accessories) score -= 0.8;

    for (const cand of items) {
      if (curatedIds.has(cand.product.id)) score += 1.1;
    }
    score -= unknownCount * 0.4;

    combos.push({ ...combo, total, score, unknownCount });
  };

  if (
    candidateDress.length &&
    candidateOuter.length &&
    candidateShoes.length &&
    candidateAccessories.length
  ) {
    for (const dressCandidate of candidateDress.slice(0, MAX_OPTIONS)) {
      for (const outerCandidate of candidateOuter.slice(0, MAX_OPTIONS)) {
        for (const shoeCandidate of candidateShoes.slice(0, MAX_OPTIONS)) {
          for (const accessoryCandidate of candidateAccessories.slice(0, MAX_OPTIONS)) {
            evaluateCombo({
              structure: "dress",
              dress: dressCandidate,
              outerwear: outerCandidate,
              shoes: shoeCandidate,
              accessories: accessoryCandidate,
            });
          }
        }
      }
    }
  }

  if (
    candidateTop.length &&
    candidateBottom.length &&
    candidateOuter.length &&
    candidateShoes.length &&
    candidateAccessories.length
  ) {
    for (const topCandidate of candidateTop.slice(0, MAX_OPTIONS)) {
      for (const bottomCandidate of candidateBottom.slice(0, MAX_OPTIONS)) {
        for (const outerCandidate of candidateOuter.slice(0, MAX_OPTIONS)) {
          for (const shoeCandidate of candidateShoes.slice(0, MAX_OPTIONS)) {
            for (const accessoryCandidate of candidateAccessories.slice(0, MAX_OPTIONS)) {
              evaluateCombo({
                structure: "separates",
                top: topCandidate,
                bottom: bottomCandidate,
                outerwear: outerCandidate,
                shoes: shoeCandidate,
                accessories: accessoryCandidate,
              });
            }
          }
        }
      }
    }
  }

  if (!combos.length && candidateDress.length) {
    evaluateCombo({
      structure: "dress",
      dress: candidateDress[0],
      outerwear: candidateOuter[0] ?? null,
      shoes: candidateShoes[0] ?? null,
      accessories: candidateAccessories[0] ?? null,
    });
  }
  if (!combos.length) {
    evaluateCombo({
      structure: "separates",
      top: candidateTop[0] ?? null,
      bottom: candidateBottom[0] ?? null,
      outerwear: candidateOuter[0] ?? null,
      shoes: candidateShoes[0] ?? null,
      accessories: candidateAccessories[0] ?? null,
    });
  }

  combos.sort((a, b) => b.score - a.score);
  let bestCombo = combos[0];
  if (budget && budget > 0) {
    const withinBudget = combos.filter((combo) => combo.total > 0 && combo.total <= budget);
    if (withinBudget.length) {
      withinBudget.sort((a, b) => b.score - a.score);
      bestCombo = withinBudget[0];
    }
  }

  let top: Product | null = null;
  let bottom: Product | null = null;
  let dress: Product | null = null;
  let outerwear: Product | null = bestCombo?.outerwear?.product ?? null;
  let shoes: Product | null = bestCombo?.shoes?.product ?? null;
  let accessories: Product | null = bestCombo?.accessories?.product ?? null;

  if (bestCombo?.structure === "dress") {
    dress = bestCombo.dress?.product ?? null;
  } else {
    top = bestCombo?.top?.product ?? null;
    bottom = bestCombo?.bottom?.product ?? null;
  }

  const heroProducts = () => {
    const list: Product[] = [];
    if (dress) list.push(dress);
    if (top) list.push(top);
    if (bottom) list.push(bottom);
    if (outerwear) list.push(outerwear);
    if (shoes) list.push(shoes);
    if (accessories) list.push(accessories);
    return list;
  };

  const computeTotal = (items: Product[]) =>
    items.reduce((sum, product) => {
      if (product && typeof product.price === "number") {
        return sum + convertPrice(product.price, product.currency, targetCurrency);
      }
      return sum;
    }, 0);

  const heroes = heroProducts();
  const total = computeTotal(heroes);
  const unknownPrices = heroes.filter((item) => item.price == null).length;
  const budgetDisplay = budget ? `${formatNumber(budget)} ${targetCurrency}` : "—";
  const totalDisplay = unknownPrices
    ? `${formatNumber(total)} ${targetCurrency}*`
    : total > 0
    ? `${formatNumber(total)} ${targetCurrency}`
    : "TBC";
  const overBudget = Boolean(budget && unknownPrices === 0 && total > budget);

  const colourPalette = detectPalette(heroes);
  const fabricPalette = detectFabrics(heroes);
  const bodyBenefit = describeBodyTypeBenefit(bodyType).replace(/\.$/, "");

  const museLead = museInfo
    ? `Channeling ${museName}’s ${museInfo.intro} for your ${occasionLabel} moment,`
    : `For your ${occasionLabel} moment,`;
  const bodyLine = bodyType
    ? `every layer is cut to celebrate your ${bodyType.toLowerCase()} silhouette so it ${bodyBenefit}.`
    : "every layer is balanced for high-impact proportions.";
  const directionTail = styleKeywords ? ` The vibe stays ${styleKeywords}.` : "";
  const introLine = `${museLead} ${bodyLine}${directionTail}`.replace(/\s+/g, " ").trim();
  const paletteLine = `Palette & Textures: ${formatList(colourPalette, museInfo?.palette || "sleek neutrals")} + ${formatList(
    fabricPalette,
    museInfo?.fabrics || "precision tailoring"
  )}.`;
  const silhouetteLine = `Silhouette Focus: ${bodyBenefit}.`;
  const sceneLine = sceneNarrativeLine(sceneDetails, occasion ?? null, styleKeywords);

  const usedIds = new Set<string>(heroes.map((item) => item.id));

  const candidateMap: Record<OutfitCategory | "Dress", Candidate[]> = {
    Top: candidateTop,
    Bottom: candidateBottom,
    Dress: candidateDress,
    Outerwear: candidateOuter,
    Shoes: candidateShoes,
    Accessories: candidateAccessories,
  };
  const selectedMap: Record<OutfitCategory | "Dress", Product | null> = {
    Top: top,
    Bottom: bottom,
    Dress: dress,
    Outerwear: outerwear,
    Shoes: shoes,
    Accessories: accessories,
  };

  const pickAlternative = (
    category: OutfitCategory | "Dress",
    selected: Product | null,
    list: Candidate[]
  ): Product | null => {
    const alt = list
      .map((entry) => entry.product)
      .find((candidate) => candidate.id !== (selected?.id ?? "") && !usedIds.has(candidate.id));
    if (alt) return alt;
    const fallbackId = fallbackIdsForCategory(category, museName, curatedLook).find(
      (id) => id && id !== (selected?.id ?? "")
    );
    if (fallbackId) {
      const product = getCatalogProductById(fallbackId);
      if (product && !usedIds.has(product.id)) return product;
    }
    return null;
  };

  const altShoesProduct = pickAlternative("Shoes", shoes, candidateShoes);
  const altOuterProduct = pickAlternative("Outerwear", outerwear, candidateOuter);
  const altShoesLine = altShoesProduct
    ? formatAlternateLine("Shoes", altShoesProduct)
    : "- Shoes: Hero pair is locked—say 'alternate shoes' and I’ll pull a fresh contender on the spot.";
  const altOuterLine = altOuterProduct
    ? formatAlternateLine("Outerwear", altOuterProduct)
    : "- Outerwear: Current layer is the sharpest match—ask for an outerwear swap and I’ll serve a new option instantly.";

  const whyBullets: string[] = [];
  if (dress) {
    const detail = highlightDetail(dress);
    whyBullets.push(
      `${shortProductName(dress)}${detail ? ` brings ${detail} that` : ""} ${bodyFocusLine(bodyKey, "Dress")}`
    );
  } else {
    if (top) {
      const detail = highlightDetail(top);
      whyBullets.push(
        `${shortProductName(top)}${detail ? ` lends ${detail} so` : ""} ${bodyFocusLine(bodyKey, "Top")}`
      );
    }
    if (bottom) {
      const detail = highlightDetail(bottom);
      whyBullets.push(
        `${shortProductName(bottom)}${detail ? ` uses its ${detail} to ensure` : ""} ${bodyFocusLine(bodyKey, "Bottom")}`
      );
    }
  }
  if (outerwear) {
    const detail = highlightDetail(outerwear);
    whyBullets.push(
      `${shortProductName(outerwear)}${detail ? ` adds ${detail} so` : ""} ${bodyFocusLine(bodyKey, "Outerwear")}`
    );
  }
  if (shoes) {
    const detail = highlightDetail(shoes);
    whyBullets.push(
      `${shortProductName(shoes)}${detail ? ` deliver ${detail} so` : ""} ${bodyFocusLine(bodyKey, "Shoes")}`
    );
  }
  if (!whyBullets.length) {
    whyBullets.push(`Each element ${bodyBenefit || "keeps your proportions elevated"}.`);
  }

  const saveCategories: (OutfitCategory | "Dress")[] = dress
    ? ["Dress", "Outerwear", "Shoes", "Accessories"]
    : ["Top", "Bottom", "Outerwear", "Shoes", "Accessories"];

  const saveLines: string[] = [];
  for (const category of saveCategories) {
    const pool = candidateMap[category] || [];
    const selected = selectedMap[category];
    let fallback =
      pool
        .filter((entry) => entry.product.id !== (selected?.id ?? ""))
        .sort((a, b) => (Number.isFinite(a.price) ? a.price : Infinity) - (Number.isFinite(b.price) ? b.price : Infinity))[0]
        ?.product ?? null;
    if (!fallback) {
      const fallbackId = fallbackIdsForCategory(category, museName, curatedLook).find(
        (id) => id && id !== (selected?.id ?? "")
      );
      if (fallbackId) {
        const extra = getCatalogProductById(fallbackId);
        if (extra && !usedIds.has(extra.id)) {
          fallback = extra;
        }
      }
    }
    if (fallback) {
      saveLines.push(formatAlternateLine(category === "Dress" ? "Dress" : category, fallback));
    } else {
      const label = category === "Dress" ? "Dress" : category;
      saveLines.push(
        `- ${label}: Hero piece already the sharpest value—ask for a budget-friendly swap and I’ll source it instantly.`
      );
    }
  }

  const remixIdeas: string[] = [];
  if (top && bottom) {
    const altTopProduct = candidateTop.find((entry) => entry.product.id !== top.id)?.product;
    if (altTopProduct) {
      remixIdeas.push(
        `Trade ${shortProductName(top)} for ${shortProductName(altTopProduct)} and the ${shortProductName(bottom)} for boardroom polish.`
      );
    } else if (altShoesProduct) {
      remixIdeas.push(
        `Half-tuck ${shortProductName(top)} into ${shortProductName(bottom)} and switch to ${shortProductName(altShoesProduct)} for relaxed city strolls.`
      );
    }
  }
  if (dress && outerwear) {
    remixIdeas.push(
      `Layer ${shortProductName(outerwear)} over ${shortProductName(dress)} with ${altShoesProduct ? shortProductName(altShoesProduct) : "sleek heels"} for after-dark drama.`
    );
  }
  if (outerwear && sceneDetails?.condition && isRainy) {
    remixIdeas.push(
      `Cinch ${shortProductName(outerwear)} with a slim belt when the ${sceneDetails.condition} rolls through ${sceneDetails.location || "the city"}.`
    );
  }
  if (accessories) {
    remixIdeas.push(
      `Pair the ${shortProductName(accessories)} with tailored suiting to carry the mood through the workweek.`
    );
  }
  if (!remixIdeas.length && shoes) {
    remixIdeas.push(
      `Style ${shortProductName(shoes)} with a silk slip skirt and crisp tee for weekend elegance.`
    );
  }
  const remixLines = uniqueStrings(remixIdeas).slice(0, 3);

  const tips: string[] = [];
  const pushTip = (tip: string) => {
    if (!tip) return;
    if (tips.includes(tip)) return;
    tips.push(tip);
  };
  if (bodyBenefit) {
    pushTip(`Tip: Prioritise tailoring that ${bodyBenefit}.`);
  }
  if (sceneDetails?.condition && outerwear) {
    if (isRainy) {
      pushTip(`Tip: Mist-proof the ${shortProductName(outerwear)} and keep a slim umbrella on hand for the ${sceneDetails.condition}.`);
    } else if (sceneDetails.condition.includes("breeze")) {
      pushTip(`Tip: Add a silk scarf beneath ${shortProductName(outerwear)} when that ${sceneDetails.condition} lifts.`);
    }
  }
  const museTip = museSignatureTip(museName ?? null);
  if (museTip) pushTip(museTip);
  if (tips.length < 2 && fabricPalette.length) {
    pushTip(`Tip: Keep textures in ${formatList(fabricPalette, "polished fabrics")} for instant luxe.`);
  }
  if (tips.length < 2 && styleKeywords) {
    pushTip(`Tip: Keep accessories edited so the mood stays ${styleKeywords}.`);
  }
  if (tips.length < 2) {
    pushTip("Tip: Finish with sculpted jewellery to keep the focus elevated.");
  }
  const tipLines = tips.slice(0, 2);

  const lines: string[] = [];
  lines.push(introLine);
  if (sceneLine) lines.push(sceneLine);
  lines.push(paletteLine);
  lines.push(silhouetteLine);
  lines.push("");
  lines.push("Outfit:");
  if (dress) {
    lines.push(formatProductLine("Dress", dress));
  } else {
    lines.push(top ? formatProductLine("Top", top) : "- Top: N/A");
    lines.push(bottom ? formatProductLine("Bottom", bottom) : "- Bottom: N/A");
  }
  lines.push(outerwear ? formatProductLine("Outerwear", outerwear) : "- Outerwear: N/A");
  lines.push(shoes ? formatProductLine("Shoes", shoes) : "- Shoes: N/A");
  lines.push(accessories ? formatProductLine("Accessories", accessories) : "- Accessories: N/A");
  lines.push("");
  lines.push("Alternates:");
  lines.push(altShoesLine);
  lines.push(altOuterLine);
  lines.push("");
  lines.push("Why it Flatters:");
  for (const bullet of whyBullets.slice(0, 3)) {
    lines.push(`- ${bullet}`);
  }
  lines.push("");
  lines.push("Budget:");
  lines.push(`- Total: ${totalDisplay} (Budget: ${budgetDisplay})`);
  if (overBudget) {
    lines.push("- Note: Tap the save picks below to glide back within budget.");
  }
  if (unknownPrices) {
    lines.push("- Note: *A couple of prices need a quick click-through; totals reflect confirmed pieces.");
  }
  lines.push("");
  lines.push("Save Picks:");
  for (const save of saveLines) {
    lines.push(save);
  }
  lines.push("");
  lines.push("Capsule & Tips:");
  for (const idea of remixLines) {
    lines.push(`- Remix: ${idea}`);
  }
  for (const tip of tipLines) {
    lines.push(tip.startsWith("Tip:") ? `- ${tip}` : `- Tip: ${tip}`);
  }
  lines.push("");
  lines.push(
    "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎"
  );

  return lines.join("\n");
}


function museSignatureTip(museName: string | null | undefined): string | null {
  if (!museName) return null;
  const lower = museName.toLowerCase();
  if (lower.includes("zendaya"))
    return "Tip: Finish with sculptural jewellery and a sleek beauty look to mirror Zendaya’s red-carpet polish.";
  if (lower.includes("jennifer") && lower.includes("lawrence"))
    return "Tip: Keep accessories tonal and minimal to honour Jennifer Lawrence’s quiet-luxury uniform.";
  if (lower.includes("blake") && lower.includes("lively"))
    return "Tip: Introduce one playful colour-pop accessory the way Blake loves to for instant glamour.";
  if (lower.includes("hailey"))
    return "Tip: Go for glossy neutral makeup and razor-sharp tailoring to nail Hailey Bieber’s street-style ease.";
  if (lower.includes("rihanna"))
    return "Tip: Add a high-low twist—think sporty layer or bold accessory—to channel Rihanna’s fearless mix.";
  if (lower.includes("beyonc"))
    return "Tip: Elevate the finish with statement jewels and luminous skin à la Beyoncé.";
  return `Tip: Keep the finishing touches intentional to echo ${museName}’s signature polish.`;
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
  styleKeywords,
  scene,
}: {
  look: CuratedLook;
  products: Product[];
  bodyType: string | null;
  bodyKey: BodyKey;
  museName: string | null;
  occasion: string | null;
  currency: string;
  budget?: number | null;
  styleKeywords?: string | null;
  scene?: SceneDetails | null;
}): string | null {
  const map = new Map<string, Product>();
  for (const p of products) {
    map.set(p.id, p);
    map.set(p.url, p);
  }

  const ensureProduct = (id: string) => {
    if (!id) return undefined;
    let product = map.get(id);
    if (!product) {
      const fallback = getCatalogProductById(id);
      if (fallback) {
        product = fallback;
        map.set(fallback.id, fallback);
        map.set(fallback.url, fallback);
      }
    }
    return product;
  };

  const requiredIds: string[] = [];
  const usesDress = Boolean(look.hero.dress);
  if (usesDress && look.hero.dress) {
    requiredIds.push(look.hero.dress);
  } else {
    requiredIds.push(look.hero.top || "", look.hero.bottom || "");
  }
  requiredIds.push(look.hero.outerwear || "", look.hero.shoes || "", look.hero.accessories || "");
  const heroes = requiredIds.map((id) => ensureProduct(id));
  if (heroes.some((p) => !p)) return null;

  let index = 0;
  let dress: Product | null = null;
  let top: Product | null = null;
  let bottom: Product | null = null;
  if (usesDress) {
    dress = heroes[index++] as Product;
  } else {
    top = heroes[index++] as Product;
    bottom = heroes[index++] as Product;
  }
  const outerwear = heroes[index++] as Product;
  const shoes = heroes[index++] as Product;
  const accessories = heroes[index++] as Product;

  const introMuse = museName ? `${museName}’s` : "your muse’s";
  const occasionLabel = occasion ? occasion.toLowerCase() : "moment";
  const introLine = `For a ${occasionLabel} moment, I’m distilling ${introMuse} ${look.vibe}.`;
  const bodyBenefit = describeBodyTypeBenefit(bodyType).replace(/\.$/, "");
  const bodyDetail = bodyType
    ? `It honours your ${bodyType.toLowerCase()} shape so ${bodyBenefit}.`
    : "Each piece is cut to flatter head-to-toe.";
  const sceneLine = sceneNarrativeLine(scene ?? null, occasion, styleKeywords);
  const paletteLine = `Palette & Textures: ${look.palette}; think ${look.vibe}.`;
  const silhouetteLine = `Silhouette Focus: ${bodyBenefit}.`;

  const lines: string[] = [];
  lines.push(`${introLine} ${bodyDetail}`.trim());
  if (sceneLine) lines.push(sceneLine);
  lines.push(paletteLine);
  lines.push(silhouetteLine);
  lines.push("");
  lines.push("Outfit:");
  if (dress) {
    lines.push(formatProductLine("Dress", dress));
  } else {
    lines.push(formatProductLine("Top", top!));
    lines.push(formatProductLine("Bottom", bottom!));
  }
  lines.push(formatProductLine("Outerwear", outerwear));
  lines.push(formatProductLine("Shoes", shoes));
  lines.push(formatProductLine("Accessories", accessories));
  lines.push("");

  lines.push("Alternates:");
  const altShoes = ensureProduct(look.alternates.shoes);
  const altOuter = ensureProduct(look.alternates.outerwear);
  lines.push(
    altShoes
      ? formatAlternateLine("Shoes", altShoes)
      : "- Shoes: Hero pair is locked—say 'alternate shoes' and I’ll pull a fresh contender on the spot."
  );
  lines.push(
    altOuter
      ? formatAlternateLine("Outerwear", altOuter)
      : "- Outerwear: Current layer is the sharpest match—ask for an outerwear swap and I’ll serve a new option instantly."
  );
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
  const spendHeroes = dress
    ? [dress, outerwear, shoes, accessories]
    : [top!, bottom!, outerwear, shoes, accessories];
  let total = 0;
  for (const product of spendHeroes) {
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
  const categories = usesDress
    ? ["Dress", "Outerwear", "Shoes", "Accessories"]
    : ["Top", "Bottom", "Outerwear", "Shoes", "Accessories"];
  lines.push("Save Picks:");
  if (needSave && look.save) {
    for (const category of categories) {
      const save = look.save.find((s) => s.category === category);
      if (!save) {
        lines.push(
          `- ${category}: Hero piece already the sharpest value—ask for a budget-friendly swap and I’ll source it instantly.`
        );
        continue;
      }
      const prod = ensureProduct(save.productId);
      lines.push(
        prod
          ? formatAlternateLine(category, prod)
          : `- ${category}: Hero piece already the sharpest value—ask for a budget-friendly swap and I’ll source it instantly.`
      );
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
        const isGreetingOnly = isGreetingLike(ask);
        const transcript = clientMessages
          .map((m) => contentToText(m.content))
          .filter(Boolean)
          .join(" \n");
        const bodyType = detectBodyType(`${transcript}\n${ask}`, preferences.bodyType);
        const occasion = detectOccasion(`${ask}\n${transcript}`);
        const muse = detectMuse(`${ask}\n${transcript}`);
        const hasBodyType = Boolean(bodyType);
        const hasOccasion = Boolean(occasion);
        const normalizedMuse = normalizeMuseName(muse);
        const normalizedOccasion = normalizeOccasionLabel(occasion);
        const curatedLook = matchCuratedLook(normalizedMuse, normalizedOccasion);
        const scene = extractSceneDetails(`${ask} ${transcript}`, normalizedMuse);
        const bodyKey = bodyKeyFrom(bodyType);
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
          scene,
        });

        push({ type: "assistant_draft_delta", data: `${warmGreeting}\n` });
        push({ type: "assistant_draft_delta", data: `${infoLine}\n\n` });

        if (!hasBodyType || !hasOccasion) {
          push({ type: "assistant_draft_done" });
          const contextBits: string[] = [];
          if (muse) contextBits.push(`Muse locked: ${muse}.`);
          if (hasBodyType && bodyType) contextBits.push(`Body type: ${bodyType}.`);
          if (preferences.styleKeywords) contextBits.push(`Vibe: ${preferences.styleKeywords}.`);
          if (preferences.budget) contextBits.push(`Budget: ${preferences.budget} ${cur}.`);
          const needLine = missingParts.length
            ? `Share your ${missingParts.join(" & ")} and I’ll deliver the full shoppable lineup on the spot.`
            : "Give me a touch more direction and I’ll style you instantly.";
          const finalMessage = [
            warmGreeting,
            contextBits.join(" ").trim(),
            needLine,
            "",
            "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
          ]
            .filter((line) => line && line.trim().length > 0)
            .join("\n");
          push({ type: "assistant_final", data: finalMessage });
          push({ type: "done" });
          return;
        }

        if (isGreetingOnly) {
          push({ type: "assistant_draft_done" });
          const occLabel = occasion ? occasion.toLowerCase() : "look";
          const contextLine = muse
            ? `Your ${muse} ${occLabel} direction is saved and ready whenever you want a tweak.`
            : `Your ${occLabel} direction is saved and ready whenever you want a tweak.`;
          const bodyLine = bodyType
            ? `Just say the word if you’d like to refine it for your ${bodyType.toLowerCase()} silhouette or explore a new muse.`
            : "Just say the word if you’d like a fresh muse, palette, or silhouette.";
          const finalMessage = [
            warmGreeting,
            contextLine,
            bodyLine,
            "",
            "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
          ]
            .filter((line) => line && line.trim().length > 0)
            .join("\n");
          push({ type: "assistant_final", data: finalMessage });
          push({ type: "done" });
          return;
        }

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

        let products = await searchProducts({
          query,
          country: preferences.country || "NL",
          currency,
          limit: 12,
          preferEU: (preferences.country || "NL") !== "US",
        });

        if (curatedLook) {
          const existingIds = new Set(products.map((p) => p.id));
          const curatedPool = [
            curatedLook.hero.top,
            curatedLook.hero.bottom,
            curatedLook.hero.outerwear,
            curatedLook.hero.shoes,
            curatedLook.hero.accessories,
            curatedLook.alternates.shoes,
            curatedLook.alternates.outerwear,
            ...(curatedLook.save?.map((entry) => entry.productId) ?? []),
          ];
          const augmented: Product[] = [];
          for (const id of curatedPool) {
            if (!id) continue;
            const product = getCatalogProductById(id);
            if (product && !existingIds.has(product.id)) {
              existingIds.add(product.id);
              augmented.push(product);
            }
          }
          if (augmented.length) {
            products = [...products, ...augmented];
          }
        }

        const seenIds = new Set(products.map((p) => p.id));
        const seenUrls = new Set(products.map((p) => p.url));
        const coverage: Record<OutfitCategory, number> = {
          Top: 0,
          Bottom: 0,
          Dress: 0,
          Outerwear: 0,
          Shoes: 0,
          Accessories: 0,
        };
        for (const product of products) {
          const category = guessCategory(product);
          if (category) coverage[category] = (coverage[category] || 0) + 1;
        }

        const preferDress = shouldFavorDress(
          normalizedOccasion ?? occasion ?? null,
          `${ask} ${transcript} ${preferences.styleKeywords ?? ""}`
        );
        const targetedCategories: OutfitCategory[] = [];
        if (coverage.Top === 0) targetedCategories.push("Top");
        if (coverage.Bottom === 0) targetedCategories.push("Bottom");
        if (coverage.Outerwear === 0) targetedCategories.push("Outerwear");
        if (coverage.Shoes === 0) targetedCategories.push("Shoes");
        if (coverage.Accessories === 0) targetedCategories.push("Accessories");
        if (preferDress && coverage.Dress === 0) targetedCategories.push("Dress");

        if (targetedCategories.length) {
          const targetedResults = await Promise.all(
            targetedCategories.map(async (category) => {
              const query = buildCategoryQuery({
                category,
                ask,
                muse: normalizedMuse ?? muse,
                occasion: normalizedOccasion ?? occasion,
                bodyType,
                styleKeywords: preferences.styleKeywords ?? null,
                budget: preferences.budget ?? null,
                currency,
                scene,
              });
              if (!query) return [];
              try {
                return await searchProducts({
                  query,
                  country: preferences.country || "NL",
                  currency,
                  limit: category === "Accessories" ? 6 : 5,
                  preferEU: (preferences.country || "NL") !== "US",
                });
              } catch (error) {
                console.error(`[RunwayTwin] targeted search ${category}:`, error);
                return [];
              }
            })
          );

          for (const list of targetedResults) {
            for (const product of list) {
              if (seenIds.has(product.id) || seenUrls.has(product.url)) continue;
              seenIds.add(product.id);
              seenUrls.add(product.url);
              products.push(product);
            }
          }
        }

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
            "After the intro, add a single 'Palette & Textures:' line naming the colour story and fabrics, then a 'Silhouette Focus:' line explaining how the look flatters their body type.",
            "Return a complete outfit: Top, Bottom (or Dress), Outerwear, Shoes, Accessories.",
            "Each outfit line must read '<Category>: <Brand> — <Exact Item> | <Price> <Currency> | <Retailer> | <URL> | <ImageURL or N/A>' and use real Candidate Products.",
            "If any required link or image is missing from candidates, say so and mark it as N/A rather than inventing details.",
            "Explain why the look flatters the body type with fabric, rise, drape, tailoring, and proportions, weaving in the celebrity muse's signature vibe.",
            "Respect the stated budget. Show the total; when over budget, add Save Picks with real links and sharper price points.",
            "Always include Alternates for shoes AND outerwear with links; if no second item exists, reassure the client you'll source it on request rather than writing N/A.",
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
          const fallbackMuse = normalizedMuse ?? muse;
          const fallbackOccasion = normalizedOccasion ?? occasion;

          if (!hasBodyType || !hasOccasion) {
            const greetingLine = fallbackMuse
              ? `Hello love — I’m ready to channel ${fallbackMuse}.`
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
            const curatedText = curatedLook
              ? buildCuratedPlan({
                  look: curatedLook,
                  products,
                  bodyType,
                  bodyKey,
                  museName: fallbackMuse,
                  occasion: fallbackOccasion,
                  currency,
                  budget: preferences.budget ?? null,
                  styleKeywords: preferences.styleKeywords ?? null,
                  scene,
                })
              : null;

            finalText =
              curatedText ??
              buildProductFallbackPlan({
                products,
                bodyType,
                museName: fallbackMuse,
                occasion: fallbackOccasion,
                currency,
                budget: preferences.budget ?? null,
                curatedLook,
                styleKeywords: preferences.styleKeywords ?? null,
                scene,
              });
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
