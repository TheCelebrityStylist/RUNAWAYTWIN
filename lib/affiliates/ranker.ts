// FILE: lib/affiliates/ranker.ts
import type { Product } from "./types";
import type { Prefs } from "@/lib/types";

type RankInput = {
  products: Product[];
  query: string;
  prefs?: Prefs;
};

/**
 * Heuristic scorer (0..∞). Higher is better.
 * We combine:
 * - Query/title/brand match
 * - Gender/unisex compatibility
 * - Budget proximity (soft)
 * - Size "availability" hint if provider includes sizes
 * - Style keywords overlap
 */
export function rankProducts({ products, query, prefs }: RankInput): Product[] {
  const q = query.toLowerCase().trim();
  const kw: string[] =
    prefs?.keywords?.map((k) => k.toLowerCase().trim()).filter(Boolean) ?? [];
  const desiredGender = prefs?.gender; // "female" | "male" | "other" (we’ll treat "other" as unisex)
  const budget = parseBudget(prefs?.budget);

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
      if (!fitGender || fitGender === "unisex") score += 0.25; // neutral bump
      else if (fitGender === desiredGender) score += 1.0;
      else score -= 0.5; // small penalty if explicitly mismatched
    }

    // 4) Budget proximity (soft distance)
    if (typeof p.price === "number" && budget) {
      const d = Math.abs(p.price - budget.value);
      // closer is better; within 20% gets most credit
      const rel = d / Math.max(1, budget.value);
      const clamp = Math.max(0, 1 - rel);
      score += clamp * 2.0;
      // small currency bump if matches prefs currency
      if (budget.currency && (!p.currency || p.currency === budget.currency)) score += 0.25;
    }

    // 5) Sizes compatibility (if provider exposes it)
    const wantSizes = prefs?.sizes;
    const haveSizes = p.fit?.sizes;
    if (wantSizes && haveSizes && haveSizes.length) {
      const desiredVals = Object.values(wantSizes).filter(Boolean).map(String.toLowerCase);
      if (desiredVals.length) {
        const haveLower = new Set(haveSizes.map((s) => s.toLowerCase()));
        const hits = desiredVals.reduce((acc, s) => acc + (haveLower.has(s) ? 1 : 0), 0);
        score += hits * 0.5;
      }
    }

    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.p);
}

function parseBudget(b?: string): { value: number; currency?: string } | null {
  if (!b) return null;
  // Accept formats like "€300–€600" or "500" or "500 EUR"
  const nums = Array.from(b.matchAll(/\d+(?:[.,]\d+)?/g)).map((m) => Number(m[0].replace(",", ".")));
  if (!nums.length) return null;
  const avg = nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
  const currency = /€|eur/i.test(b) ? "EUR" : /usd|\$/i.test(b) ? "USD" : /gbp|£/i.test(b) ? "GBP" : undefined;
  return { value: Math.max(0, Math.round(avg)), currency };
}
