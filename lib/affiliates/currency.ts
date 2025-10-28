// FILE: lib/affiliates/currency.ts
/**
 * Simple, mock-safe currency utilities.
 * - No network calls
 * - Deterministic rates (update when needed)
 * - Supports common ISO 4217 codes we may see from providers
 */

export type IsoCurrency = "EUR" | "USD" | "GBP" | "JPY";

const FX_TABLE: Record<IsoCurrency, number> = {
  // Base = EUR (1.0). Update occasionally.
  EUR: 1.0,
  USD: 1.08,
  GBP: 0.85,
  JPY: 170.0,
};

export function normalizeCode(c?: string): IsoCurrency | null {
  if (!c) return null;
  const up = c.trim().toUpperCase();
  if (up === "€" || up === "EUR") return "EUR";
  if (up === "$" || up === "USD") return "USD";
  if (up === "£" || up === "GBP") return "GBP";
  if (up === "JPY" || up === "¥") return "JPY";
  return (["EUR", "USD", "GBP", "JPY"] as const).includes(up as IsoCurrency)
    ? (up as IsoCurrency)
    : null;
}

/** Best-effort guess from a country code. Very small set for our use. */
export function currencyFromCountry(country?: string): IsoCurrency | null {
  if (!country) return null;
  const up = country.trim().toUpperCase();
  if (up === "NL" || up === "DE" || up === "FR" || up === "ES" || up === "IT") return "EUR";
  if (up === "US" || up === "USA") return "USD";
  if (up === "GB" || up === "UK") return "GBP";
  if (up === "JP") return "JPY";
  return null;
}

/**
 * Convert numeric amount between currencies using a fixed table.
 * If either currency is unknown, returns the original amount.
 */
export function convert(amount: number, from?: string, to?: string): number {
  const f = normalizeCode(from);
  const t = normalizeCode(to);
  if (!f || !t) return amount;
  if (f === t) return amount;
  // Convert via EUR base
  const inEur = amount / FX_TABLE[f];
  const out = inEur * FX_TABLE[t];
  return out;
}
