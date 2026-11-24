import { NextResponse } from "next/server";

/**
 * Outbound shop click. Wraps the product URL in a Skimlinks redirect so the click can earn a commission.
 * Skimlinks only sets its cookie when the visitor actually clicks through (same as Awin's own redirect).
 * eBay Partner Network and existing affiliate links pass through untouched.
 */
const SKIM = process.env.SKIMLINKS_ID || "313588X1802335";
const TRACKED = /[?&]campid=|rover\.ebay\.|[?&]mkcid=|awin1\.com|skimresources\.com/i;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u");
  const rid = (url.searchParams.get("rid") || "site").replace(/[^A-Za-z0-9_]/g, "_").slice(0, 50);

  if (!u || !/^https?:\/\//i.test(u)) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }

  const target = SKIM && !TRACKED.test(u)
    ? `https://go.skimresources.com/?id=${SKIM}&xs=1&url=${encodeURIComponent(u)}&xcust=${rid}`
    : u;

  const res = NextResponse.redirect(target, { status: 302 });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
