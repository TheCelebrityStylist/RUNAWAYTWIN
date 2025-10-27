// FILE: app/api/health/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";

export async function GET() {
  const ok: boolean = true;
  const version = process.env.VERCEL_GIT_COMMIT_SHA || "dev";
  const nodeEnv = process.env.NODE_ENV || "development";

  // Minimal surface info; never leak secrets
  const features = {
    openai: Boolean(process.env.OPENAI_API_KEY),
    affiliates: {
      amazon: Boolean(process.env.AMAZON_PA_ACCESS_KEY) && Boolean(process.env.AMAZON_PA_SECRET_KEY),
      rakuten: Boolean(process.env.RAKUTEN_API_KEY),
      awin: Boolean(process.env.AWIN_API_KEY),
    },
    supabaseMock: (process.env.MOCK_SUPABASE || "true").toLowerCase() !== "false",
  };

  return NextResponse.json(
    {
      ok,
      nodeEnv,
      version,
      features,
      time: new Date().toISOString(),
    },
    { status: 200 }
  );
}
