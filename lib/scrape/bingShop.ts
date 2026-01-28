// FILE: lib/scrape/bing.ts
import { cleanText, fetchText } from "@/lib/scrape/http";

export type BingHit = {
  title: string;
  url: string;
};

export type BingSearchOpts = {
  query: string;
  maxHits: number;
  allowHosts?: string[]; // optional allowlist
};

/**
 * Uses Bing Web results through Jina proxy (keyless) and parses markdown-style links:
 *   [Title](https://example.com/...)
 */
export async function bingWebSearch(opts: BingSearchOpts): Promise<BingHit[]> {
  const q = cleanText(opts.query);
  if (!q) return [];

  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", q);

  const txt = await fetchText(url.toString(), {
    viaJina: true,
    timeoutMs: 12_000,
    noStore: true,
  });

  if (!txt) return [];

  const allowHosts = (opts.allowHosts ?? []).map((h) => h.replace(/^www\./, "").toLowerCase());
  const restrict = allowHosts.length > 0;

  const hits: BingHit[] = [];
  const seen = new Set<string>();

  const re = /\[([^\]]{3,200})\]\((https?:\/\/[^)\s]+)\)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(txt)) !== null) {
    const title = cleanText(m[1] ?? "");
    const rawUrl = m[2] ?? "";
    if (!title || !rawUrl) continue;

    let u: URL;
    try {
      u = new URL(rawUrl);
    } catch {
      continue;
    }

    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith("bing.com") || host.endsWith("microsoft.com")) continue;

    if (restrict && !allowHosts.some((h) => host === h || host.endsWith(`.${h}`))) continue;

    const key = `${host}${u.pathname}`;
    if (seen.has(key)) continue;
    seen.add(key);

    hits.push({ title, url: rawUrl });
    if (hits.length >= opts.maxHits) break;
  }

  return hits;
}

