// FILE: app/api/image/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

const ALLOW_HOST_SUFFIXES = [
  "zara.com",
  "massimodutti.com",
  "cos.com",
  "arket.com",
  "hm.com",
  "mango.com",
  "uniqlo.com",
  "zalando.nl",
  "aboutyou.nl",
  "cloudfront.net",
  "akamaihd.net",
  "scene7.com",
  "images.ctfassets.net",
  "unsplash.com",
  "images.unsplash.com",
];

function isAllowedHost(host: string): boolean {
  const h = host.replace(/^www\./, "").toLowerCase();
  return ALLOW_HOST_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`));
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url") || "";
  let target: URL;

  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
  }

  if (!isAllowedHost(target.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  const res = await fetch(target.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; RunwayTwinBot/1.0; +https://example.com/bot)",
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      Referer: target.origin,
    },
    cache: "force-cache",
    next: { revalidate: 60 * 60 * 24 }, // 24h
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }

  const ct = res.headers.get("content-type") || "application/octet-stream";
  const bytes = await res.arrayBuffer();

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
