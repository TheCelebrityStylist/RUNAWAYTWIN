import type { Product } from "@/app/api/chat/tools/types";
import type { NormalizedChatPreferences } from "@/lib/chat/prefs";

function formatCurrency(amount: number, currency: string) {
  if (!Number.isFinite(amount)) return `${currency} —`;
  return `${currency} ${Math.round(amount)}`;
}

function safeHost(url: string | null | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export type OutfitPlan = {
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

export function pickOutfit(products: Product[]): OutfitPlan {
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

function describeFit(category: string, prefs: NormalizedChatPreferences): string {
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

function formatProductLine(
  label: string,
  product: Product | null | undefined,
  prefs: NormalizedChatPreferences,
  currency: string
) {
  if (!product) return null;
  const price = typeof product.price === "number" ? formatCurrency(product.price, product.currency ?? currency) : `${product.currency ?? currency} —`;
  const retailer = product.retailer ?? safeHost(product.url);
  const reasoning = describeFit(label.toLowerCase(), prefs);
  const image = product.imageUrl ? ` (Image: ${product.imageUrl})` : "";
  return `${label}: ${product.brand ?? ""} ${product.title ?? ""} — ${price} at ${retailer} → ${product.url}${image}\n  Why: ${reasoning}`;
}

function buildAlternates(plan: OutfitPlan, currency: string): string[] {
  const alternates: string[] = [];
  if (plan.outerwearAlt) {
    const price = typeof plan.outerwearAlt.price === "number"
      ? formatCurrency(plan.outerwearAlt.price, plan.outerwearAlt.currency ?? currency)
      : `${plan.outerwearAlt.currency ?? currency} —`;
    alternates.push(
      `Outerwear save: ${plan.outerwearAlt.brand ?? ""} ${plan.outerwearAlt.title ?? ""} — ${price} at ${plan.outerwearAlt.retailer ?? safeHost(plan.outerwearAlt.url)} → ${plan.outerwearAlt.url}`
    );
  }
  if (plan.shoesAlt) {
    const price = typeof plan.shoesAlt.price === "number"
      ? formatCurrency(plan.shoesAlt.price, plan.shoesAlt.currency ?? currency)
      : `${plan.shoesAlt.currency ?? currency} —`;
    alternates.push(
      `Shoes save: ${plan.shoesAlt.brand ?? ""} ${plan.shoesAlt.title ?? ""} — ${price} at ${plan.shoesAlt.retailer ?? safeHost(plan.shoesAlt.url)} → ${plan.shoesAlt.url}`
    );
  }
  return alternates;
}

function capsuleIdeas(prefs: NormalizedChatPreferences, plan: OutfitPlan): string[] {
  const palette = prefs.styleKeywordsList.slice(0, 2).join(" & ");
  const ideas: string[] = [];
  if (plan.top && plan.bottom) {
    ideas.push(`Pair the ${plan.top.brand ?? "top"} with the ${plan.bottom.brand ?? "bottom"} for a modern power tandem.`);
  }
  if (plan.dress && plan.outerwear) {
    ideas.push(`Layer the ${plan.dress.brand ?? "dress"} under the ${plan.outerwear.brand ?? "coat"} for after-dark drama.`);
  }
  if (!ideas.length && plan.outerwear && plan.shoes) {
    ideas.push(`Throw the ${plan.outerwear.brand ?? "outerwear"} over denim and the ${plan.shoes.brand ?? "shoes"} for elevated casual.`);
  }
  if (palette) {
    ideas.push(`Lean into your ${palette} palette by weaving in tonal knits or silk scarves.`);
  }
  return ideas.slice(0, 3);
}

function tipIdeas(prefs: NormalizedChatPreferences): string[] {
  const tips: string[] = [];
  if (prefs.bodyType) {
    tips.push(`Tip: tailor each piece to honour your ${prefs.bodyType} proportions—precision is the quiet luxury flex.`);
  }
  if (prefs.sizeBottom || prefs.sizeDress) {
    tips.push("Tip: request hems to skim the ankle so the line reads statuesque in photos.");
  }
  tips.push("Tip: finish with cohesive metals—match jewellery hardware to bag accents for polish.");
  return tips.slice(0, 3);
}

export function buildFallbackCopy(
  products: Product[],
  currency: string,
  ask: string,
  prefs: NormalizedChatPreferences
): string {
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

  const plan = pickOutfit(products);
  const bodyFocus = prefs.bodyType ? `Body type focus: ${prefs.bodyType}.` : "Balanced to flatter every line.";
  const muse = ask ? `Muse: “${ask}”.` : prefs.styleKeywordsText ? `Style DNA: ${prefs.styleKeywordsText}.` : "";

  const totalLine = `Total: ${formatCurrency(plan.total, currency)}`;
  const budgetLine =
    typeof prefs.budgetValue === "number"
      ? plan.total > prefs.budgetValue
        ? `Budget check: swap in the save picks to glide under ${currency} ${Math.round(prefs.budgetValue)}.`
        : `Budget check: we land within ~${currency} ${Math.round(prefs.budgetValue)}.`
      : "";

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

  const alternates = buildAlternates(plan, currency);
  const capsule = capsuleIdeas(prefs, plan);
  const tips = tipIdeas(prefs);

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
    ...capsule.map((line) => `- ${line}`),
    ...tips.map((line) => `- ${line}`),
    "",
    "Want more personalized seasonal wardrobe plans or unlimited style coaching? Upgrade for €19/month or €5 per additional styling session 💎",
  ]
    .filter(Boolean)
    .join("\n");
}
