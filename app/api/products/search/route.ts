// FILE: app/api/products/search/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";
import { amazonProvider } from "@/lib/affiliates/providers/amazon";
import { rakutenProvider } from "@/lib/affiliates/providers/rakuten";
import { awinProvider } from "@/lib/affiliates/providers/awin";
import { webProvider } from "@/lib/affiliates/providers/web";
import { wrapProducts } from "@/lib/affiliates/linkWrapper";
import { rankProducts } from "@/lib/affiliates/ranker";
import type { Product, ProviderKey } from "@/lib/affiliates/types";
import type { Prefs } from "@/lib/types";

type Req = {
  query?: string;
  limit?: number; // overall cap after merge
  perProvider?: number; // fetch cap per provider (default 6)
  country?: string; // for link wrapping
  prefs?: Prefs; // optional user preferences to guide ranking
  providers?: ProviderKey[]; // subset to query (default: all)
  priceMin?: number; // optional inclusive
  priceMax?: number; // optional inclusive
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeProviders(x: unknown): ProviderKey[] | null {
  if (!Array.isArray(x) || x.length === 0) return null;
  const out: ProviderKey[] = [];
  for (const v of x) {
    if (v === "amazon" || v === "rakuten" || v === "awin" || v === "web") out.push(v);
  }
  return out.length ? out : null;
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

  const selected =
    sanitizeProviders(body.providers) ?? (["amazon", "rakuten", "awin", "web"] as ProviderKey[]);

  const tasks: Array<Promise<{ key: ProviderKey; items: Product[] }>> = [];

  if (selected.includes("amazon")) {
    tasks.push(
      amazonProvider.search(q, { limit: per }).then((r) => ({
        key: "amazon",
        items: wrapProducts("amazon", r.items, country),
      }))
    );
  }
  if (selected.includes("rakuten")) {
    tasks.push(
      rakutenProvider.search(q, { limit: per }).then((r) => ({
        key: "rakuten",
        items: wrapProducts("rakuten", r.items, country),
      }))
    );
  }
  if (selected.includes("awin")) {
    tasks.push(
      awinProvider.search(q, { limit: per }).then((r) => ({
        key: "awin",
        items: wrapProducts("awin", r.items, country),
      }))
    );
  }
  if (selected.includes("web")) {
    tasks.push(
      webProvider.search(q, { limit: Math.min(per * 2, 24) }).then((r) => ({
        key: "web",
        items: r.items, // no affiliate wrapping for web results
      }))
    );
  }

  const results = await Promise.all(tasks);
  let merged: Product[] = results.flatMap((r) => r.items);

  // If user didn't select web and affiliate providers yielded nothing, try web as fallback.
  const requestedWeb = selected.includes("web");
  if (!requestedWeb && merged.length === 0) {
    const fallback = await webProvider.search(q, { limit: Math.min(per * 2, 24) });
    merged = fallback.items;
  }

  // Optional price filter
  const hasMin = typeof body.priceMin === "number" && !Number.isNaN(body.priceMin);
  const hasMax = typeof body.priceMax === "number" && !Number.isNaN(body.priceMax);
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

  return NextResponse.json(
    {
      ok: true,
      count: ranked.length,
      query: q,
      items: ranked,
      meta: {
        providers: selected,
        filteredByPrice: hasMin || hasMax ? { min: body.priceMin, max: body.priceMax } : null,
        scraped: ranked.some((p) => typeof p.retailer === "string" && p.retailer.includes(".")),
      },
    },
    { status: 200 }
  );
}

