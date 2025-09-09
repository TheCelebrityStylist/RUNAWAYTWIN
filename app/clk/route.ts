import { NextResponse } from "next/server";

/** Redirect wrapper. If AFFILIATE_BASE is set, we monetize; else we just pass-through. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u");
  const rid = url.searchParams.get("rid") || "";
  const pid = url.searchParams.get("pid") || "";

  if (!u || !/^https?:\/\//i.test(u)) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }

  const aff = process.env.AFFILIATE_BASE; // e.g. "https://go.skimresources.com/?id=XXXX&xs=1&url="
  const target = aff ? `${aff}${encodeURIComponent(u)}` : u;

  // Optional: send click to a webhook/DB
  const hook = process.env.CLICK_WEBHOOK;
  if (hook) {
    fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ u, rid, pid, ts: Date.now() }),
    }).catch(() => {});
  }

  return NextResponse.redirect(target, { status: 302 });
}
