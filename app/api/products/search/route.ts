// FILE: app/api/products/search/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";
import type { Prefs } from "@/lib/types";
import type { Product, ProviderKey } from "@/lib/affiliates/types";
import { wrapProducts } from "@/lib/affiliates/linkWrapper";
import { rankProducts } from "@/lib/affiliates/ranker";

import { amazonProvider } from "@/lib/affiliates/providers/amazon";
import { rakutenProvider } from "@/lib/affiliates/providers/rakuten";
import { awinProvider } from "@/lib/affiliates/providers/awin";
import { webProvider } from "@/lib/affiliates/providers/web";

type Req = {
  query?: string;
  limit?: number; // overall cap after merge
  perProvider?: number; // fetch cap per provider (default 6)
  country?: string; // for link wrapping
  prefs?: Prefs; // optional user preferences to guide ranking
  providers?: ProviderKey[]; // subset to query (default: web + others)
  priceMin?: number; // optional inclusive
  priceMax?: number; // optional inclusive
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isProviderKey(x: unknown): x is ProviderKey {
  return x === "web" || x === "amazon" || x === "rakuten" || x === "awin";
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

  const tasks: Array<Promise<Product[]>> = [];

  if (selected.includes("web")) {
    tasks.push(
      webProvider.search(q, { limit: per }).then((r) => wrapProducts("web", r.items, country))
    );
  }
  if (selected.includes("amazon")) {
    tasks.push(
      amazonProvider.search(q, { limit: per }).then((r) => wrapProducts("amazon", r.items, country))
    );
  }
  if (selected.includes("rakuten")) {
    tasks.push(
      rakutenProvider.search(q, { limit: per }).then((r) =>
        wrapProducts("rakuten", r.items, country)
      )
    );
  }
  if (selected.includes("awin")) {
    tasks.push(
      awinProvider.search(q, { limit: per }).then((r) => wrapProducts("awin", r.items, country))
    );
  }

  const results = await Promise.all(tasks);
  let merged: Product[] = results.flat();

  // Optional price filter
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
      },
    },
    { status: 200 }
  );
}
