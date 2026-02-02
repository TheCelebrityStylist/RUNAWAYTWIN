// FILE: app/api/products/search/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";
import { amazonProvider } from "@/lib/affiliates/providers/amazon";
import { rakutenProvider } from "@/lib/affiliates/providers/rakuten";
import { awinProvider } from "@/lib/affiliates/providers/awin";
import { webProvider } from "@/lib/affiliates/providers/web";
import { wrapProducts } from "@/lib/affiliates/linkWrapper";
import { rankProducts } from "@/lib/affiliates/ranker";
import { toStrictProduct, type StrictProduct } from "@/lib/affiliates/validate";
import { webProductSearch } from "@/lib/scrape/webProductSearch";
import type { Product, ProviderKey } from "@/lib/affiliates/types";
import type { Prefs } from "@/lib/types";

type Req = {
  query?: string;
  limit?: number; // overall cap after merge
  perProvider?: number; // fetch cap per provider (default 6)
  country?: string; // for link wrapping / currency
  prefs?: Prefs; // optional user preferences to guide ranking
  providers?: ProviderKey[]; // subset to query (default: all)
  priceMin?: number; // optional inclusive
  priceMax?: number; // optional inclusive
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isProviderKey(x: unknown): x is ProviderKey {
  return x === "web" || x === "amazon" || x === "rakuten" || x === "awin";
}

function regionAllowlist(country?: string): string[] {
  const code = (country || "").trim().toUpperCase();
  if (!code) return [];
  if (code === "US") {
    return ["amazon.com", "shopbop.com", "nordstrom.com", "ssense.com", "net-a-porter.com"];
  }
  if (code === "GB" || code === "UK") {
    return ["net-a-porter.com", "mrporter.com", "selfridges.com", "matchesfashion.com"];
  }
  return [];
}

function hostAllowed(url: string, list: string[]): boolean {
  if (!list.length) return true;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return list.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return bad("Expected application/json", 415);

  const body = (await req.json().catch(() => ({}))) as Req;
  const q = (body.query || "").trim();
  if (!q) return bad("Missing 'query'");

  const per = Math.min(Math.max(body.perProvider ?? 6, 1), 12);
  const overall = Math.min(Math.max(body.limit ?? 24, 1), 60);
  const country = body.country;
  const prefs = body.prefs;

  const selected: ProviderKey[] =
    Array.isArray(body.providers) && body.providers.length
      ? body.providers.filter(isProviderKey)
      : (["web", "amazon", "rakuten", "awin"] as const);

  // Fetch chosen providers in parallel (mock-safe)
  const tasks: Array<Promise<{ key: ProviderKey; items: Product[] }>> = [];

  if (selected.includes("web")) {
    tasks.push(
      webProvider.search(q, { limit: per, country }).then((r) => ({
        key: "web" as const,
        items: wrapProducts("web", r.items, country),
      }))
    );
  }

  if (selected.includes("amazon")) {
    tasks.push(
      amazonProvider.search(q, { limit: per }).then((r) => ({
        key: "amazon" as const,
        items: wrapProducts("amazon", r.items, country),
      }))
    );
  }

  if (selected.includes("rakuten")) {
    tasks.push(
      rakutenProvider.search(q, { limit: per }).then((r) => ({
        key: "rakuten" as const,
        items: wrapProducts("rakuten", r.items, country),
      }))
    );
  }

  if (selected.includes("awin")) {
    tasks.push(
      awinProvider.search(q, { limit: per }).then((r) => ({
        key: "awin" as const,
        items: wrapProducts("awin", r.items, country),
      }))
    );
  }

  const results = await Promise.all(tasks);
  let merged: Product[] = results.flatMap((r) => r.items);

  // Optional price filter (only keeps items with numeric price)
  const hasMin = typeof body.priceMin === "number" && Number.isFinite(body.priceMin);
  const hasMax = typeof body.priceMax === "number" && Number.isFinite(body.priceMax);
  if (hasMin || hasMax) {
    merged = merged.filter((p) => {
      if (typeof p.price !== "number") return false;
      if (hasMin && p.price < (body.priceMin as number)) return false;
      if (hasMax && p.price > (body.priceMax as number)) return false;
      return true;
    });
  }

  // Rank with query + prefs
  const ranked = rankProducts({ products: merged, query: q, prefs }).slice(0, overall);
  let strictItems: StrictProduct[] = ranked
    .map((p) => toStrictProduct(p))
    .filter((p): p is StrictProduct => Boolean(p));

  if (strictItems.length < 4 && selected.includes("web")) {
    const preferEU = (country || "").toUpperCase() !== "US";
    const scraped = await webProductSearch({ query: q, limit: 16, preferEU });
    const allowedDomains = regionAllowlist(country);
    const filtered = allowedDomains.length
      ? scraped.filter((p) => hostAllowed(p.url, allowedDomains))
      : scraped;

    const normalized = filtered.map((p) => ({
      ...p,
      affiliate_url: p.affiliate_url ?? p.url,
      availability: p.availability ?? "unknown",
      category: p.category ?? p.fit?.category,
    }));

    const strictFromScrape = normalized
      .map((p) => toStrictProduct(p))
      .filter((p): p is StrictProduct => Boolean(p));
    strictItems = [...strictItems, ...strictFromScrape].slice(0, overall);
  }

  if (!strictItems.length) {
    return NextResponse.json(
      {
        ok: false,
        count: 0,
        query: q,
        items: [],
        error: "No verified products available for this query.",
        meta: {
          providers: selected,
          filteredByPrice: hasMin || hasMax ? { min: body.priceMin, max: body.priceMax } : null,
        },
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      count: strictItems.length,
      query: q,
      items: strictItems,
      meta: {
        providers: selected,
        filteredByPrice: hasMin || hasMax ? { min: body.priceMin, max: body.priceMax } : null,
      },
    },
    { status: 200 }
  );
}
