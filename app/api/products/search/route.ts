// FILE: app/api/products/search/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";
import { amazonProvider } from "@/lib/affiliates/providers/amazon";
import { rakutenProvider } from "@/lib/affiliates/providers/rakuten";
import { awinProvider } from "@/lib/affiliates/providers/awin";
import { wrapProducts } from "@/lib/affiliates/linkWrapper";
import { rankProducts } from "@/lib/affiliates/ranker";
import type { Product } from "@/lib/affiliates/types";
import type { Prefs } from "@/lib/types";

type Req = {
  query?: string;
  limit?: number;        // overall cap after merge
  perProvider?: number;  // fetch cap per provider (default 6)
  country?: string;      // for link wrapping
  prefs?: Prefs;         // optional user preferences to guide ranking
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

  // Fetch all providers in parallel (mock-safe)
  const [amz, rak, awn] = await Promise.all([
    amazonProvider.search(q, { limit: per }),
    rakutenProvider.search(q, { limit: per }),
    awinProvider.search(q, { limit: per }),
  ]);

  const merged: Product[] = [
    ...wrapProducts("amazon", amz.items, country),
    ...wrapProducts("rakuten", rak.items, country),
    ...wrapProducts("awin", awn.items, country),
  ];

  // Rank with query + prefs
  const ranked = rankProducts({ products: merged, query: q, prefs }).slice(0, overall);

  return NextResponse.json(
    {
      ok: true,
      count: ranked.length,
      query: q,
      items: ranked,
    },
    { status: 200 }
  );
}
