// FILE: lib/scrape/http.ts
export type FetchTextOpts = {
  timeoutMs?: number;
  headers?: Record<string, string>;
  viaJina?: boolean;
  noStore?: boolean;
};

function defaultHeaders(): Record<string, string> {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.8,nl-NL;q=0.7,nl;q=0.6",
    Connection: "keep-alive",
  };
}

function toJinaUrl(u: string): string {
  const url = new URL(u);
  const proto = url.protocol.replace(":", "");
  return `https://r.jina.ai/${proto}://${url.host}${url.pathname}${url.search}`;
}

export async function fetchText(url: string, opts?: FetchTextOpts): Promise<string | null> {
  const timeoutMs = opts?.timeoutMs ?? 10_000;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const target = opts?.viaJina ? toJinaUrl(url) : url;
    const res = await fetch(target, {
      method: "GET",
      signal: ctrl.signal,
      headers: { ...defaultHeaders(), ...(opts?.headers ?? {}) },
      cache: opts?.noStore === false ? "default" : "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function absolutizeUrl(base: string, href: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
