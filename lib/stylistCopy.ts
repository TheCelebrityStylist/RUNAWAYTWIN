// FILE: lib/stylistCopy.ts
import type { Product as LookProduct, SlotName, StylePlan } from "@/lib/style/types";

const BANNED = [
  "time cap",
  "cap",
  "timeout",
  "deployment",
  "still searching for",
  "want me to loosen",
  "inventory is thin",
  "nothing meets the standard",
];

function scrub(text: string): string {
  let out = text;
  for (const bad of BANNED) {
    const pattern = bad === "cap" ? "\\bcap\\b" : bad;
    const rx = new RegExp(pattern, "gi");
    out = out.replace(rx, " ");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

export function renderOpening(plan: StylePlan): string {
  const opening = plan.stylist_script.opening_lines.join(" ");
  const direction = plan.stylist_script.direction_line;
  const line = [opening, direction, "I’m starting with the anchor first — that sets the line."].join(" ");
  return scrub(line);
}

export function renderLoadingLine(plan: StylePlan, tick: number): string {
  const lines = plan.stylist_script.loading_lines;
  if (!lines.length) return "I’m starting with the anchor piece — that sets the tone.";
  return scrub(lines[tick % lines.length]);
}

export function renderFinal(plan: StylePlan, products: LookProduct[]): string {
  const opening = [
    `Okay — ${plan.preferences.prompt || "I’ve got you."}`,
    "This needs to feel intentional and composed, not overworked.",
    "I’m keeping the line sharp so you feel confident the moment you walk in.",
  ].join(" ");
  const direction = `We’re going for ${plan.aesthetic_read.toLowerCase()}.`;
  const parts: string[] = [scrub(opening), scrub(direction), "Let’s build it."];
  const order: SlotName[] = ["anchor", "top", "bottom", "dress", "shoe", "accessory"];
  for (const slot of order) {
    const item = products.find((p) => p.slot === slot);
    if (!item) continue;
    const label =
      slot === "anchor"
        ? "Anchor"
        : slot === "shoe"
          ? "Footwear"
          : slot === "accessory"
            ? "Optional accent"
            : slot.charAt(0).toUpperCase() + slot.slice(1);
    const commentary = plan.stylist_script.item_commentary_templates[slot];
    parts.push(
      scrub(
        `${label}: ${item.brand} — ${item.title} — ${item.currency} ${item.price} — ${item.retailer}. ${commentary}`
      )
    );
  }
  const total = products.reduce((acc, p) => acc + p.price, 0);
  parts.push(`Estimated total: ${plan.currency} ${Math.round(total)}.`);
  parts.push("Keep the accessories restrained and let the cut do the talking.");
  return scrub(parts.join("\n"));
}

export function renderBlueprint(plan: StylePlan): string {
  const opening = [
    `Okay — ${plan.preferences.prompt || "I’ve got you."}`,
    "I’m giving you a clean blueprint so you can shop with confidence.",
  ].join(" ");
  const direction = `We’re going for ${plan.aesthetic_read.toLowerCase()}.`;
  const blueprint = [
    "Let’s build it.",
    "Anchor: structured coat or sharp blazer with clean shoulders.",
    "Core: straight-leg trouser or a sleek dress in matte fabric.",
    "Footwear: pointed boot or sharp slingback with a stable heel.",
    "Try searching: COS structured coat black · Zara tailored trouser high waist · & Other Stories pointed slingback.",
  ].join(" ");
  return scrub([opening, direction, blueprint].join(" "));
}

export function renderError(plan: StylePlan): string {
  const line = [
    `Okay — ${plan.preferences.prompt || "I’ve got you."}`,
    "I’m resetting the plan and keeping the line clean.",
    "Give me a quick moment and I’ll rebuild this with the same direction.",
  ].join(" ");
  return scrub(line);
}

export function renderMissingTile(slot: SlotName): { title: string; suggestion: string } {
  const title = "No match found";
  const suggestion =
    slot === "anchor"
      ? "Swap: structured coat or sharp blazer."
      : slot === "top"
        ? "Swap: clean knit or crisp shirt."
        : slot === "bottom"
          ? "Swap: straight-leg trouser."
          : slot === "dress"
            ? "Swap: slip dress in matte fabric."
            : slot === "shoe"
              ? "Swap: pointed slingback or sleek boot."
              : "Swap: minimal shoulder bag.";
  return { title: scrub(title), suggestion: scrub(suggestion) };
}

export function renderStylistText(args: {
  mode: "opening" | "loading" | "final" | "blueprint" | "error";
  plan: StylePlan;
  products?: LookProduct[];
  tick?: number;
}): string {
  const { mode, plan, products = [], tick = 0 } = args;
  if (mode === "opening") return renderOpening(plan);
  if (mode === "loading") return renderLoadingLine(plan, tick);
  if (mode === "final") return renderFinal(plan, products);
  if (mode === "blueprint") return renderBlueprint(plan);
  return renderError(plan);
}
