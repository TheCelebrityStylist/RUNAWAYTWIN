// FILE: lib/affiliates/linkWrapper.ts
// Safe affiliate link wrapper (AWIN-first). No secrets leak to client.
import { Product } from "@/lib/affiliates/types";

/**
 * Env:
 *  - AWIN_PUBLISHER_ID: your publisher/affiliate id (integer as string)
 *  - AWIN_ADVERTISER_MAP_JSON: JSON object mapping host -> AWIN MID
 *      e.g. {"www.cos.com": "18719", "www.arket.com": "17114", "www.zara.com":"14148"}
 *  - AFFILIATE_CLICKREF_SOURCE (optional): short source code to stamp in clickref
 */
const AWIN_PUBLISHER_ID = process.env.AWIN_PUBLISHER_ID || "";
const CLICKREF_SOURCE = process.env.AFFILIATE_CLICKREF_SOURCE || "rwt";

/** Parse host→mid mapping from JSON; tolerate bad input safely. */
function hostToMid(host: string): string | null {
  try {
    const raw = process.env.AWIN_ADVERTISER_MAP_JSON || "{}";
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const v = obj[host];
    if (typeof v === "string" && v.trim()) return v;
    return null;
  } catch {
    return null;
  }
}

/** Extract normalized hostname from URL. */
function hostnameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Wrap a raw product URL with AWIN tracking if possible.
 * If no mapping or publisher id, returns original URL.
 * Format: https://www.awin1.com/cread.php?awinmid=<MID>&awinaffid=<PUB>&clickref=<ref>&ued=<ENC_URL>
 */
export function wrapAffiliateUrl(p: Product, clickrefExtra?: string): string {
  const raw = p.url;
  if (!raw) return "";
  const host = hostnameFromUrl(raw);
  if (!host || !AWIN_PUBLISHER_ID) return raw;

  const mid = hostToMid(host);
  if (!mid) return raw;

  const refParts = [CLICKREF_SOURCE];
  if (clickrefExtra) refParts.push(clickrefExtra);
  if (p.id) refParts.push(`id:${p.id}`);
  if (p.brand) refParts.push(`b:${p.brand}`);
  const clickref = encodeURIComponent(refParts.filter(Boolean).join("|"));
  const ued = encodeURIComponent(raw);

  return `https://www.awin1.com/cread.php?awinmid=${encodeURIComponent(
    mid
  )}&awinaffid=${encodeURIComponent(AWIN_PUBLISHER_ID)}&clickref=${clickref}&ued=${ued}`;
}

/** Apply affiliate wrapping to a list immutably. */
export function wrapAffiliateUrls(items: Product[], clickrefExtra?: string): Product[] {
  return items.map((it) => ({
    ...it,
    url: wrapAffiliateUrl(it, clickrefExtra),
  }));
}
