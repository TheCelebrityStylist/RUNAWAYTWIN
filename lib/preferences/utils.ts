import { DEFAULT_PREFERENCES, type Preferences, type SizePrefs } from "./types";

const ALLOWED_GENDERS: Preferences["gender"][] = ["female", "male", "unisex", "unspecified"];
const MAX_KEYWORD_LENGTH = 40;
const MAX_KEYWORDS = 12;

function toSafeString(value: unknown, max = 120) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, max);
}

function sanitizeGender(value: unknown): Preferences["gender"] | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return ALLOWED_GENDERS.find((g) => g === normalized) || undefined;
}

function sanitizeBodyType(value: unknown) {
  const str = toSafeString(value, 48);
  return str ? str.toLowerCase() : str;
}

function sanitizeCountry(value: unknown) {
  if (typeof value !== "string") return undefined;
  const upper = value.trim().toUpperCase();
  if (!upper) return "";
  const sanitized = upper.replace(/[^A-Z]/g, "").slice(0, 3);
  return sanitized;
}

function sanitizeBudget(value: unknown) {
  const str = toSafeString(value, 60);
  return str ?? undefined;
}

function sanitizeSize(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.toUpperCase().slice(0, 10);
}

function sanitizeSizes(input: unknown): SizePrefs | undefined {
  if (!input || typeof input !== "object") return undefined;
  const next: SizePrefs = {};
  const entries: [keyof SizePrefs, unknown][] = [
    ["top", (input as any).top],
    ["bottom", (input as any).bottom],
    ["dress", (input as any).dress],
    ["shoe", (input as any).shoe],
  ];
  for (const [key, raw] of entries) {
    const sanitized = sanitizeSize(raw);
    if (sanitized !== undefined) {
      next[key] = sanitized;
    }
  }
  return next;
}

function sanitizeStyleKeywords(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const list: string[] = [];
  const seen = new Set<string>();
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  for (const item of source) {
    if (typeof item !== "string") continue;
    const cleaned = item.trim();
    if (!cleaned) continue;
    const clipped = cleaned.slice(0, MAX_KEYWORD_LENGTH);
    const lower = clipped.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    list.push(clipped);
    if (list.length >= MAX_KEYWORDS) break;
  }
  return list;
}

function sanitizeDimension(value: unknown) {
  const str = toSafeString(value, 24);
  return str ?? undefined;
}

function sanitizePartialPreferences(
  override: Partial<Preferences> | undefined
): Partial<Preferences> {
  if (!override) return {};
  const sanitized: Partial<Preferences> = {};

  if ("gender" in override) {
    const gender = sanitizeGender(override.gender);
    if (gender) sanitized.gender = gender;
  }

  if ("bodyType" in override) {
    const bodyType = sanitizeBodyType(override.bodyType);
    if (bodyType !== undefined) sanitized.bodyType = bodyType;
  }

  if ("budget" in override) {
    const budget = sanitizeBudget(override.budget);
    if (budget !== undefined) sanitized.budget = budget;
  }

  if ("country" in override) {
    const country = sanitizeCountry(override.country);
    if (country !== undefined) sanitized.country = country;
  }

  if ("styleKeywords" in override) {
    sanitized.styleKeywords = sanitizeStyleKeywords(override.styleKeywords) ?? [];
  }

  if ("sizes" in override) {
    sanitized.sizes = sanitizeSizes(override.sizes) ?? {};
  }

  if ("height" in override) {
    const height = sanitizeDimension(override.height);
    if (height !== undefined) sanitized.height = height;
  }

  if ("weight" in override) {
    const weight = sanitizeDimension(override.weight);
    if (weight !== undefined) sanitized.weight = weight;
  }

  return sanitized;
}

export function sanitizePreferences(input: Partial<Preferences> | undefined): Preferences {
  const base = {
    ...DEFAULT_PREFERENCES,
    sizes: { ...DEFAULT_PREFERENCES.sizes },
    styleKeywords: [...DEFAULT_PREFERENCES.styleKeywords],
  } satisfies Preferences;

  const sanitized = sanitizePartialPreferences(input);
  const sizes = sanitized.sizes ? { ...base.sizes, ...sanitized.sizes } : base.sizes;
  const styleKeywords = sanitized.styleKeywords !== undefined ? sanitized.styleKeywords : base.styleKeywords;

  return {
    ...base,
    ...sanitized,
    sizes,
    styleKeywords,
  };
}

export function mergePreferences(
  base: Preferences | undefined,
  override: Partial<Preferences> | undefined
): Preferences {
  const sanitizedBase = sanitizePreferences(base);
  const sanitizedOverride = sanitizePartialPreferences(override);

  const mergedSizes = sanitizedOverride.sizes
    ? { ...sanitizedBase.sizes, ...sanitizedOverride.sizes }
    : sanitizedBase.sizes;
  const mergedKeywords =
    sanitizedOverride.styleKeywords !== undefined
      ? sanitizedOverride.styleKeywords
      : sanitizedBase.styleKeywords;

  return {
    ...sanitizedBase,
    ...sanitizedOverride,
    sizes: mergedSizes,
    styleKeywords: mergedKeywords,
  };
}
