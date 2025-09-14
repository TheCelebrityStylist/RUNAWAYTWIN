import { cookies } from "next/headers";

export type Prefs = {
  region?: "EU" | "US";
  top?: string;
  bottom?: string;
  shoe?: string;
  bodyType?: string;
  budget?: "high-street" | "mid" | "luxury";
};

const KEY = "rt_prefs_v1";

export function readPrefs(): Prefs {
  try {
    const v = cookies().get(KEY)?.value || "";
    return v ? JSON.parse(v) : {};
  } catch {
    return {};
  }
}

export function writePrefs(p: Prefs) {
  cookies().set(KEY, JSON.stringify(p), { httpOnly: false, path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export function prefsToSystemNote(p: Prefs) {
  const bits = [];
  if (p.region) bits.push(`region=${p.region}`);
  if (p.top) bits.push(`top=${p.top}`);
  if (p.bottom) bits.push(`bottom=${p.bottom}`);
  if (p.shoe) bits.push(`shoe=${p.shoe}`);
  if (p.bodyType) bits.push(`bodyType=${p.bodyType}`);
  if (p.budget) bits.push(`budget=${p.budget}`);
  return bits.length ? `User defaults: ${bits.join(", ")}.` : "";
}
