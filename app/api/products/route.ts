// FILE: app/api/products/search/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";
import { amazonProvider } from "@/lib/affiliates/providers/amazon";
import { rakutenProvider } from "@/lib/affiliates/providers/rakuten";
import { awinProvider } from "@/lib/affiliates/providers/awin";
import { wrapProducts } from "@/lib/affiliates/linkWrapper";
import type { Product, ProviderResult } from "@/lib/affiliates/types";

type Req = {
  query?: string;
  limit?: number; // overall limit after merge
  perProvider?: number; // default 6
  country?: string; // for linkWrapper decisions
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function rank(products: Product[], q: string): Product[] {
  const query = q.toLowerCase();
  return products
    .map((p) => {
      const title = p.title.toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      const score =
        (title.includes(query) ? 3 : 0) +
        (brand && query.includes(brand) ? 1 : 0) +
        (typeof p.price === "number" ? 0.5 : 0);
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.p);
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

  // Fetch all providers in parallel (mock-safe)
  const [amz, rak, awn] = await Promise.all([
    amazonProvider.search(q, { limit: per }),
    rakutenProvider.search(q, { limit: per }),
    awinProvider.search(q, { limit: per }),
  ]);

  const merged = [
    ...wrapProducts("amazon", amz.items, country),
    ...wrapProducts("rakuten", rak.items, country),
    ...wrapProducts("awin", awn.items, country),
  ];

  const ranked = rank(merged, q).slice(0, overall);

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
