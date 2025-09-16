import { describe, it, expect } from "vitest";
import { normalizeProductUrl, ensureAbsoluteUrl } from "@/lib/extract/url";

describe("URL helpers", () => {
  it("removes tracking params and hash fragments", () => {
    const url = "https://www.example.com/item?utm_source=foo&affid=123&color=black#section";
    expect(normalizeProductUrl(url)).toBe("https://www.example.com/item?color=black");
  });

  it("ensures URLs are absolute", () => {
    expect(ensureAbsoluteUrl("www.test.com/item")).toBe("https://www.test.com/item");
    expect(ensureAbsoluteUrl("https://ready.com")).toBe("https://ready.com/");
  });
});
