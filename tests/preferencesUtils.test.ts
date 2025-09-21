import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/lib/preferences/types";
import { mergePreferences, sanitizePreferences } from "@/lib/preferences/utils";

describe("preferences utils", () => {
  it("merges overrides with sanitization", () => {
    const merged = mergePreferences(DEFAULT_PREFERENCES, {
      sizes: { top: " xs ", bottom: " 28" },
      country: "nl ",
      bodyType: "Hourglass",
      styleKeywords: ["Avant-Garde", "avant-garde", 42 as any, ""],
      height: " 170cm ",
      weight: " 60kg ",
    });

    expect(merged.sizes.top).toBe("XS");
    expect(merged.sizes.bottom).toBe("28");
    expect(merged.country).toBe("NL");
    expect(merged.bodyType).toBe("hourglass");
    expect(merged.styleKeywords).toEqual(["Avant-Garde"]);
    expect(merged.height).toBe("170cm");
    expect(merged.weight).toBe("60kg");
  });

  it("ignores invalid gender overrides", () => {
    const base = { ...DEFAULT_PREFERENCES, gender: "female" as const };
    const merged = mergePreferences(base, { gender: "dragon" as any });
    expect(merged.gender).toBe("female");
  });

  it("limits style keyword length and count", () => {
    const many = Array.from({ length: 20 }, (_, index) => `keyword-${index}`);
    const sanitized = sanitizePreferences({ styleKeywords: many });
    expect(sanitized.styleKeywords.length).toBeLessThanOrEqual(12);
    expect(sanitized.styleKeywords.every((word) => word.length <= 40)).toBe(true);
  });

  it("allows clearing stored sizes", () => {
    const base = { ...DEFAULT_PREFERENCES, sizes: { top: "M" } };
    const merged = mergePreferences(base, { sizes: { top: "" } });
    expect(merged.sizes.top).toBe("");
  });
});
