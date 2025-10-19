import { describe, expect, it } from "vitest";

import { buildFallbackCopy, pickOutfit } from "@/lib/look/fallbackPlan";
import { getDemoCatalog } from "@/app/api/chat/tools/adapters/demo";
import { normalizeChatPreferences } from "@/lib/chat/prefs";

describe("fallback plan builder", () => {
  const prefs = normalizeChatPreferences({
    gender: "female",
    bodyType: "hourglass",
    budget: "€1500",
    country: "NL",
    styleKeywords: ["minimal", "tailored"],
  });

  it("returns sourcing copy when no products", () => {
    const text = buildFallbackCopy([], "EUR", "Zendaya for a premiere", prefs);
    expect(text).toContain("Still sourcing exact pieces");
    expect(text).toContain("Zendaya for a premiere");
  });

  it("formats a structured outfit when products exist", () => {
    const catalog = getDemoCatalog();
    const text = buildFallbackCopy(catalog.slice(0, 6), "EUR", "Taylor Russell gallery opening", prefs);
    expect(text).toContain("Outfit:");
    expect(text).toContain("Alternates:");
    expect(text).toContain("Capsule & Tips");
    expect(text).toMatch(/Why:/);
  });

  it("creates an outfit plan with alternates", () => {
    const catalog = getDemoCatalog();
    const plan = pickOutfit(catalog, "EUR");
    expect(plan.outerwear).toBeTruthy();
    expect(plan.outerwearAlt).toBeTruthy();
    expect(plan.selected.length).toBeGreaterThan(0);
  });
});
