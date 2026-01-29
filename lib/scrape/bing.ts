// FILE: lib/scrape/bing.ts
// Kept for backwards-compat with imports like "@/lib/scrape/bing".
// Implementation uses DuckDuckGo HTML endpoint (no JS) to get candidate product URLs.

export type ScrapeCandidate = { title: string; url: string };

function safeUrl(u: string): string | null {
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function decodeDuckRedirect(href: string): string {
  // DDG sometimes uses /l/?uddg=<encoded>
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
  } catch {
    // ignore
  }
  return href;
}

function uniqByHostPath(cands: ScrapeCandidate[], limit: number): ScrapeCandidate[] {
  const out: ScrapeCandidate[] = [];
  const seen = new Set<string>();
  for (const c of cands) {
    try {
      const u = new URL(c.url);
      const key = `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(c);
      if (out.length >= limit) break;
    } catch {
      // ignore
    }
  }
  return out;
}

export async function bingSearchCandidates(
  query: string,
  opts?: { limit?: number; signal?: AbortSignal }
): Promise<ScrapeCandidate[]> {
  const limit = Math.min(Math.max(opts?.limit ?? 10, 1), 25);
  const q = query.trim();
  if (!q) return [];

  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RunwayTwinBot/1.0)",
      Accept: "text/html",
    },
    signal: opts?.signal,
  }).catch(() => null);

  if (!resp || !resp.ok) return [];
  const html = await resp.text().catch(() => "");
  if (!html) return [];

  // <a class="result__a" href="...">Title</a>
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const results: ScrapeCandidate[] = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = decodeDuckRedirect(m[1] || "");
    const titleHtml = m[2] || "";
    const title = titleHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const normalized = safeUrl(href);
    if (!normalized || !title) continue;
    results.push({ title, url: normalized });
    if (results.length >= limit * 3) break;
  }

  return uniqByHostPath(results, limit);
}
