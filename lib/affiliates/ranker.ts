// FILE: lib/affiliates/ranker.ts
import type { Product } from "./types";
import type { Prefs } from "@/lib/types";
import { convert, normalizeCode, currencyFromCountry, type IsoCurrency } from "./currency";

type RankInput = {
  products: Product[];
  query: string;
  prefs?: Prefs;
};

/**
 * Heuristic scorer (0..∞). Higher is better.
 * Components:
 * - Query/title/brand match
 * - Keyword overlap
 * - Gender compatibility
 * - Budget proximity in *target currency*
 * - Size compatibility (if available)
 */
export function rankProducts({ products, query, prefs }: RankInput): Product[] {
  const q = query.toLowerCase().trim();
  const kw: string[] =
    prefs?.keywords?.map((k) => k.toLowerCase().trim()).filter(Boolean) ?? [];
  const desiredGender = prefs?.gender;

  // ► Choose a target currency purely from country (no Prefs.currency in this codebase)
  const targetCurrency: IsoCurrency = currencyFromCountry(prefs?.country) ?? "EUR";

  const budgetInfo = parseBudget(prefs?.budget, targetCurrency);

  const scored = products.map((p) => {
    const title = p.title.toLowerCase();
    const brand = (p.brand ?? "").toLowerCase();

    // 1) Query relevance
    let score =
      (title.includes(q) ? 3 : 0) +
      (brand && q.includes(brand) ? 1 : 0);

    // 2) Keyword overlap
    if (kw.length) {
      const hay = `${title} ${brand} ${(p.attrs ? JSON.stringify(p.attrs) : "")}`.toLowerCase();
      const overlap = kw.reduce((acc, k) => acc + (hay.includes(k) ? 1 : 0), 0);
      score += overlap * 0.75;
    }

    // 3) Gender compatibility
    const fitGender = p.fit?.gender;
    if (desiredGender) {
      if (!fitGender || fitGender === "unisex") score += 0.25;
      else if (fitGender === desiredGender) score += 1.0;
      else score -= 0.5;
    }

    // 4) Budget proximity (convert prices into targetCurrency)
    if (typeof p.price === "number" && budgetInfo) {
      const productPrice = convert(p.price, p.currency, targetCurrency);
      const d = Math.abs(productPrice - budgetInfo.value);
      const rel = d / Math.max(1, budgetInfo.value);
      const clamp = Math.max(0, 1 - rel); // closer → closer to 1
      score += clamp * 2.0;

      // Tiny bump if product currency already matches target
      const pCur = normalizeCode(p.currency);
      if (pCur && pCur === targetCurrency) score += 0.15;
    }

    // 5) Sizes compatibility
    const wantSizes = prefs?.sizes;
    const haveSizes = p.fit?.sizes;
    if (wantSizes && haveSizes && haveSizes.length) {
      const desiredVals = Object.values(wantSizes)
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => v.trim().toLowerCase());

      if (desiredVals.length) {
        const haveLower = new Set(
          (haveSizes as Array<string | number>)
            .map((s) => String(s).trim().toLowerCase())
            .filter((s) => s.length > 0)
        );
        const hits = desiredVals.reduce((acc, s) => acc + (haveLower.has(s) ? 1 : 0), 0);
        score += hits * 0.5;
      }
    }

    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.p);
}

function parseBudget(
  b: string | undefined,
  currency: IsoCurrency
): { value: number; currency: IsoCurrency } | null {
  if (!b) return null;
  // Accept "€300–€600", "500", "500 EUR", etc.
  const nums = Array.from(b.matchAll(/\d+(?:[.,]\d+)?/g)).map((m) =>
    Number(m[0].replace(",", "."))
  );
  if (!nums.length) return null;
  const avg = nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
  return { value: Math.max(0, Math.round(avg)), currency };
}
