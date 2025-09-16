import { describe, it, expect } from "vitest";
import { parseOutfit } from "@/lib/look/parseOutfit";

describe("parseOutfit", () => {
  it("extracts outfit items with price, retailer, link, and image", () => {
    const text = `Vibe: sleek minimalism.\n\nOutfit:\n- Top — Totême Contour Ribbed Top (EUR 190, NET-A-PORTER) · https://www.net-a-porter.com/product · Image: https://images.net-a-porter.com/hero.jpg\n- Shoes — The Row Adela Boots (EUR 1190, SSENSE) · https://www.ssense.com/product · Image: https://res.cloudinary.com/boot.jpg\n\nBody Notes:\n- Balanced lines.\n`;

    const items = parseOutfit(text);
    expect(items).toHaveLength(2);
    expect(items[0].category).toBe("Top");
    expect(items[0].brandItem).toContain("Totême");
    expect(items[0].price).toBe("EUR 190");
    expect(items[0].retailer).toBe("NET-A-PORTER");
    expect(items[0].link).toContain("net-a-porter");
    expect(items[0].image).toContain("hero.jpg");
  });

  it("ignores non-bullet lines and handles missing fields", () => {
    const text = `Outfit:\n- Accessories — Mejuri Bold Hoop Earrings (, Mejuri) · https://mejuri.com\nRandom note\n- Bag — Celine Triomphe Shoulder Bag (EUR 2900, 24S) · https://www.24s.com · Image: https://cdn.com/bag.jpg`;
    const items = parseOutfit(text);
    expect(items).toHaveLength(2);
    expect(items[0].price).toBeUndefined();
    expect(items[1].image).toContain("bag.jpg");
  });
});
