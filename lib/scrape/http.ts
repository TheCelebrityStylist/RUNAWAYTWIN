// FILE: lib/scrape/http.ts
// Minimal HTTP helpers for scraping from a server environment.

export type FetchHtmlOpts = {
  timeoutMs?: number;
  userAgent?: string;
  acceptLanguage?: string;
};

export type FetchTextOpts = FetchHtmlOpts & {
  viaJina?: boolean;
  noStore?: boolean;
};

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      }
    );
  });
}

function toJinaProxy(u: string): string {
  // Jina AI HTML proxy often bypasses basic bot-blocking.
  // Format: https://r.jina.ai/http(s)://example.com/...
  if (u.startsWith("https://") || u.startsWith("http://")) return `https://r.jina.ai/${u}`;
  return `https://r.jina.ai/http://${u}`;
}

export async function fetchHtml(url: string, opts?: FetchHtmlOpts): Promise<string | null> {
  const timeoutMs = Math.max(1000, opts?.timeoutMs ?? 8000);

  const headers: Record<string, string> = {
    "user-agent":
      opts?.userAgent ??
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": opts?.acceptLanguage ?? "en-US,en;q=0.9,nl;q=0.8",
  };

  const direct = await withTimeout(
    fetch(url, { headers, redirect: "follow" })
      .then(async (r) => (r.ok ? r.text() : null))
      .catch(() => null),
    timeoutMs,
    null
  );
  if (direct && direct.length > 200) return direct;

  const proxyUrl = toJinaProxy(url);
  const proxied = await withTimeout(
    fetch(proxyUrl, { headers, redirect: "follow" })
      .then(async (r) => (r.ok ? r.text() : null))
      .catch(() => null),
    timeoutMs,
    null
  );

  if (proxied && proxied.length > 200) return proxied;
  return null;
}

export function cleanText(input: string): string {
  return input.replace(/\s+/g, " ").replace(/\u0000/g, "").trim();
}

export function absolutizeUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export async function fetchText(url: string, opts?: FetchTextOpts): Promise<string | null> {
  const timeoutMs = Math.max(1000, opts?.timeoutMs ?? 8000);
  const headers: Record<string, string> = {
    "user-agent":
      opts?.userAgent ??
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": opts?.acceptLanguage ?? "en-US,en;q=0.9,nl;q=0.8",
  };

  const target = opts?.viaJina ? toJinaProxy(url) : url;
  const cache = opts?.noStore ? "no-store" : "default";

  return withTimeout(
    fetch(target, { headers, redirect: "follow", cache })
      .then(async (r) => (r.ok ? r.text() : null))
      .catch(() => null),
    timeoutMs,
    null
  );
}
