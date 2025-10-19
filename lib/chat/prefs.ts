import type { Preferences } from "@/lib/preferences/types";

export type NormalizedChatPreferences = {
  gender?: string;
  sizeTop?: string;
  sizeBottom?: string;
  sizeDress?: string;
  sizeShoe?: string;
  bodyType?: string;
  budgetLabel?: string;
  budgetValue?: number;
  country?: string;
  currency?: string;
  styleKeywordsText?: string;
  styleKeywordsList: string[];
  heightCm?: number;
  weightKg?: number;
};

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
    if (!cleaned) return undefined;
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseMeasurement(value: unknown): number | undefined {
  const num = parseNumber(value);
  if (typeof num === "number") return num;
  if (typeof value === "string") {
    const match = value.match(/([0-9]{2,3})/);
    if (match) {
      const parsed = Number.parseInt(match[1]!, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
}

function normalizeKeywords(value: unknown): { text?: string; list: string[] } {
  if (Array.isArray(value)) {
    const list = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return { text: list.join(" · "), list };
  }
  if (typeof value === "string") {
    const list = value
      .split(/[|,•·]/)
      .map((part) => part.trim())
      .filter(Boolean);
    const text = list.join(" · ") || value.trim();
    return { text, list: list.length ? list : value.trim() ? [value.trim()] : [] };
  }
  return { list: [] };
}

function parseBudget(value: unknown): { label?: string; amount?: number } {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { label: `${value}`, amount: value };
  }
  if (typeof value === "string") {
    const numbers = value
      .match(/\d+(?:[.,]\d+)?/g)
      ?.map((part) => Number.parseFloat(part.replace(/,/g, "")));
    if (numbers && numbers.length) {
      const amount = Math.max(...numbers.filter((n) => Number.isFinite(n)));
      if (Number.isFinite(amount)) {
        return { label: value, amount };
      }
    }
    const normalized = value.trim();
    if (normalized) {
      const presets: Record<string, number> = {
        "<$150": 150,
        "$150–$300": 300,
        "$300–$600": 600,
        "$600–$1000": 1000,
        "$1000+": 1600,
        "luxury / couture": 3500,
      };
      const lower = normalized.toLowerCase();
      const presetAmount = Object.entries(presets).find(([key]) => key.toLowerCase() === lower)?.[1];
      return { label: normalized, amount: presetAmount };
    }
  }
  return {};
}

export function normalizeChatPreferences(raw: any): NormalizedChatPreferences {
  if (!raw || typeof raw !== "object") {
    return { styleKeywordsList: [] };
  }

  const sizes = typeof raw.sizes === "object" && raw.sizes ? raw.sizes : {};
  const keywords = normalizeKeywords(raw.styleKeywords ?? raw.style_keywords ?? raw.style);
  const budget = parseBudget(raw.budget ?? raw.budgetMax ?? raw.budgetLabel);

  const heightCm = parseMeasurement(raw.height ?? raw.heightCm);
  const weightKg = parseMeasurement(raw.weight ?? raw.weightKg);

  const normalized: NormalizedChatPreferences = {
    gender: raw.gender ?? raw.profileGender ?? undefined,
    sizeTop: raw.sizeTop ?? sizes.top ?? undefined,
    sizeBottom: raw.sizeBottom ?? sizes.bottom ?? undefined,
    sizeDress: raw.sizeDress ?? sizes.dress ?? undefined,
    sizeShoe: raw.sizeShoe ?? sizes.shoe ?? undefined,
    bodyType: raw.bodyType ?? raw.body_type ?? undefined,
    budgetLabel: budget.label ?? (typeof raw.budget === "string" ? raw.budget : undefined),
    budgetValue: budget.amount,
    country: raw.country ?? raw.locale ?? undefined,
    currency: raw.currency ?? undefined,
    styleKeywordsText: keywords.text,
    styleKeywordsList: keywords.list,
    heightCm,
    weightKg,
  };

  return normalized;
}

export function countryToCurrency(country?: string): string {
  if (!country) return "EUR";
  const code = country.toUpperCase();
  if (code === "US") return "USD";
  if (code === "UK" || code === "GB") return "GBP";
  if (code === "CA") return "CAD";
  if (code === "AU") return "AUD";
  if (code === "JP") return "JPY";
  if (code === "CH") return "CHF";
  if (code === "AE" || code === "UAE") return "AED";
  if (code === "EU") return "EUR";
  return "EUR";
}

export function currencyForPreferences(prefs: NormalizedChatPreferences): string {
  if (prefs.currency) return prefs.currency.toUpperCase();
  return countryToCurrency(prefs.country);
}

export function preferencesToSystem(prefs: NormalizedChatPreferences): string {
  const currency = currencyForPreferences(prefs);
  const budgetLine = prefs.budgetLabel
    ? `${prefs.budgetLabel}`
    : typeof prefs.budgetValue === "number"
    ? `${Math.round(prefs.budgetValue)} ${currency}`
    : "-";
  return [
    "User Profile",
    `- Gender: ${prefs.gender ?? "-"}`,
    `- Sizes: top=${prefs.sizeTop ?? "-"}, bottom=${prefs.sizeBottom ?? "-"}, dress=${prefs.sizeDress ?? "-"}, shoe=${prefs.sizeShoe ?? "-"}`,
    `- Body Type: ${prefs.bodyType ?? "-"}`,
    `- Height/Weight: ${prefs.heightCm ?? "-"}cm / ${prefs.weightKg ?? "-"}kg`,
    `- Budget: ${budgetLine}`,
    `- Country: ${prefs.country ?? "-"}`,
    `- Currency: ${currency}`,
    `- Style Keywords: ${prefs.styleKeywordsText ?? (prefs.styleKeywordsList.length ? prefs.styleKeywordsList.join(" · ") : "-")}`,
    `Always tailor silhouette (rise, drape, neckline, hem, fabrication, proportion) to flatter body type. Respect budget.`,
  ].join("\n");
}

export function preferEU(country?: string): boolean {
  if (!country) return true;
  const upper = country.toUpperCase();
  return !["US", "CA", "AU"].includes(upper);
}

export function summarizePreferencesForBrief(
  prefs: NormalizedChatPreferences,
  ask: string | undefined
): string[] {
  const summary: string[] = [];
  if (prefs.bodyType) summary.push(prefs.bodyType);
  if (prefs.styleKeywordsText) summary.push(prefs.styleKeywordsText);
  if (ask) summary.push(ask);
  const budgetNote = prefs.budgetLabel
    ? `budget ${prefs.budgetLabel}`
    : typeof prefs.budgetValue === "number"
    ? `budget ~${Math.round(prefs.budgetValue)} ${currencyForPreferences(prefs)}`
    : null;
  if (budgetNote) summary.push(budgetNote);
  return summary;
}

export function preferencesToClientSeed(prefs: Preferences): NormalizedChatPreferences {
  return normalizeChatPreferences({
    gender: prefs.gender,
    sizeTop: prefs.sizes?.top,
    sizeBottom: prefs.sizes?.bottom,
    sizeDress: prefs.sizes?.dress,
    sizeShoe: prefs.sizes?.shoe,
    bodyType: prefs.bodyType,
    budget: prefs.budget,
    country: prefs.country,
    styleKeywords: prefs.styleKeywords,
    height: prefs.height,
    weight: prefs.weight,
  });
}
