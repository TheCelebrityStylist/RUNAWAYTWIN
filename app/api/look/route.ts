// FILE: app/api/look/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import type { StylePlan } from "@/lib/style/types";
import { cacheKey, getCached, makeJob, updateJob } from "@/lib/style/store";
import { runLookJob } from "@/lib/style/worker";

export async function POST(req: NextRequest) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  if (!(req.headers.get("content-type") || "").includes("application/json")) {
    return new Response(JSON.stringify({ ok: false, error: "Expected application/json." }), {
      status: 415,
      headers,
    });
  }

  const body = (await req.json().catch(() => ({}))) as { plan?: StylePlan };
  const plan = body.plan;
  if (!plan) {
    return new Response(JSON.stringify({ ok: false, error: "Missing StylePlan." }), {
      status: 400,
      headers,
    });
  }

  const cached = getCached(cacheKey(plan));
  if (cached) {
    return new Response(JSON.stringify({ ok: true, job_id: cached.look_id, cached: true }), {
      headers,
    });
  }

  const job = makeJob(plan);
  updateJob(job.id, { status: "running" });
  void runLookJob(plan);

  return new Response(JSON.stringify({ ok: true, job_id: job.id }), { headers });
}
