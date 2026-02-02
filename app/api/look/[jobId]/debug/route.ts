// FILE: app/api/look/[jobId]/debug/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { getJob, updateJob } from "@/lib/style/store";
import { runLookJob } from "@/lib/style/worker";

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

  if (job.status === "running" && Date.now() - job.updatedAt > 2000) {
    updateJob(jobId, { status: "partial" });
    void runLookJob(job.plan);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      status: job.status,
      progress: job.progress,
      errors: job.errors,
      logs: job.logs,
      updated_at: job.updatedAt,
      created_at: job.createdAt,
      result: job.result,
    }),
    { headers }
  );
}
