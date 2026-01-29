// FILE: app/api/products/route.ts
// Backwards-compatible endpoint.
// The app's canonical product search endpoint is now:
//   POST /api/products/search
//
// This route simply forwards the request body to /api/products/search.

export const runtime = "edge";

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  }

  const body = await req.text();
  const url = new URL("/api/products/search", req.url);

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const text = await resp.text();
  return new NextResponse(text, {
    status: resp.status,
    headers: {
      "Content-Type": resp.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message: "Use POST /api/products/search",
      example: { query: "black blazer", providers: ["web"], limit: 24, perProvider: 6 },
    },
    { status: 200 }
  );
}

