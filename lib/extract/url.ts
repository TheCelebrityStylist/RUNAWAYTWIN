export function normalizeProductUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = "";

    const original = url.searchParams;
    const removable = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "mcid",
      "mc_eid",
      "fbclid",
      "gclid",
      "igshid",
      "ranMID",
      "ranSiteID",
      "ranEAID",
      "tag",
      "affid",
      "affidv",
      "affsource",
      "aff_sub",
      "aff_sub2",
      "aff_sub3",
      "aff_sub4",
      "aff_sub5",
      "cjevent",
      "awc",
    ]);

    const kept = new URLSearchParams();
    original.forEach((value, key) => {
      if (!removable.has(key.toLowerCase())) {
        kept.append(key, value);
      }
    });

    const query = kept.toString();
    url.search = query;
    return query ? `${url.origin}${url.pathname}?${query}` : `${url.origin}${url.pathname}`;
  } catch {
    return input;
  }
}

export function ensureAbsoluteUrl(input: string): string {
  if (!input) return input;
  try {
    const url = new URL(input);
    if (!url.protocol) {
      return `https://${input.replace(/^\/*/, "")}`;
    }
    return url.toString();
  } catch {
    return input.startsWith("http") ? input : `https://${input.replace(/^\/*/, "")}`;
  }
}
