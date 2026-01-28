// FILE: app/api/products/search/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { Product } from "@/lib/affiliates/types";
import type { Prefs } from "@/lib/types";
import { scrapeProducts } from "@/lib/scrape";

type Req = {
  query?: string;
  limit?: number;
  perProvider?: number; // ignored (kept for backward compat)
  country?: string; // ignored for now
  prefs?: Prefs;
  providers?: Array<"amazon" | "rakuten" | "awin">; // ignored (kept for backward compat)
  priceMin?: number;
  priceMax?: number;
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

  const overall = Math.min(Math.max(body.limit ?? 24, 1), 60);

  let items: Product[] = await scrapeProducts({ query: q, limit: overall });

  const hasMin = typeof body.priceMin === "number" && Number.isFinite(body.priceMin);
  const hasMax = typeof body.priceMax === "number" && Number.isFinite(body.priceMax);

  if (hasMin || hasMax) {
    items = items.filter((p) => {
      if (typeof p.price !== "number") return false;
      if (hasMin && p.price < (body.priceMin as number)) return false;
      if (hasMax && p.price > (body.priceMax as number)) return false;
      return true;
    });
  }

  return NextResponse.json(
    {
      ok: true,
      count: items.length,
      query: q,
      items,
      meta: {
        mode: "scrape",
        filteredByPrice: hasMin || hasMax ? { min: body.priceMin, max: body.priceMax } : null,
      },
    },
    { status: 200 }
  );
}
