// FILE: lib/affiliates/currency.ts
// Minimal, dependency-free currency helpers used by the ranker.
// - normalizeCode: best-effort to coerce symbols/strings to ISO 4217 (uppercase)
// - currencyFromCountry: map common country codes to likely currency
// - convert: rough static FX conversion via EUR as pivot (safe offline)

export type IsoCurrency =
  | "EUR" | "USD" | "GBP" | "JPY" | "CHF" | "SEK" | "NOK" | "DKK"
  | "PLN" | "CZK" | "HUF" | "RON" | "TRY" | "AUD" | "CAD" | "CNY"
  | "HKD" | "SGD" | "KRW" | "INR" | "MXN" | "BRL" | "ZAR"
  | string;

/** Best-effort normalization: symbols → codes, trims, uppercases, 3 letters if looks like ISO. */
export function normalizeCode(code?: string | null): IsoCurrency | null {
  if (!code) return null;
  const s = String(code).trim();
  if (!s) return null;

  // Common symbols
  if (s === "€") return "EUR";
  if (s === "$") return "USD";
  if (s === "£") return "GBP";
  if (s === "¥") return "JPY";

  // Already ISO?
  const up = s.toUpperCase();
  if (/^[A-Z]{3}$/.test(up)) return up;

  // Words / locales that often arrive from providers
  const map: Record<string, IsoCurrency> = {
    euro: "EUR",
    eur: "EUR",
    usd: "USD",
    dollar: "USD",
    gbp: "GBP",
    pounds: "GBP",
    jpy: "JPY",
    yen: "JPY",
    chf: "CHF",
    sek: "SEK",
    nok: "NOK",
    dkk: "DKK",
    pln: "PLN",
    czk: "CZK",
    huf: "HUF",
    ron: "RON",
    try: "TRY",
    aud: "AUD",
    cad: "CAD",
    cny: "CNY",
    hkd: "HKD",
    sgd: "SGD",
    krw: "KRW",
    inr: "INR",
    mxn: "MXN",
    brl: "BRL",
    zar: "ZAR",
  };
  const key = s.replace(/[^a-z]/gi, "").toLowerCase();
  return map[key] ?? up;
}

/** Country (ISO2 or ISO3 or common names) → likely currency. Very small pragmatic map. */
export function currencyFromCountry(country?: string | null): IsoCurrency | null {
  if (!country) return null;
  const c = country.trim().toUpperCase();
  const map: Record<string, IsoCurrency> = {
    // EU/EEA common
    NL: "EUR", DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", BE: "EUR",
    AT: "EUR", IE: "EUR", FI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", SK: "EUR",
    SI: "EUR", LU: "EUR", MT: "EUR", GR: "EUR", CY: "EUR",
    SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", CH: "CHF",
    GB: "GBP", UK: "GBP",

    US: "USD", USA: "USD",
    CA: "CAD",
    AU: "AUD",
    JP: "JPY",
    CN: "CNY",
    HK: "HKD",
    SG: "SGD",
    KR: "KRW",
    IN: "INR",
    MX: "MXN",
    BR: "BRL",
    ZA: "ZAR",
    TR: "TRY",
  };

  // Try direct
  if (map[c]) return map[c];

  // Handle some 3-letter country codes
  const three: Record<string, IsoCurrency> = {
    NLD: "EUR", DEU: "EUR", FRA: "EUR", ITA: "EUR", ESP: "EUR", PRT: "EUR", BEL: "EUR",
    AUT: "EUR", IRL: "EUR", FIN: "EUR", SWE: "SEK", NOR: "NOK", DNK: "DKK",
    POL: "PLN", CZE: "CZK", HUN: "HUF", ROU: "RON", CHE: "CHF", GBR: "GBP",
    USA: "USD", CAN: "CAD", AUS: "AUD", JPN: "JPY", CHN: "CNY", HKG: "HKD",
    SGP: "SGD", KOR: "KRW", IND: "INR", MEX: "MXN", BRA: "BRL", ZAF: "ZAR", TUR: "TRY",
  };
  if (three[c]) return three[c];

  // Names (very light)
  const nameMap: Record<string, IsoCurrency> = {
    NETHERLANDS: "EUR",
    GERMANY: "EUR",
    FRANCE: "EUR",
    ITALY: "EUR",
    SPAIN: "EUR",
    PORTUGAL: "EUR",
    BELGIUM: "EUR",
    AUSTRIA: "EUR",
    IRELAND: "EUR",
    SWEDEN: "SEK",
    NORWAY: "NOK",
    DENMARK: "DKK",
    POLAND: "PLN",
    CZECHIA: "CZK",
    "CZECH REPUBLIC": "CZK",
    HUNGARY: "HUF",
    ROMANIA: "RON",
    SWITZERLAND: "CHF",
    "UNITED KINGDOM": "GBP",
    "GREAT BRITAIN": "GBP",
    "UNITED STATES": "USD",
    CANADA: "CAD",
    AUSTRALIA: "AUD",
    JAPAN: "JPY",
    CHINA: "CNY",
    "HONG KONG": "HKD",
    SINGAPORE: "SGD",
    "SOUTH KOREA": "KRW",
    INDIA: "INR",
    MEXICO: "MXN",
    BRAZIL: "BRL",
    "SOUTH AFRICA": "ZAR",
    TURKEY: "TRY",
  };

  const norm = country.replace(/\s+/g, " ").trim().toUpperCase();
  return nameMap[norm] ?? null;
}

/**
 * Very small static FX table with EUR as pivot.
 * Rates are indicative; adjust if you need different baselines.
 * convert() does: amount * (to_EUR / from_EUR) inverted properly.
 */
const EUR_RATES: Record<IsoCurrency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.84,
  JPY: 161,
  CHF: 0.97,
  SEK: 11.5,
  NOK: 11.6,
  DKK: 7.46,
  PLN: 4.33,
  CZK: 25.4,
  HUF: 391,
  RON: 4.97,
  TRY: 35.0,
  AUD: 1.62,
  CAD: 1.47,
  CNY: 7.9,
  HKD: 8.45,
  SGD: 1.47,
  KRW: 1480,
  INR: 90,
  MXN: 19.5,
  BRL: 6.0,
  ZAR: 19.2,
};

/** Convert amount between currencies with EUR as pivot. Falls back to passthrough if unknown. */
export function convert(
  amount: number,
  from?: string | null,
  to?: string | null
): number {
  if (!Number.isFinite(amount)) return 0;
  const f = normalizeCode(from) || "EUR";
  const t = normalizeCode(to) || "EUR";
  if (f === t) return Math.round(amount);

  const fRate = EUR_RATES[f];
  const tRate = EUR_RATES[t];
  if (!fRate || !tRate) return Math.round(amount); // unknown code → no change

  // amount_in_to = amount * (t_per_EUR) / (f_per_EUR)  BUT our table is "units per 1 EUR"
  // To convert X f → EUR: X / fRate. Then → t: (X / fRate) * tRate
  const eur = amount / fRate;
  const inTarget = eur * tRate;
  return Math.round(inTarget);
}

