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
  {
    muses: ["hailey bieber", "hailey"],
    occasions: ["everyday", "weekend casual"],
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
}: {
  products: Product[];
  bodyType: string | null;
  museName?: string | null;
  occasion?: string | null;
  currency: string;
  budget?: number | null;
  curatedLook?: CuratedLook | null;
}): string {
  const targetCurrency = (currency || "EUR").toUpperCase();
  const bodyKey = bodyKeyFrom(bodyType);
  const museInfo = museTraitFor(museName);
  const occasionLabel = occasion ? occasion.toLowerCase() : "moment";

  const curatedIds = new Set<string>();
  if (curatedLook) {
    curatedIds.add(curatedLook.hero.top);
    curatedIds.add(curatedLook.hero.bottom);
    curatedIds.add(curatedLook.hero.outerwear);
    curatedIds.add(curatedLook.hero.shoes);
    curatedIds.add(curatedLook.hero.accessories);
    curatedIds.add(curatedLook.alternates.shoes);
    curatedIds.add(curatedLook.alternates.outerwear);
    if (curatedLook.save) {
      for (const entry of curatedLook.save) {
        curatedIds.add(entry.productId);
      }
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
        return { product, score, price: Number.isFinite(price) ? price : NaN };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.price || Infinity) - (b.price || Infinity);
      });
  };

  const rankedTop = rankCategory("Top");
  const rankedBottom = rankCategory("Bottom");
  const rankedDress = rankCategory("Dress");
  const rankedOuterwear = rankCategory("Outerwear");
  const rankedShoes = rankCategory("Shoes");
  const rankedAccessories = rankCategory("Accessories");

  let top: Product | null = rankedTop[0]?.product ?? null;
  let bottom: Product | null = rankedBottom[0]?.product ?? null;
  let dress: Product | null = null;

  if (rankedDress.length) {
    const dressScore = rankedDress[0].score;
    const separatesScore = (rankedTop[0]?.score ?? -Infinity) + (rankedBottom[0]?.score ?? -Infinity);
    if (!rankedTop.length || !rankedBottom.length || dressScore >= separatesScore - 0.5) {
      dress = rankedDress[0].product;
      top = null;
      bottom = null;
    }
  }

  let outerwear =
    rankedOuterwear[0]?.product ?? (curatedLook ? getCatalogProductById(curatedLook.hero.outerwear) : null);
  let shoes = rankedShoes[0]?.product ?? (curatedLook ? getCatalogProductById(curatedLook.hero.shoes) : null);
  let accessories =
    rankedAccessories[0]?.product ?? (curatedLook ? getCatalogProductById(curatedLook.hero.accessories) : null);

  const heroProducts = () => {
    const list: Product[] = [];
    if (top) list.push(top);
    if (bottom) list.push(bottom);
    if (dress) list.push(dress);
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

  if (budget) {
    let total = computeTotal(heroProducts());
    if (total > budget) {
      const selectionPairs: {
        category: OutfitCategory | "Dress";
        ranked: { product: Product; score: number; price: number }[];
        current: Product | null;
      }[] = [
        { category: "Dress", ranked: rankedDress, current: dress },
        { category: "Top", ranked: rankedTop, current: top },
        { category: "Bottom", ranked: rankedBottom, current: bottom },
        { category: "Outerwear", ranked: rankedOuterwear, current: outerwear },
        { category: "Shoes", ranked: rankedShoes, current: shoes },
        { category: "Accessories", ranked: rankedAccessories, current: accessories },
      ];

      for (const entry of selectionPairs) {
        if (!entry.current || !entry.ranked.length) continue;
        for (const candidate of entry.ranked) {
          if (candidate.product.id === entry.current.id) continue;
          if (heroProducts().some((p) => p.id === candidate.product.id)) continue;
          const swapped = heroProducts().map((item) =>
            item.id === entry.current!.id ? candidate.product : item
          );
          const newTotal = computeTotal(swapped);
          if (newTotal <= budget || newTotal < total) {
            switch (entry.category) {
              case "Top":
                top = candidate.product;
                break;
              case "Bottom":
                bottom = candidate.product;
                break;
              case "Dress":
                dress = candidate.product;
                top = null;
                bottom = null;
                break;
              case "Outerwear":
                outerwear = candidate.product;
                break;
              case "Shoes":
                shoes = candidate.product;
                break;
              case "Accessories":
                accessories = candidate.product;
                break;
            }
            total = newTotal;
            break;
          }
        }
        if (total <= budget) break;
      }
    }
  }

  const heroes = heroProducts();
  const total = computeTotal(heroes);
  const budgetDisplay = budget ? `${formatNumber(budget)} ${targetCurrency}` : "—";
  const totalDisplay = total > 0 ? `${formatNumber(total)} ${targetCurrency}` : "TBC";
  const overBudget = Boolean(budget && total > budget);

  const colourPalette = detectPalette(heroes);
  const fabricPalette = detectFabrics(heroes);
  const bodyBenefit = describeBodyTypeBenefit(bodyType).replace(/\.$/, "");

  const museLead = museInfo
    ? `Channeling ${museName}’s ${museInfo.intro} for your ${occasionLabel} moment,`
    : `For your ${occasionLabel} moment,`;
  const bodyLine = bodyType
    ? `every layer is cut to celebrate your ${bodyType.toLowerCase()} silhouette so it ${bodyBenefit}.`
    : "every layer is balanced for high-impact proportions.";
  const introLine = `${museLead} ${bodyLine}`.replace(/\s+/g, " ").trim();
  const paletteLine = `Palette: ${formatList(colourPalette, museInfo?.palette || "sleek neutrals")} • Textures: ${formatList(
    fabricPalette,
    museInfo?.fabrics || "precision tailoring"
  )}.`;

  const usedIds = new Set<string>(heroes.map((item) => item.id));

  const altShoesProduct =
    rankedShoes.find((entry) => !usedIds.has(entry.product.id))?.product ||
    (curatedLook ? getCatalogProductById(curatedLook.alternates.shoes) : null);
  const altOuterProduct =
    rankedOuterwear.find((entry) => !usedIds.has(entry.product.id))?.product ||
    (curatedLook ? getCatalogProductById(curatedLook.alternates.outerwear) : null);

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
        `${shortProductName(bottom)}${detail ? ` uses its ${detail} to ensure` : ""} ${bodyFocusLine(
          bodyKey,
          "Bottom"
        )}`
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
    const pool = buckets[category] || [];
    const fallback =
      pool
        .filter((product) => !usedIds.has(product.id))
        .sort((a, b) => {
          const priceA =
            typeof a.price === "number" ? convertPrice(a.price, a.currency, targetCurrency) : Infinity;
          const priceB =
            typeof b.price === "number" ? convertPrice(b.price, b.currency, targetCurrency) : Infinity;
          return priceA - priceB;
        })[0] ||
      (curatedLook
        ? getCatalogProductById(
            curatedLook.save?.find((entry) => entry.category === category)?.productId || ""
          )
        : null);

    if (fallback) {
      usedIds.add(fallback.id);
      const label = category === "Dress" ? "Dress" : category;
      saveLines.push(formatAlternateLine(label, fallback));
    } else {
      saveLines.push(`- ${category}: N/A`);
    }
  }

  const remixIdeas: string[] = [];
  if (top && bottom) {
    remixIdeas.push(
      `Half-tuck the ${shortProductName(top)} into the ${shortProductName(bottom)} and swap to sleek sneakers for daytime ease.`
    );
  }
  if (dress) {
    remixIdeas.push(`Layer a fine turtleneck under ${shortProductName(dress)} for gallery afternoons.`);
  }
  if (outerwear) {
    remixIdeas.push(`Throw ${shortProductName(outerwear)} over athleisure to elevate travel days.`);
  }
  if (accessories) {
    remixIdeas.push(`Pair the ${shortProductName(accessories)} with monochrome knits for weekend polish.`);
  }
  if (shoes) {
    remixIdeas.push(`Switch to the ${shortProductName(shoes)} with tailored denim for off-duty luxe.`);
  }
  const remixLines = uniqueStrings(remixIdeas).slice(0, 3);

  const tips: string[] = [];
  if (bodyBenefit) {
    tips.push(`Tip: Prioritise tailoring that ${bodyBenefit}.`);
  }
  const museTip = museSignatureTip(museName ?? null);
  if (museTip) tips.push(museTip);
  if (tips.length < 2 && fabricPalette.length) {
    tips.push(`Tip: Keep textures in ${formatList(fabricPalette, "polished fabrics")} for instant luxe.`);
  }
  if (tips.length < 2) {
    tips.push("Tip: Finish with sculpted jewellery to keep the focus elevated.");
  }
  const tipLines = tips.slice(0, 2);

  const lines: string[] = [];
  lines.push(introLine);
  lines.push(paletteLine);
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
  lines.push(altShoesProduct ? formatAlternateLine("Shoes", altShoesProduct) : "- Shoes: N/A");
  lines.push(altOuterProduct ? formatAlternateLine("Outerwear", altOuterProduct) : "- Outerwear: N/A");
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
    lines.push(`- ${tip.startsWith("Tip:") ? tip : `Tip: ${tip}`}`);
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

  const requiredIds = [
    look.hero.top,
    look.hero.bottom,
    look.hero.outerwear,
    look.hero.shoes,
    look.hero.accessories,
  ];
  const heroes = requiredIds.map((id) => ensureProduct(id));
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
  lines.push(`Palette: ${look.palette}.`);
  lines.push("");
  lines.push("Outfit:");
  lines.push(formatProductLine("Top", top));
  lines.push(formatProductLine("Bottom", bottom));
  lines.push(formatProductLine("Outerwear", outerwear));
  lines.push(formatProductLine("Shoes", shoes));
  lines.push(formatProductLine("Accessories", accessories));
  lines.push("");

  lines.push("Alternates:");
  const altShoes = ensureProduct(look.alternates.shoes);
  const altOuter = ensureProduct(look.alternates.outerwear);
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
      const prod = ensureProduct(save.productId);
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
