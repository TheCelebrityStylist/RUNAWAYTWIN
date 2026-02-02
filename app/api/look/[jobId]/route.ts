// FILE: app/api/look/[jobId]/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getJob } from "@/lib/style/store";

export async function GET(_req: NextRequest, ctx: { params: { jobId: string } }) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });

  const jobId = ctx.params.jobId;
  const job = getJob(jobId);
  if (!job) {
    return new Response(JSON.stringify({ ok: false, error: "Job not found." }), {
      status: 404,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      status: job.status,
      result: job.result,
    }),
    { headers }
  );
}
