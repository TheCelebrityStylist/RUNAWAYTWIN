// FILE: lib/scrape/http.ts
export type FetchTextOpts = {
  viaJina?: boolean;
  timeoutMs?: number;
  noStore?: boolean;
  revalidateSeconds?: number;
};

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function withTimeout(signal: AbortSignal, timeoutMs: number): AbortSignal {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  ctrl.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(t);
    },
    { once: true }
  );
  return ctrl.signal;
}

export async function fetchText(url: string, opts: FetchTextOpts = {}): Promise<string> {
  const viaJina = opts.viaJina ?? false;
  const timeoutMs = opts.timeoutMs ?? 12_000;

  const finalUrl = viaJina ? `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}` : url;

  const baseSignal = new AbortController().signal;
  const signal = withTimeout(baseSignal, timeoutMs);

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (compatible; RunwayTwinBot/1.0; +https://example.com/bot)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  const res = await fetch(finalUrl, {
    method: "GET",
    headers,
    signal,
    cache: opts.noStore ? "no-store" : "force-cache",
    next:
      typeof opts.revalidateSeconds === "number"
        ? { revalidate: opts.revalidateSeconds }
        : undefined,
  }).catch(() => null);

  if (!res || !res.ok) return "";
  return await res.text();
}
