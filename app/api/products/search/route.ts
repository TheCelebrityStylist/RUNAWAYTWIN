// FILE: app/api/products/search/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { Product } from "@/lib/affiliates/types";
import { scrapeProducts } from "@/lib/scrape";

type Req = {
  query?: string;
  limit?: number;
  perProvider?: number; // accepted for compatibility with the UI
  country?: string;
  providers?: string[];
  prefs?: unknown;
  priceMin?: number;
  priceMax?: number;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function applyPriceFilter(items: Product[], min?: number, max?: number): Product[] {
  const hasMin = typeof min === "number" && Number.isFinite(min);
  const hasMax = typeof max === "number" && Number.isFinite(max);
  if (!hasMin && !hasMax) return items;

  return items.filter((p) => {
    if (typeof p.price !== "number") return true; // keep items without price
    if (hasMin && p.price < (min as number)) return false;
    if (hasMax && p.price > (max as number)) return false;
    return true;
  });
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return bad("Expected application/json", 415);

  const body = (await req.json().catch(() => ({}))) as Req;
  const q = (body.query || "").trim();
  if (!q) return bad("Missing 'query'");

  const overall = Math.min(Math.max(body.limit ?? 24, 1), 60);
  const country = body.country ?? "NL";

  const scraped = await scrapeProducts({ query: q, country, limit: overall });
  const filtered = applyPriceFilter(scraped, body.priceMin, body.priceMax);

  const items = filtered
    .filter((p) => typeof p.url === "string" && p.url.length > 8)
    .slice(0, overall);

  return NextResponse.json(
    {
      ok: true,
      count: items.length,
      query: q,
      items,
      meta: {
        source: "scrape",
        country,
        filteredByPrice:
          typeof body.priceMin === "number" || typeof body.priceMax === "number"
            ? { min: body.priceMin ?? null, max: body.priceMax ?? null }
            : null,
      },
    },
    { status: 200 }
  );
}
