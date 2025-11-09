// FILE: app/api/awin/dump-ids/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const raw = process.env.AWIN_ADVERTISER_MAP_JSON;
    if (!raw) {
      return NextResponse.json(
        { error: "Missing AWIN_ADVERTISER_MAP_JSON in environment." },
        { status: 400 }
      );
    }

    const data = JSON.parse(raw) as Record<string, unknown>;

    const ids = Object.keys(data)
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!ids.length) {
      return NextResponse.json(
        { error: "No numeric advertiser IDs found in AWIN_ADVERTISER_MAP_JSON." },
        { status: 400 }
      );
    }

    const envValue = ids.join(",");

    return NextResponse.json(
      {
        ids,
        envValue,      // <- paste this into AWIN_ADVERTISER_IDS
        count: ids.length,
      },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Parse failure: ${String(err)}` },
      { status: 500 }
    );
  }
}
