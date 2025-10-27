// FILE: lib/types.ts
// Centralized, strict-safe shared types for RunwayTwin.

export type Gender = "female" | "male" | "other";
export type CountryCode = string;

export type Sizes = {
  top?: string;
  bottom?: string;
  dress?: string;
  shoe?: string;
};

export type Prefs = {
  gender?: Gender;
  bodyType?: string;
  budget?: string;
  country?: CountryCode;
  keywords?: string[];
  sizes?: Sizes; // optional; UI should handle undefined
};

// Chat message types
export interface Message {
  role: "user" | "assistant";
  content: string;
}
export type Msg = Message;

// Lightweight type guard helpers (no extra deps)
export function isMessage(x: unknown): x is Message {
  return (
    typeof x === "object" &&
    x !== null &&
    // @ts-expect-error index access at runtime
    (x.role === "user" || x.role === "assistant") &&
    // @ts-expect-error index access at runtime
    typeof x.content === "string"
  );
}

export function isPrefs(x: unknown): x is Prefs {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const okStr = (v: unknown) => v === undefined || typeof v === "string";
  const okArr = (v: unknown) =>
    v === undefined || (Array.isArray(v) && v.every((s) => typeof s === "string"));
  const okSizes = (v: unknown) =>
    v === undefined ||
    (typeof v === "object" &&
      v !== null &&
      ["top", "bottom", "dress", "shoe"].every((k) => {
        const val = (v as Record<string, unknown>)[k];
        return val === undefined || typeof val === "string";
      }));

  return (
    okStr(o.gender) &&
    okStr(o.bodyType) &&
    okStr(o.budget) &&
    okStr(o.country) &&
    okArr(o.keywords) &&
    okSizes(o.sizes)
  );
}
